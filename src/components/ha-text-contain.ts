import type { PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators";

/**
 * A container that shrinks its slotted content's `font-size` to fit its
 * available width and height, without wrapping.
 *
 * Measures slotted content against the host's `clientWidth` / `clientHeight`
 * and scales font-size proportionally between `min-size` and `max-size`. The
 * content is re-fitted whenever the host resizes or the slotted subtree
 * changes (text content, children, attributes).
 *
 * Unlike CSS-only solutions (`clamp()` with `cqi`/`cqw` units), this
 * reacts to the rendered text length — short content stays at `max-size`
 * while long content shrinks only as needed.
 *
 * @example
 * ```html
 * <ha-text-contain min-size="14" max-size="28">
 *   <span>Some text that may overflow</span>
 * </ha-text-contain>
 * ```
 *
 * @slot - Content to fit. Typically a single inline element or text node.
 *   Multi-line wrapping is not supported (content is forced to `nowrap`).
 *
 * @cssprop Pass font styling (weight, family, color, line-height) directly
 *   on the host or slotted element. Only `font-size` is managed.
 */
@customElement("ha-text-contain")
export class HaTextContain extends LitElement {
  /** Minimum font size in pixels. Content will not shrink below this. */
  @property({ type: Number, attribute: "min-size" })
  public minSize?: number;

  /** Maximum font size in pixels. Content starts at this size. */
  @property({ type: Number, attribute: "max-size" })
  public maxSize?: number;

  /** Font weight. Applied directly to the content element. */
  @property({ type: Number, attribute: "font-weight" })
  public fontWeight?: number;

  @query(".content") private _content?: HTMLDivElement;

  private _resizeObserver?: ResizeObserver;

  private _mutationObserver?: MutationObserver;

  private _scheduled = false;

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._resizeObserver?.disconnect();
    this._mutationObserver?.disconnect();
    this._resizeObserver = undefined;
    this._mutationObserver = undefined;
  }

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    this._resizeObserver = new ResizeObserver(() => this._scheduleFit());
    this._resizeObserver.observe(this);
    if (this._content) {
      this._mutationObserver = new MutationObserver(() => this._scheduleFit());
      this._mutationObserver.observe(this._content, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
    this._scheduleFit();
  }

  protected updated(changedProps: PropertyValues<this>) {
    super.updated(changedProps);
    if (
      changedProps.has("minSize") ||
      changedProps.has("maxSize") ||
      changedProps.has("fontWeight")
    ) {
      this._scheduleFit();
    }
  }

  private _scheduleFit() {
    if (this._scheduled) return;
    this._scheduled = true;
    requestAnimationFrame(() => {
      this._scheduled = false;
      this._fitText();
    });
  }

  private _fitText() {
    const content = this._content;
    const { minSize, maxSize } = this;
    if (!content || minSize === undefined || maxSize === undefined) return;

    content.style.fontWeight = this.fontWeight ? String(this.fontWeight) : "";

    const scaleRaw = getComputedStyle(this)
      .getPropertyValue("--ha-font-size-scale")
      .trim();
    const fontScale = Number(scaleRaw) || 1;
    const scaledMin = minSize * fontScale;
    const scaledMax = maxSize * fontScale;

    content.style.fontSize = `${scaledMax}px`;

    const containerWidth = this.clientWidth;
    const containerHeight = this.clientHeight;
    const contentWidth = content.scrollWidth;
    const contentHeight = content.scrollHeight;

    if (!containerWidth || !contentWidth) return;

    const scale = Math.min(
      1,
      containerWidth / contentWidth,
      containerHeight / contentHeight
    );

    if (scale >= 1) {
      content.style.fontSize = `${scaledMax}px`;
      return;
    }

    content.style.fontSize = `${Math.max(scaledMin, scaledMax * scale)}px`;
  }

  protected render() {
    return html`<div class="content"><slot></slot></div>`;
  }

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      min-width: 0;
      min-height: 0;
    }
    .content {
      display: inline-block;
      white-space: nowrap;
      max-width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-text-contain": HaTextContain;
  }
}
