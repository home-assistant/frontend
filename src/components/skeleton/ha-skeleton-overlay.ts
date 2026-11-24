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
import { internationalizationContext } from "../../data/context";
import type { HaSkeleton } from "./ha-skeleton";
import "./ha-skeleton";

export interface SkeletonLoadingDetail {
  loading: boolean;
}

interface ArrivingParts {
  /* The whole content, when it was hidden rather than its parts */
  content: Element[];
  opacityParts: (HTMLElement | SVGElement)[];
  colorParts: HTMLElement[];
}

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

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n?: ContextType<typeof internationalizationContext>;

  /* What's inside that has said it's loading */
  @state() private _loadingSources = new Set<EventTarget>();

  @state() private _pieces?: SkeletonPiece[];

  @state() private _customSkeleton = false;

  @state() private _onScreen = true;

  @query("slot:not([name])") private _contentSlot?: HTMLSlotElement;

  /* Inline values the parts had before they were hidden */
  private _hiddenOpacity = new Map<HTMLElement | SVGElement, string>();

  private _hiddenColor = new Map<HTMLElement, string>();

  /* Inline colours of content left out inside hidden text, which keeps its
     own colour meanwhile */
  private _keptColor = new Map<HTMLElement, string>();

  /* Whether the content was inert before loading made it so */
  private _hiddenInert = new Map<HTMLElement, boolean>();

  private _wasLoading = false;

  /* What to fade in once loading has ended */
  private _arriving?: ArrivingParts;

  private _measureFrame?: number;

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
    this._resizeObserver.observe(this);
    this._intersectionObserver.observe(this);
    this._syncInert();
    this._scheduleMeasure();
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._resizeObserver.disconnect();
    this._intersectionObserver.disconnect();

    if (this._measureFrame !== undefined) {
      cancelAnimationFrame(this._measureFrame);
      this._measureFrame = undefined;
    }

    // Never leave the content hidden or unusable while it's away
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
      this._customSkeleton = [...this.children].some(
        (child) => child.slot === "skeleton"
      );
    }

    if (!loading && this._wasLoading) {
      this._endLoading();
    }

    this._wasLoading = loading;
  }

  protected updated(changedProperties: PropertyValues<this>) {
    super.updated(changedProperties);

    if (this._isLoading) {
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

  private _contentChanged() {
    this._resizeObserver.disconnect();
    this._resizeObserver.observe(this);
    this._contentSlot
      ?.assignedElements()
      .forEach((element) => this._resizeObserver.observe(element));

    this._pruneSources();
    this._syncInert();
    this._scheduleMeasure();
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
    this._pruneSources();

    if (!this._isLoading || this._customSkeleton) {
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

  private _hideParts(skeleton: ExtractedSkeleton) {
    skeleton.parts.forEach((part) => {
      this._hiddenOpacity.set(part, part.style.opacity);
      part.style.opacity = "0";
    });

    // What's left out with data-skeleton="none" inside text that's hidden
    // keeps the colour it has now, rather than taking the transparent one.
    // Read before any text is hidden.
    const kept = skeleton.textParts.flatMap((part) =>
      [...part.querySelectorAll('[data-skeleton="none"]')].flatMap((element) =>
        element instanceof HTMLElement
          ? [[element, getComputedStyle(element).color] as const]
          : []
      )
    );

    // Text goes through its colour, so a frame drawn by the same element,
    // such as a badge's pill, stays
    skeleton.textParts.forEach((part) => {
      this._hiddenColor.set(part, part.style.color);
      part.style.color = "transparent";
    });

    kept.forEach(([element, color]) => {
      if (!this._keptColor.has(element)) {
        this._keptColor.set(element, element.style.color);
      }

      element.style.color = color;
    });
  }

  private _showParts() {
    this._hiddenOpacity.forEach((opacity, part) => {
      part.style.opacity = opacity;
    });
    this._hiddenColor.forEach((color, part) => {
      part.style.color = color;
    });
    this._keptColor.forEach((color, element) => {
      element.style.color = color;
    });
    this._hiddenOpacity.clear();
    this._hiddenColor.clear();
    this._keptColor.clear();
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
    // Under a skeleton of its own, or before the first reading, the whole
    // content was hidden rather than its parts
    const wholeContent = this._customSkeleton || this._pieces === undefined;

    this._arriving = {
      content: wholeContent
        ? (this._contentSlot?.assignedElements() ?? [])
        : [],
      opacityParts: [...this._hiddenOpacity.keys()],
      colorParts: [...this._hiddenColor.keys()],
    };

    this._showParts();
    this._pieces = undefined;
  }

  /* Fade each arriving part in, instantly with reduced motion */
  private _fadeIn({ content, opacityParts, colorParts }: ArrivingParts) {
    const fade: KeyframeAnimationOptions = {
      duration:
        parseFloat(
          getComputedStyle(this).getPropertyValue(
            "--ha-animation-duration-fast"
          )
        ) || 150,
      easing: "ease-out",
    };

    [...content, ...opacityParts].forEach((part) =>
      part.animate([{ opacity: 0 }, { opacity: 1 }], fade)
    );
    colorParts.forEach((part) => {
      const color = getComputedStyle(part).color;
      part.animate([{ color: "transparent" }, { color }], fade);
    });
  }

  static readonly styles: CSSResultGroup = css`
    :host {
      display: block;
      position: relative;
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
    }
    /* Text and icons on a dark bar over a picture */
    .piece.on-dark {
      --ha-skeleton-color: rgba(255, 255, 255, 0.3);
      --ha-skeleton-sheen-color: rgba(255, 255, 255, 0.5);
    }
  `;
}

const pieceStyle = (piece: SkeletonPiece) =>
  styleMap({
    left: `${piece.x}px`,
    top: `${piece.y}px`,
    width: `${piece.width}px`,
    height: `${piece.height}px`,
    "--ha-skeleton-border-radius": piece.radius,
    "border-radius": piece.kind === "scrim" ? piece.radius : undefined,
    "background-color": piece.background,
    "mask-image": piece.mask,
    "-webkit-mask-image": piece.mask,
  });

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
