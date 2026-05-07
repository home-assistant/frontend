import { HasSlotController } from "@home-assistant/webawesome/dist/internal/slot";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";

/**
 * @element ha-row-item
 * @extends {LitElement}
 *
 * @summary
 * Generic row layout primitive. Renders a horizontal row with optional
 * leading/trailing slots and a stacked middle column (headline +
 * supporting text). Role-agnostic; use `ha-list-item-base` and its
 * subclasses for list semantics.
 *
 * @slot start - Leading container (usually icon/avatar).
 * @slot end - Trailing container (usually meta/chevron).
 * @slot headline - Primary text (overrides the `headline` attribute).
 * @slot supporting-text - Secondary text (overrides the `supporting-text` attribute).
 * @slot content - Escape hatch: replaces the entire middle column (headline + supporting-text).
 *
 * @csspart base - The outer container.
 * @csspart start - The leading slot wrapper.
 * @csspart content - The middle column wrapper.
 * @csspart headline - The headline wrapper.
 * @csspart supporting-text - The supporting-text wrapper.
 * @csspart end - The trailing slot wrapper.
 *
 * @cssprop --ha-row-item-padding-block - Vertical padding inside the row.
 * @cssprop --ha-row-item-padding-inline - Horizontal padding inside the row.
 * @cssprop --ha-row-item-gap - Gap between start, content, and end.
 * @cssprop --ha-row-item-min-height - Minimum row height.
 *
 * @attr {string} headline - Primary text. Overridden by the `headline` slot.
 * @attr {string} supporting-text - Secondary text. Overridden by the `supporting-text` slot.
 * @attr {boolean} disabled - Dims the row and blocks pointer events.
 */
@customElement("ha-row-item")
export class HaRowItem extends LitElement {
  @property({ type: String }) public headline?: string;

  @property({ type: String, attribute: "supporting-text" })
  public supportingText?: string;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  protected readonly _slotController = new HasSlotController(
    this,
    "start",
    "end",
    "headline",
    "supporting-text",
    "content"
  );

  protected render(): TemplateResult {
    return this._renderBase(this._renderInner());
  }

  protected _renderBase(inner: TemplateResult): TemplateResult {
    return html`<div part="base" class="base" id="item">${inner}</div>`;
  }

  protected _renderInner(): TemplateResult {
    const hasStart = this._slotController.test("start");
    const hasEnd = this._slotController.test("end");
    const hasContent = this._slotController.test("content");

    return html`
      ${hasStart
        ? html`<div part="start" class="start">
            <slot name="start"></slot>
          </div>`
        : nothing}
      <div part="content" class="content">
        ${hasContent
          ? html`<slot name="content"></slot>`
          : this._renderDefaultContent()}
      </div>
      ${hasEnd
        ? html`<div part="end" class="end">
            <slot name="end"></slot>
          </div>`
        : nothing}
    `;
  }

  protected _renderDefaultContent(): TemplateResult {
    const hasHeadlineSlot = this._slotController.test("headline");
    const hasSupportingSlot = this._slotController.test("supporting-text");

    const showHeadline = hasHeadlineSlot || this.headline !== undefined;
    const showSupporting =
      hasSupportingSlot || this.supportingText !== undefined;

    return html`
      ${showHeadline
        ? html`<div part="headline" class="headline">
            <slot name="headline">${this.headline ?? nothing}</slot>
          </div>`
        : nothing}
      ${showSupporting
        ? html`<div part="supporting-text" class="supporting">
            <slot name="supporting-text"
              >${this.supportingText ?? nothing}</slot
            >
          </div>`
        : nothing}
    `;
  }

  static styles: CSSResultGroup = css`
    :host {
      display: block;
      color: var(--primary-text-color);
      font-size: var(--ha-font-size-m);
      line-height: var(--ha-line-height-normal);
      --ha-row-item-padding-block: var(--ha-space-3);
      --ha-row-item-padding-inline: var(--ha-space-4);
      --ha-row-item-gap: var(--ha-space-4);
      --ha-row-item-min-height: 48px;
    }
    :host([disabled]) {
      color: var(--disabled-text-color);
      pointer-events: none;
    }
    .base {
      position: relative;
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: var(--ha-row-item-gap);
      padding-block: var(--ha-row-item-padding-block);
      padding-inline: var(--ha-row-item-padding-inline);
      min-height: var(--ha-row-item-min-height);
      box-sizing: border-box;
    }
    .content {
      flex: 1 1 auto;
      min-width: 0;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .start,
    .end {
      display: flex;
      align-items: center;
      flex: 0 0 auto;
    }
    .headline {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .supporting {
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-row-item": HaRowItem;
  }
}
