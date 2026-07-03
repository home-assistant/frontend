import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { computeDomain } from "../../../common/entity/compute_domain";
import "../../../components/ha-card";
import type { ImageEntity } from "../../../data/image";
import { computeImageUrl } from "../../../data/image";
import type {
  ActionHandlerOptions,
  ActionHandlerResolution,
} from "../../../data/lovelace/action_handler";
import type { HomeAssistant } from "../../../types";
import { findEntities } from "../common/find-entities";
import { actionHandler } from "../common/directives/action-handler-directive";
import type { LovelaceElement, LovelaceElementConfig } from "../elements/types";
import type { LovelaceCard, LovelaceCardEditor } from "../types";
import { createStyledHuiElement } from "./picture-elements/create-styled-hui-element";
import type { HitTarget } from "./picture-elements/nearest-hit";
import { pickNearestTarget } from "./picture-elements/nearest-hit";
import {
  PREVIEW_CLICK_CALLBACK,
  type PictureElementsCardConfig,
} from "./types";
import type { PersonEntity } from "../../../data/person";

// Point/text elements whose pointer gestures are routed to the nearest target
// so that dead gaps between elements become tappable and overlapping hit areas
// no longer steal each other's taps. These elements delegate their pointer
// handling to the card (keeping keyboard activation for themselves) and expose
// their visible hit target via getHitInfo(); the card binds the shared
// action-handler on #root with a resolver, so routed gestures run on the same
// engine (hold ripple, cancellation, timers) as every other card.
const NEAREST_ROUTED_TYPES = new Set([
  "state-icon",
  "state-badge",
  "icon",
  "state-label",
]);

// How far (px) a tap may sit from an icon seed and still be routed to it.
const NEAREST_HIT_REACH = 24;

// A routed target: `x1..x2 @ cy` is the seed used for the nearest test (icons
// are a point, labels the horizontal text segment); `bx/by/bw/bh` is the
// element's visible box, used to decide whether a tap lands directly on it.
interface NearestSeed extends HitTarget {
  element: LovelaceElement;
  options: ActionHandlerOptions;
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

    if (!this._config || !this.hass) {
      return;
    }

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

  // Resolve a pointer gesture on #root to the routed element it belongs to.
  // Geometry is read fresh from the rendered DOM at every gesture, so it can
  // never go stale; the couple of rect reads per press are cheap.
  private _resolveGesture = (
    x: number,
    y: number,
    ev: Event
  ): ActionHandlerResolution | null => {
    const root = this._root;
    // In the editor preview, clicks set element positions; don't route them.
    if (!root || this.preview) {
      return null;
    }
    // A non-primary or ctrl mouse press produces no click to complete a
    // gesture and would leave the engine armed.
    if (
      ev.type === "mousedown" &&
      ((ev as MouseEvent).button !== 0 || (ev as MouseEvent).ctrlKey)
    ) {
      return null;
    }
    // A press that an interactive non-routed element (a button, custom card,
    // image element, or conditional child) catches natively is that element's
    // own gesture; only presses on routed elements and the background route.
    for (const node of ev.composedPath()) {
      if (node === root) {
        break;
      }
      if (
        node instanceof HTMLElement &&
        node.classList.contains("element") &&
        !(node as LovelaceElement).delegatedActions
      ) {
        return null;
      }
    }
    const rootRect = root.getBoundingClientRect();
    const seeds = this._collectSeeds(rootRect);
    if (!seeds.length) {
      return null;
    }
    const seed = pickNearestTarget(
      seeds,
      x - rootRect.left,
      y - rootRect.top,
      NEAREST_HIT_REACH
    );
    return seed ? { target: seed.element, options: seed.options } : null;
  };

  private _collectSeeds(rootRect: DOMRect): NearestSeed[] {
    const seeds: NearestSeed[] = [];
    if (!this._elements) {
      return seeds;
    }
    for (const element of this._elements) {
      if (!element.delegatedActions || !element.getHitInfo) {
        continue;
      }
      // A hidden element (display: none, visibility: hidden, …) must not
      // become an invisible tap target.
      if (element.checkVisibility && !element.checkVisibility()) {
        continue;
      }
      const hit = element.getHitInfo();
      if (!hit || hit.rect.width <= 0 || hit.rect.height <= 0) {
        continue;
      }
      const bx = hit.rect.left - rootRect.left;
      const by = hit.rect.top - rootRect.top;
      const isIcon = !hit.isText;
      const cx = bx + hit.rect.width / 2;
      seeds.push({
        element,
        options: hit.options,
        isIcon,
        x1: isIcon ? cx : bx,
        x2: isIcon ? cx : bx + hit.rect.width,
        cy: by + hit.rect.height / 2,
        bx,
        by,
        bw: hit.rect.width,
        bh: hit.rect.height,
      });
    }
    return seeds;
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
        <div
          id="root"
          .actionHandler=${actionHandler({ resolve: this._resolveGesture })}
        >
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
    if (NEAREST_ROUTED_TYPES.has(elementConfig.type)) {
      (element as LovelaceElement).delegatedActions = true;
    }
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
