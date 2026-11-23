import type { ContextType } from "@lit/context";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { consume } from "../../common/decorators/consume";
import type {
  ExtractedSkeleton,
  SkeletonPiece,
} from "../../common/dom/extract-skeleton";
import { extractSkeleton } from "../../common/dom/extract-skeleton";
import type { HASSDomEvent } from "../../common/dom/fire_event";
import { parseAnimationDuration } from "../../common/util/parse-animation-duration";
import { internationalizationContext } from "../../data/context";
import type { HaSkeleton } from "./ha-skeleton";
import "./ha-skeleton";
import {
  rememberedSkeletonHeight,
  rememberSkeletonHeight,
} from "./skeleton-sizes";

/* How long after loading the content can still settle into its size */
const SETTLE_TIME = 2000;

export interface SkeletonLoadingDetail {
  loading: boolean;
}

interface ArrivingParts {
  /* The whole content, when it was hidden rather than its parts */
  content: Element[];
  opacityParts: (HTMLElement | SVGElement)[];
  colorParts: HTMLElement[];
}

/* Transitions are held off too, so a part hides at once rather than easing
   out from under its skeleton */
type HiddenProperty = "opacity" | "color" | "transition";

interface HiddenStyle {
  /* The inline value from before anything hid it */
  value: string;
  /* The value it was hidden with */
  hidden: string;
  holders: number;
}

/* Overlays nest, as a stack card's cards each have their own, so two can
   hide the same element. The first to hide one notes the value it really
   had, and only the last to let go puts that back, so neither keeps the
   other's hidden value as the one to restore. */
const hiddenStyles: Record<
  HiddenProperty,
  Map<HTMLElement | SVGElement, HiddenStyle>
> = { opacity: new Map(), color: new Map(), transition: new Map() };

const hideStyle = (
  element: HTMLElement | SVGElement,
  name: HiddenProperty,
  hidden: string
) => {
  const held = hiddenStyles[name].get(element);

  if (held) {
    held.holders++;
  } else {
    hiddenStyles[name].set(element, {
      value: element.style[name],
      hidden,
      holders: 1,
    });
  }

  element.style[name] = hidden;
};

const releaseStyle = (
  element: HTMLElement | SVGElement,
  name: HiddenProperty
) => {
  const held = hiddenStyles[name].get(element);

  if (!held) {
    return;
  }

  held.holders--;

  if (held.holders === 0) {
    // Content that set its own value while it was hidden keeps that one
    if (element.style[name] === held.hidden) {
      element.style[name] = held.value;
    }

    hiddenStyles[name].delete(element);
  }
};

const holdersOf = (element: HTMLElement | SVGElement, name: HiddenProperty) =>
  hiddenStyles[name].get(element)?.holders ?? 0;

/* What's left out with data-skeleton="none" under an element, through
   shadow roots, as the skeleton is read */
const leftOut = (root: Element | ShadowRoot): HTMLElement[] =>
  [...root.querySelectorAll("*")].flatMap((element) => [
    ...(element instanceof HTMLElement && element.dataset.skeleton === "none"
      ? [element]
      : []),
    ...(element.shadowRoot ? leftOut(element.shadowRoot) : []),
  ]);

/**
 * Shows a skeleton of its content while that content loads, read from the
 * content itself: each line of text, icon, image, control and drawing gets
 * its own piece. When loading ends, the pieces go and each part fades in.
 *
 * Loading is on while `loading` is set, or while anything inside has fired
 * a `skeleton-loading` event with `{ loading: true }` and not yet
 * `{ loading: false }`. The event stops at the nearest overlay, so content
 * doesn't need to know what wraps it.
 *
 * To take over:
 * - put your own skeleton in the `skeleton` slot, and it's used instead of
 *   reading one
 * - set `data-skeleton` on any element inside, as described in
 *   `extract-skeleton`, to change how that part is read or leave it out
 * - call `refresh()` when the content changes without changing size
 *
 * With a `skeleton-key`, it remembers how big the content was once loaded,
 * and next time holds that size while it loads, stretching the content to
 * fill it. Give each piece of content its own key, such as one made with
 * `skeletonKey()` from its config.
 *
 * With nothing to read yet, such as before the content's code has loaded,
 * it fills itself with one plain wave. The skeleton follows the host's
 * corner radius.
 *
 * @slot - The content.
 * @slot skeleton - A skeleton of your own, used instead of reading one.
 */
@customElement("ha-skeleton-overlay")
export class HaSkeletonOverlay extends LitElement {
  @property({ type: Boolean }) public loading = false;

  @property() public effect: HaSkeleton["effect"] = "sheen";

  /** Remember the loaded size under this key, and hold it next time */
  @property({ attribute: "skeleton-key" }) public skeletonKey?: string;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n?: ContextType<typeof internationalizationContext>;

  /* What's inside that has said it's loading */
  @state() private _loadingSources = new Set<EventTarget>();

  @state() private _pieces?: SkeletonPiece[];

  @state() private _customSkeleton = false;

  @state() private _onScreen = true;

  @query("slot:not([name])") private _contentSlot?: HTMLSlotElement;

  /* The parts this overlay hides, through hideStyle */
  private _hiddenOpacity = new Set<HTMLElement | SVGElement>();

  private _hiddenColor = new Set<HTMLElement>();

  private _heldTransition = new Set<HTMLElement | SVGElement>();

  /* Inline colours of content left out inside hidden text, which keeps its
     own colour meanwhile */
  private _keptColor = new Map<HTMLElement, string>();

  /* Whether the content was inert before loading made it so */
  private _hiddenInert = new Map<HTMLElement, boolean>();

  private _wasLoading = false;

  /* What to fade in once loading has ended */
  private _arriving?: ArrivingParts;

  /* The fades still running from the last time loading ended */
  private _fades: Animation[] = [];

  private _measureFrame?: number;

  /* Whether the remembered size was looked at for this load */
  private _reserveChecked = false;

  private _settleObserver?: ResizeObserver;

  private _settleTimeout?: number;

  private _resizeObserver = new ResizeObserver(() => this._scheduleMeasure());

  private _intersectionObserver = new IntersectionObserver((entries) => {
    this._onScreen = entries[entries.length - 1].isIntersecting;
  });

  constructor() {
    super();
    // On the host rather than the slot, so content that says it's loading
    // as it connects, before the first render, is heard
    this.addEventListener("skeleton-loading", this._skeletonLoading);
  }

  public connectedCallback() {
    super.connectedCallback();
    this._syncInert();

    if (this._wasLoading) {
      this._observe();
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._unobserve();
    this._stopRemembering();

    if (this._measureFrame !== undefined) {
      cancelAnimationFrame(this._measureFrame);
      this._measureFrame = undefined;
    }

    // Never leave the content hidden or unusable while it's away
    this._cancelFades();
    this._showParts();
    this._restoreInert();
  }

  /** Read the skeleton again, after the content changed but not its size */
  public refresh() {
    this._scheduleMeasure();
  }

  private get _isLoading() {
    return this.loading || this._loadingSources.size > 0;
  }

  protected willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);
    const loading = this._isLoading;

    if (loading && !this._wasLoading) {
      // A fade still running would show the content over the hidden style
      this._cancelFades();
      this._customSkeleton = [...this.children].some(
        (child) => child.slot === "skeleton"
      );
      this._reserveChecked = false;
      this._stopRemembering();
      this._observe();
    }

    if (!loading && this._wasLoading) {
      this._unobserve();
      this._endLoading();
      this._rememberWhenSettled();
    }

    this._wasLoading = loading;
  }

  protected updated(changedProperties: PropertyValues<this>) {
    super.updated(changedProperties);

    // Only when loading starts: loading events, slot changes, sizes and
    // refresh() ask for their own, and measuring after every update would
    // run each frame for content that animates, such as a spinner, as every
    // reading comes out different and updates again
    if (this._isLoading && changedProperties.has("loading")) {
      this._scheduleMeasure();
    }

    this._syncInert();

    if (this._arriving) {
      this._fadeIn(this._arriving);
      this._arriving = undefined;
    }
  }

  protected render() {
    const loading = this._isLoading;
    // Named like ha-spinner, which falls back to English before translations
    // have loaded
    const label = this._i18n?.localize("ui.common.loading") || "Loading";

    return html`
      <slot
        class=${classMap({
          // Before the first reading, or under a skeleton of your own
          hidden:
            loading && (this._customSkeleton || this._pieces === undefined),
        })}
        @slotchange=${this._contentChanged}
      ></slot>
      ${
        loading
          ? html`
              <div class="skeleton" role="progressbar" aria-label=${label}>
                <slot
                  name="skeleton"
                  @slotchange=${this._skeletonSlotChanged}
                ></slot>
                ${this._customSkeleton ? nothing : this._renderPieces()}
              </div>
            `
          : nothing
      }
    `;
  }

  private _renderPieces() {
    // Nothing still animates off screen
    const effect = this._onScreen ? this.effect : "none";

    if (!this._pieces?.length) {
      return html`<ha-skeleton class="fill" .effect=${effect}></ha-skeleton>`;
    }

    return this._pieces.map((piece) =>
      piece.kind === "scrim"
        ? html`<div class="piece" style=${pieceStyle(piece)}></div>`
        : html`<ha-skeleton
            class=${classMap({
              piece: true,
              [piece.kind]: true,
              "on-dark": Boolean(piece.onDark),
            })}
            .effect=${effect}
            style=${pieceStyle(piece)}
          ></ha-skeleton>`
    );
  }

  private _skeletonLoading = (ev: HASSDomEvent<SkeletonLoadingDetail>) => {
    // The nearest overlay owns it
    ev.stopPropagation();
    const source = ev.composedPath()[0];
    const sources = new Set(this._loadingSources);

    if (ev.detail.loading) {
      sources.add(source);
    } else {
      sources.delete(source);
    }

    this._loadingSources = sources;
    this._scheduleMeasure();
  };

  /* Sizes and visibility only matter while loading, so an overlay around
     content that has loaded costs nothing */
  private _observe() {
    this._resizeObserver.disconnect();
    this._resizeObserver.observe(this);
    this._contentSlot
      ?.assignedElements()
      .forEach((element) => this._resizeObserver.observe(element));
    this._intersectionObserver.observe(this);
    this._scheduleMeasure();
  }

  private _unobserve() {
    this._resizeObserver.disconnect();
    this._intersectionObserver.disconnect();
  }

  private _contentChanged() {
    if (!this._isLoading) {
      return;
    }

    this._observe();
    this._pruneSources();
    this._syncInert();
  }

  /* Content that went away, or moved out of this overlay, can't finish
     loading here. Removing it deep inside a card fires no slotchange, so
     this runs on every measure too, which any change of size starts. */
  private _pruneSources() {
    const sources = [...this._loadingSources].filter((source) =>
      this._holds(source)
    );

    if (sources.length !== this._loadingSources.size) {
      this._loadingSources = new Set(sources);
    }
  }

  /* Whether a source is still inside this overlay, the way its events
     travel: through the slots content shows in, and out of shadow roots */
  private _holds(source: EventTarget) {
    if (!(source instanceof Node)) {
      return true;
    }

    let node: Node | null = source;

    while (node) {
      if (node === this) {
        return true;
      }

      node =
        node instanceof ShadowRoot
          ? node.host
          : ((node instanceof Element || node instanceof Text
              ? node.assignedSlot
              : null) ?? node.parentNode);
    }

    return false;
  }

  private _skeletonSlotChanged(ev: Event) {
    const slot = ev.target;

    if (!(slot instanceof HTMLSlotElement)) {
      return;
    }

    this._customSkeleton = slot.assignedNodes({ flatten: true }).length > 0;

    if (this._customSkeleton) {
      // The whole content is hidden under it instead
      this._showParts();
      this._pieces = undefined;
    } else {
      // Read from the content again now it's gone
      this._scheduleMeasure();
    }
  }

  private _scheduleMeasure() {
    if (this._measureFrame !== undefined || !this.isConnected) {
      return;
    }

    this._measureFrame = requestAnimationFrame(() => {
      this._measureFrame = undefined;
      this._measure();
    });
  }

  /* Read the skeleton from the content, and hide the parts it stands in for */
  private _measure() {
    // A part that said it was loading may have gone without saying it's done
    this._pruneSources();

    if (!this._isLoading) {
      return;
    }

    this._reserve();

    if (this._customSkeleton) {
      return;
    }

    // Read from the content as it really looks, then hide it again before
    // the next paint, so nothing flickers
    this._showParts();
    const skeleton = extractSkeleton(this, this.getBoundingClientRect());
    this._hideParts(skeleton);

    if (JSON.stringify(skeleton.pieces) !== JSON.stringify(this._pieces)) {
      this._pieces = skeleton.pieces;
    }
  }

  /* Hold the height the content had last time it loaded at this width */
  private _reserve() {
    if (this._reserveChecked || !this.skeletonKey) {
      return;
    }

    const width = this.getBoundingClientRect().width;

    // Not laid out yet
    if (!width) {
      return;
    }

    this._reserveChecked = true;
    const height = rememberedSkeletonHeight(this.skeletonKey, width);

    if (height === undefined) {
      return;
    }

    this.style.setProperty(
      "--ha-skeleton-overlay-reserved-height",
      `${height}px`
    );
    this.toggleAttribute("reserved", true);
  }

  private _release() {
    this.removeAttribute("reserved");
    this.style.removeProperty("--ha-skeleton-overlay-reserved-height");
  }

  /* Remember the size the content settles into once it has loaded */
  private _rememberWhenSettled() {
    const key = this.skeletonKey;

    if (!key) {
      return;
    }

    this._settleObserver = new ResizeObserver(() => {
      const { width, height } = this.getBoundingClientRect();

      if (width && height) {
        rememberSkeletonHeight(key, width, height);
      }
    });
    this._settleObserver.observe(this);
    this._settleTimeout = window.setTimeout(
      () => this._stopRemembering(),
      SETTLE_TIME
    );
  }

  private _stopRemembering() {
    this._settleObserver?.disconnect();
    this._settleObserver = undefined;
    clearTimeout(this._settleTimeout);
    this._settleTimeout = undefined;
  }

  private _hideParts(skeleton: ExtractedSkeleton) {
    skeleton.parts.forEach((part) => {
      if (!this._hiddenOpacity.has(part)) {
        this._hiddenOpacity.add(part);
        hideStyle(part, "opacity", "0");
      }
    });

    // What's left out with data-skeleton="none" inside text that's hidden
    // keeps the colour it has now, rather than taking the transparent one.
    // Read before any text is hidden.
    const kept = skeleton.textParts.flatMap((part) =>
      leftOut(part).map(
        (element) => [element, getComputedStyle(element).color] as const
      )
    );

    // Text goes through its colour, so a frame drawn by the same element,
    // such as a badge's pill, stays
    skeleton.textParts.forEach((part) => {
      if (!this._hiddenColor.has(part)) {
        this._hiddenColor.add(part);
        hideStyle(part, "color", "transparent");
      }
    });

    kept.forEach(([element, color]) => {
      if (!this._keptColor.has(element)) {
        this._keptColor.set(element, element.style.color);
      }

      element.style.color = color;
    });

    // In the same frame as the hiding, so no transition runs on it
    [...skeleton.parts, ...skeleton.textParts].forEach((part) => {
      if (!this._heldTransition.has(part)) {
        this._heldTransition.add(part);
        hideStyle(part, "transition", "none");
      }
    });
  }

  private _showParts() {
    this._hiddenOpacity.forEach((part) => releaseStyle(part, "opacity"));
    this._hiddenColor.forEach((part) => releaseStyle(part, "color"));
    this._keptColor.forEach((color, element) => {
      element.style.color = color;
    });
    this._heldTransition.forEach((part) => releaseStyle(part, "transition"));
    this._hiddenOpacity.clear();
    this._hiddenColor.clear();
    this._keptColor.clear();
    this._heldTransition.clear();
  }

  /* The whole content can't be focused, used or read out while it loads,
     including frames around the hidden parts, such as a card that takes
     clicks. Content that has left, or finished, gets its own state back. */
  private _syncInert() {
    const loading = this.isConnected && this._isLoading;

    const content = new Set(
      loading ? (this._contentSlot?.assignedElements() ?? []) : []
    );

    this._hiddenInert.forEach((inert, element) => {
      if (!content.has(element)) {
        element.inert = inert;
        this._hiddenInert.delete(element);
      }
    });

    content.forEach((element) => {
      if (element instanceof HTMLElement && !this._hiddenInert.has(element)) {
        this._hiddenInert.set(element, element.inert);
        element.inert = true;
      }
    });
  }

  private _restoreInert() {
    this._hiddenInert.forEach((inert, element) => {
      element.inert = inert;
    });
    this._hiddenInert.clear();
  }

  /* Show the content again before the next paint, and note what to fade in */
  private _endLoading() {
    // Under a skeleton of its own, or with nothing read from it, the whole
    // content was hidden or not there yet, rather than its parts
    const wholeContent = this._customSkeleton || !this._pieces?.length;

    this._arriving = {
      content: wholeContent
        ? (this._contentSlot?.assignedElements() ?? [])
        : [],
      // Only what this overlay is the last to hide shows now; a part a
      // nested overlay still hides stays hidden, and fades in with that one
      opacityParts: [...this._hiddenOpacity].filter(
        (part) => holdersOf(part, "opacity") === 1
      ),
      colorParts: [...this._hiddenColor].filter(
        (part) => holdersOf(part, "color") === 1
      ),
    };

    this._showParts();
    this._release();
    this._pieces = undefined;
  }

  /* Fade each arriving part in, instantly with reduced motion */
  private _fadeIn({ content, opacityParts, colorParts }: ArrivingParts) {
    // In ms or s, as the token can be either; 150ms only when it isn't set
    const token = getComputedStyle(this)
      .getPropertyValue("--ha-animation-duration-fast")
      .trim();

    const fade: KeyframeAnimationOptions = {
      duration: token ? parseAnimationDuration(token) : 150,
      easing: "ease-out",
    };

    this._fades = [
      // To each part's own opacity, which isn't always 1
      ...[...content, ...opacityParts].map((part) => {
        const opacity = getComputedStyle(part).opacity;

        return part.animate([{ opacity: 0 }, { opacity }], fade);
      }),
      ...colorParts.map((part) => {
        const color = getComputedStyle(part).color;

        return part.animate([{ color: "transparent" }, { color }], fade);
      }),
    ];
  }

  private _cancelFades() {
    this._fades.forEach((fade) => fade.cancel());
    this._fades = [];
  }

  static readonly styles: CSSResultGroup = css`
    :host {
      display: block;
      position: relative;
    }
    /* Holds the size the content had last time, and stretches the content
       to fill it */
    :host([reserved]) {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
    }
    :host([reserved])::before {
      content: "";
      grid-area: 1 / 1;
      height: var(--ha-skeleton-overlay-reserved-height);
    }
    :host([reserved]) ::slotted(*) {
      grid-area: 1 / 1;
    }
    slot.hidden::slotted(*) {
      opacity: 0;
    }
    .skeleton {
      position: absolute;
      inset: 0;
      overflow: hidden;
      border-radius: inherit;
      pointer-events: none;
    }
    /* Rounded by the layer it fills, which follows the host */
    .fill {
      position: absolute;
      inset: 0;
      --ha-skeleton-border-radius: 0;
    }
    .piece {
      position: absolute;
      min-height: 0;
    }
    .piece.round {
      --ha-skeleton-border-radius: var(--ha-border-radius-circle);
    }
    .piece.shape {
      --ha-skeleton-border-radius: 0;
      mask-size: 100% 100%;
      -webkit-mask-size: 100% 100%;
      mask-repeat: no-repeat;
      -webkit-mask-repeat: no-repeat;
    }
    /* Text and icons on a dark bar over a picture */
    .piece.on-dark {
      --ha-skeleton-color: rgba(255, 255, 255, 0.3);
      --ha-skeleton-sheen-color: rgba(255, 255, 255, 0.5);
    }
  `;
}

const pieceStyle = ({ maskBox, ...piece }: SkeletonPiece) => {
  const maskPosition = maskBox ? `${maskBox.x}px ${maskBox.y}px` : undefined;

  const maskSize = maskBox
    ? `${maskBox.width}px ${maskBox.height}px`
    : undefined;

  return styleMap({
    left: `${piece.x}px`,
    top: `${piece.y}px`,
    width: `${piece.width}px`,
    height: `${piece.height}px`,
    "--ha-skeleton-border-radius": piece.radius,
    "border-radius": piece.kind === "scrim" ? piece.radius : undefined,
    "background-color": piece.background,
    "mask-image": piece.mask,
    "-webkit-mask-image": piece.mask,
    "mask-position": maskPosition,
    "-webkit-mask-position": maskPosition,
    "mask-size": maskSize,
    "-webkit-mask-size": maskSize,
  });
};

declare global {
  interface HTMLElementTagNameMap {
    "ha-skeleton-overlay": HaSkeletonOverlay;
  }

  interface HASSDomEvents {
    "skeleton-loading": SkeletonLoadingDetail;
  }

  // for add event listener
  interface HTMLElementEventMap {
    "skeleton-loading": HASSDomEvent<HASSDomEvents["skeleton-loading"]>;
  }
}
