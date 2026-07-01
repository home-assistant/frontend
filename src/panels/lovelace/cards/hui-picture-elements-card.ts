import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { computeDomain } from "../../../common/entity/compute_domain";
import "../../../components/ha-card";
import type { ImageEntity } from "../../../data/image";
import { computeImageUrl } from "../../../data/image";
import type { HomeAssistant } from "../../../types";
import { findEntities } from "../common/find-entities";
import { handleAction } from "../common/handle-action";
import type { ActionConfigParams } from "../common/handle-action";
import { hasAction, hasAnyAction } from "../common/has-action";
import {
  ACTION_HANDLER_DOUBLE_CLICK_TIME,
  ACTION_HANDLER_HOLD_TIME,
} from "../common/directives/action-handler-directive";
import type { LovelaceElement, LovelaceElementConfig } from "../elements/types";
import type { LovelaceCard, LovelaceCardEditor } from "../types";
import { createStyledHuiElement } from "./picture-elements/create-styled-hui-element";
import { resolveGestureEnd } from "./picture-elements/gesture";
import type { HitTarget } from "./picture-elements/nearest-hit";
import { pickNearestTarget } from "./picture-elements/nearest-hit";
import {
  PREVIEW_CLICK_CALLBACK,
  type ActionsConfig,
  type PictureElementsCardConfig,
} from "./types";
import type { PersonEntity } from "../../../data/person";

// Point/text elements whose clicks are routed to the nearest target so that
// overlapping hit areas no longer steal each other's taps.
const NEAREST_ROUTED_TYPES = new Set([
  "state-icon",
  "state-badge",
  "icon",
  "state-label",
]);
// A routed tap can land next to its target, not on it, so the target's own
// action-handler (bound to that element) never sees it. The card therefore owns
// the gesture on the root in the capture phase, following the same choreography
// and timings as the shared action-handler directive (start on
// touchstart/mousedown, end on touchend/click, cancel on touchmove/touchcancel);
// the remaining events are suppressed so the target's own handler cannot also
// fire.
const NEAREST_ROUTED_EVENTS = [
  "touchstart",
  "touchend",
  "touchcancel",
  "touchmove",
  "mousedown",
  "mouseleave",
  "click",
  "dblclick",
  "contextmenu",
] as const;

// How far (px) a tap may sit from an icon seed and still be routed to it.
const NEAREST_HIT_REACH = 24;

// A non-routed element that handles its own taps (a button, a custom card, or an
// element with an explicit action) reserves its box so routing never steals a
// tap that lands directly on it.
const isReservedElement = (config: LovelaceElementConfig): boolean =>
  config.type === "service-button" ||
  config.type === "conditional" ||
  config.type.startsWith("custom:") ||
  hasAction((config as ActionConfigParams).tap_action) ||
  hasAction((config as ActionConfigParams).hold_action) ||
  hasAction((config as ActionConfigParams).double_tap_action);

interface ReservedBox {
  bx: number;
  by: number;
  bw: number;
  bh: number;
}

// Implemented by hui-state-label-element: the bounds of its visible text, so the
// card seeds a label on its text without reaching into the element's markup.
interface TextRectElement {
  getTextRect(): DOMRect | undefined;
}
const hasTextRect = (el: unknown): el is TextRectElement =>
  typeof (el as TextRectElement).getTextRect === "function";

// A routed target: `x1..x2 @ cy` is the seed used for the nearest test (icons are
// a point, labels the horizontal extent); `bx/by/bw/bh` is the element's current
// clickable box, used to decide whether a tap lands directly on it.
interface NearestSeed extends HitTarget {
  element: LovelaceElement;
  config: LovelaceElementConfig;
}

@customElement("hui-picture-elements-card")
class HuiPictureElementsCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-picture-elements-card-editor");
    return document.createElement("hui-picture-elements-card-editor");
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Boolean }) public preview = false;

  @state() private _elements?: LovelaceElement[];

  @query("#root") private _root?: HTMLElement;

  private _seeds?: NearestSeed[];

  private _reserved?: ReservedBox[];

  private _resizeObserver?: ResizeObserver;

  private _routingAttached = false;

  // Active gesture state, mirroring the shared action-handler directive.
  private _activeSeed?: NearestSeed;

  private _touchGesture = false;

  private _held = false;

  private _cancelled = false;

  private _holdTimer?: number;

  private _dblTimer?: number;

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ): PictureElementsCardConfig {
    const maxEntities = 1;
    const foundEntities = findEntities(
      hass,
      maxEntities,
      entities,
      entitiesFallback,
      ["sensor", "binary_sensor"]
    );

    return {
      type: "picture-elements",
      elements: [
        {
          type: "state-badge",
          entity: foundEntities[0] || "",
          style: {
            top: "32%",
            left: "40%",
          },
        },
      ],
      image: "https://demo.home-assistant.io/stub_config/floorplan.png",
    };
  }

  @state() private _config?: PictureElementsCardConfig;

  public getCardSize(): number {
    return 4;
  }

  public setConfig(config: PictureElementsCardConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    } else if (
      !(
        config.image ||
        config.image_entity ||
        config.camera_image ||
        config.state_image
      ) ||
      (config.state_image && !config.entity)
    ) {
      throw new Error("Image required");
    } else if (!Array.isArray(config.elements)) {
      throw new Error("Elements required");
    }

    this._config = config;

    this._elements = config.elements.map((element) => {
      const cardElement = this._createElement(element);
      return cardElement;
    });
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    // Seed geometry (esp. label text width) can change with state; rebuild lazily.
    if (changedProps.has("hass") || changedProps.has("_config")) {
      this._seeds = undefined;
    }

    if (!this._config || !this.hass) {
      return;
    }

    // #root only exists once we render (not while hass/config are missing), so
    // (re)attach here too — firstUpdated may have run before the first paint.
    this._attachRouting();

    if (this._elements && changedProps.has("hass")) {
      for (const element of this._elements) {
        element.hass = this.hass;
      }
    }

    if (this._elements && changedProps.has("preview")) {
      for (const element of this._elements) {
        element.preview = this.preview;
      }
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    const oldConfig = changedProps.get("_config") as
      | PictureElementsCardConfig
      | undefined;

    if (
      !oldHass ||
      !oldConfig ||
      oldHass.themes !== this.hass.themes ||
      oldConfig.theme !== this._config.theme
    ) {
      applyThemesOnElement(this, this.hass.themes, this._config.theme);
    }
  }

  public connectedCallback(): void {
    super.connectedCallback();
    // On the first connect #root does not exist yet (firstUpdated attaches then);
    // on a later reconnect it does, so re-attach here.
    this._attachRouting();
  }

  protected firstUpdated(): void {
    this._attachRouting();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._resizeObserver?.disconnect();
    this._resetGesture();
    clearTimeout(this._dblTimer);
    this._dblTimer = undefined;
    if (this._root) {
      NEAREST_ROUTED_EVENTS.forEach((type) =>
        this._root!.removeEventListener(type, this._onRoutedEvent, {
          capture: true,
        })
      );
    }
    this._routingAttached = false;
  }

  private _attachRouting(): void {
    const root = this._root;
    if (this._routingAttached || !root) {
      return;
    }
    NEAREST_ROUTED_EVENTS.forEach((type) =>
      root.addEventListener(type, this._onRoutedEvent, {
        capture: true,
        // touchstart/touchmove never call preventDefault here, so keep them
        // passive to not block scrolling (as the action-handler directive does).
        passive: type === "touchstart" || type === "touchmove",
      })
    );
    this._resizeObserver = new ResizeObserver(() => {
      this._seeds = undefined;
    });
    this._resizeObserver.observe(root);
    this._routingAttached = true;
  }

  // An element with no action is skipped so it cannot absorb a neighbor's tap.
  private _ensureSeeds(): void {
    if (this._seeds || !this._root || !this._elements || !this._config) {
      return;
    }
    const rootRect = this._root.getBoundingClientRect();
    const seeds: NearestSeed[] = [];
    const reserved: ReservedBox[] = [];
    this._elements.forEach((element, i) => {
      const rawConfig = this._config!.elements[i];
      if (!rawConfig) {
        return;
      }
      if (!NEAREST_ROUTED_TYPES.has(rawConfig.type)) {
        if (isReservedElement(rawConfig)) {
          const rect = element.getBoundingClientRect();
          reserved.push({
            bx: rect.left - rootRect.left,
            by: rect.top - rootRect.top,
            bw: rect.width,
            bh: rect.height,
          });
        }
        return;
      }
      // Routed elements default tap and hold to more-info in their own setConfig;
      // the card owns the gesture, so apply those defaults before reading actions.
      const config: LovelaceElementConfig = {
        tap_action: { action: "more-info" },
        hold_action: { action: "more-info" },
        ...rawConfig,
      };
      if (!hasAnyAction(config as ActionsConfig)) {
        return;
      }
      const isIcon = config.type !== "state-label";
      const hostRect = element.getBoundingClientRect();
      // A label seeds a line through its text (not the padded host box) so it
      // only claims the text it shows; an icon seeds its box center as a point.
      let box = hostRect;
      if (!isIcon && hasTextRect(element)) {
        const textRect = element.getTextRect();
        if (textRect?.width) {
          box = textRect;
        }
      }
      const bx = box.left - rootRect.left;
      const by = box.top - rootRect.top;
      const cx = bx + box.width / 2;
      seeds.push({
        element,
        config,
        isIcon,
        x1: isIcon ? cx : bx,
        x2: isIcon ? cx : bx + box.width,
        cy: by + box.height / 2,
        bx,
        by,
        bw: box.width,
        bh: box.height,
      });
    });
    this._seeds = seeds;
    this._reserved = reserved;
  }

  private _routeTarget(ev: Event): NearestSeed | undefined {
    const root = this._root;
    // In the editor preview, clicks set element positions; don't route them.
    if (!root || this.preview) {
      return undefined;
    }
    this._ensureSeeds();
    if (!this._seeds?.length) {
      return undefined;
    }
    const touch = (ev as TouchEvent).touches?.[0];
    const clientX = touch ? touch.clientX : (ev as MouseEvent).clientX;
    const clientY = touch ? touch.clientY : (ev as MouseEvent).clientY;
    if (clientX === undefined) {
      return undefined;
    }
    const rootRect = root.getBoundingClientRect();
    const x = clientX - rootRect.left;
    const y = clientY - rootRect.top;

    // A tap on a button / custom card / actionable element is left to it.
    if (
      this._reserved?.some(
        (b) => x >= b.bx && x <= b.bx + b.bw && y >= b.by && y <= b.by + b.bh
      )
    ) {
      return undefined;
    }

    return pickNearestTarget(this._seeds, x, y, NEAREST_HIT_REACH);
  }

  private _onRoutedEvent = (ev: Event): void => {
    switch (ev.type) {
      case "touchstart":
      case "mousedown": {
        // Only a primary-button/touch press starts a gesture — a right/middle
        // click or a macOS ctrl-click produces no `click` to complete it and
        // would leave state armed.
        if (
          ev.type === "mousedown" &&
          ((ev as MouseEvent).button !== 0 || (ev as MouseEvent).ctrlKey)
        ) {
          return;
        }
        // A new press supersedes any abandoned prior gesture (e.g. one whose
        // click was swallowed by a text selection without leaving the card).
        this._resetGesture();
        const seed = this._routeTarget(ev);
        if (!seed) {
          // Not near any target: let the event reach images/buttons/background.
          return;
        }
        // This gesture belongs to the nearest target; own it end to end.
        this._activeSeed = seed;
        this._touchGesture = ev.type === "touchstart";
        ev.stopPropagation();
        this._startGesture(seed);
        break;
      }
      case "touchend":
      case "touchcancel":
        if (!this._activeSeed) {
          return;
        }
        ev.stopPropagation();
        this._endGesture(ev);
        break;
      case "click":
        // Keyboard and assistive-tech activation dispatch a click with detail 0
        // and no preceding pointer gesture: never route those, let them reach the
        // focused element so non-pointer users activate exactly what they focused
        // (routing is a pointer-only precision aid; keydown is never intercepted).
        if (!this._activeSeed || (ev as MouseEvent).detail === 0) {
          this._activeSeed = undefined;
          return;
        }
        ev.stopPropagation();
        this._endGesture(ev);
        break;
      case "touchmove":
        // A scroll cancels a pending hold and the gesture itself.
        this._cancelled = true;
        clearTimeout(this._holdTimer);
        this._holdTimer = undefined;
        break;
      case "mouseleave":
        // Only the pointer leaving the whole card (root's own mouseleave, which
        // does not bubble) cancels a pending mouse press — not sliding between
        // child elements, which a capture listener would otherwise catch.
        if (ev.target === this._root) {
          this._resetGesture();
        }
        break;
      case "dblclick":
        // A double tap is resolved from click detail; stop the native dblclick
        // (e.g. text selection) when it lands on a routed target.
        if (this._routeTarget(ev)) {
          ev.stopPropagation();
          ev.preventDefault();
        }
        break;
      case "contextmenu":
        // A touch long-press fires contextmenu before touchend; suppress the
        // native menu for an in-flight touch gesture so the press resolves on
        // touchend (as the action-handler directive does). A mouse right-click
        // has no active touch gesture, so it keeps its menu.
        if (this._activeSeed && this._touchGesture) {
          ev.stopPropagation();
          ev.preventDefault();
        }
        break;
      default:
        break;
    }
  };

  private _resetGesture(): void {
    this._activeSeed = undefined;
    this._held = false;
    clearTimeout(this._holdTimer);
    this._holdTimer = undefined;
  }

  // The hold timer only marks _held; the action itself fires on release.
  private _startGesture(seed: NearestSeed): void {
    this._cancelled = false;
    this._held = false;
    clearTimeout(this._holdTimer);
    this._holdTimer = undefined;
    const config = seed.config as ActionConfigParams;
    if (hasAction(config.hold_action)) {
      this._holdTimer = window.setTimeout(() => {
        this._held = true;
      }, ACTION_HANDLER_HOLD_TIME);
    }
  }

  // Resolve the gesture and apply it (see resolveGestureEnd for the rules).
  private _endGesture(ev: Event): void {
    const seed = this._activeSeed;
    this._activeSeed = undefined;
    if (!seed) {
      return;
    }
    const config = seed.config as ActionConfigParams;
    const outcome = resolveGestureEnd({
      hasHold: hasAction(config.hold_action),
      hasDoubleClick: hasAction(config.double_tap_action),
      held: this._held,
      cancelled: this._cancelled,
      eventType: ev.type,
      clickDetail: (ev as MouseEvent).detail,
      // Card-global — one double-tap window across the card.
      doubleTapPending: this._dblTimer !== undefined,
    });
    clearTimeout(this._holdTimer);
    this._holdTimer = undefined;
    if (outcome === "none") {
      return;
    }
    // Suppress the synthesized mouse click that follows a handled touch.
    if (ev.cancelable) {
      ev.preventDefault();
    }
    if (outcome === "arm-tap") {
      this._dblTimer = window.setTimeout(() => {
        this._dblTimer = undefined;
        handleAction(seed.element, this.hass!, config, "tap");
      }, ACTION_HANDLER_DOUBLE_CLICK_TIME);
      return;
    }
    if (outcome === "double_tap") {
      clearTimeout(this._dblTimer);
      this._dblTimer = undefined;
    }
    handleAction(seed.element, this.hass!, config, outcome);
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    let image: string | undefined =
      (typeof this._config?.image === "object" &&
        this._config.image.media_content_id) ||
      (this._config.image as string | undefined);

    const darkModeImage: string | undefined =
      (typeof this._config?.dark_mode_image === "object" &&
        this._config.dark_mode_image.media_content_id) ||
      (this._config.dark_mode_image as string | undefined);

    if (this._config.image_entity) {
      const stateObj: ImageEntity | PersonEntity | undefined =
        this.hass.states[this._config.image_entity];
      const domain: string = computeDomain(this._config.image_entity);
      switch (domain) {
        case "image":
          image = computeImageUrl(stateObj as ImageEntity);
          break;
        case "person":
          if ((stateObj as PersonEntity).attributes.entity_picture) {
            image = (stateObj as PersonEntity).attributes.entity_picture;
          }
          break;
      }
    }

    return html`
      <ha-card .header=${this._config.title}>
        <div id="root">
          <hui-image
            .hass=${this.hass}
            .image=${image}
            .stateImage=${this._config.state_image}
            .stateFilter=${this._config.state_filter}
            .cameraImage=${this._config.camera_image}
            .cameraView=${this._config.camera_view}
            .entity=${this._config.entity}
            .aspectRatio=${this._config.aspect_ratio}
            .darkModeFilter=${this._config.dark_mode_filter}
            .darkModeImage=${darkModeImage}
            @click=${this._handleImageClick}
          ></hui-image>
          ${this._elements}
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    #root {
      position: relative;
    }

    .element {
      position: absolute;
      transform: translate(-50%, -50%);
    }

    ha-card {
      overflow: hidden;
      height: 100%;
      box-sizing: border-box;
    }
  `;

  private _createElement(
    elementConfig: LovelaceElementConfig
  ): LovelaceElement {
    const element = createStyledHuiElement(elementConfig) as LovelaceCard;
    if (this.hass) {
      element.hass = this.hass;
    }
    element.preview = this.preview;
    element.addEventListener(
      "ll-rebuild",
      (ev) => {
        ev.stopPropagation();
        this._rebuildElement(element, elementConfig);
      },
      { once: true }
    );
    return element;
  }

  private _rebuildElement(
    elToReplace: LovelaceElement,
    config: LovelaceElementConfig
  ): void {
    const newCardEl = this._createElement(config);
    if (elToReplace.parentElement) {
      elToReplace.parentElement.replaceChild(newCardEl, elToReplace);
    }
    this._elements = this._elements!.map((curCardEl) =>
      curCardEl === elToReplace ? newCardEl : curCardEl
    );
    // The rebuilt element replaces one a seed may point at; drop the cache.
    this._seeds = undefined;
  }

  private _handleImageClick(ev: MouseEvent): void {
    if (!this.preview || !this._config?.[PREVIEW_CLICK_CALLBACK]) {
      return;
    }

    const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * 100;
    const y = ((ev.clientY - rect.top) / rect.height) * 100;

    // only the edited card has this callback
    this._config[PREVIEW_CLICK_CALLBACK](x, y);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-picture-elements-card": HuiPictureElementsCard;
  }
}
