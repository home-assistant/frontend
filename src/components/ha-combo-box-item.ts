import { HasSlotController } from "@home-assistant/webawesome/dist/internal/slot";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { HaRowItem } from "./item/ha-row-item";

/**
 * @element ha-combo-box-item
 * @extends {HaRowItem}
 *
 * @summary
 * Content layout of picker rows and picker fields: icon, overline, headline,
 * supporting text, trailing text and end content. It is presentational only.
 * Interaction comes from the element around it, like `ha-list-item-option` in
 * a picker list or the button of `ha-picker-field`, which slot it into their
 * `content` slot.
 *
 * @slot start - Leading content (icon, badge, image).
 * @slot overline - Small text above the headline.
 * @slot - Headline text. Alternative to the `headline` slot.
 * @slot headline - Primary text.
 * @slot supporting-text - Secondary text. Multiple elements stack as lines.
 * @slot trailing-supporting-text - Meta text between the content and `end`.
 * @slot end - Trailing content (icons, buttons).
 *
 * @csspart base - The outer container.
 * @csspart start - The leading slot wrapper.
 * @csspart content - The text column.
 * @csspart end - The trailing slot wrapper.
 *
 * @cssprop --ha-combo-box-item-min-height - Minimum height of a row with one line of text. Defaults to `48px`.
 * @cssprop --ha-combo-box-item-two-line-min-height - Minimum height of a row with more than one line of text. Defaults to `64px`.
 * @cssprop --ha-combo-box-item-padding-block - Vertical padding. Defaults to `var(--ha-space-3)`.
 * @cssprop --ha-combo-box-item-padding-inline-start - Leading padding. Defaults to `var(--ha-space-4)`.
 * @cssprop --ha-combo-box-item-padding-inline-end - Trailing padding. Defaults to `var(--ha-space-4)`.
 * @cssprop --ha-combo-box-item-gap - Gap between start, content and end, and between elements within start and end. Defaults to `var(--ha-space-4)`.
 * @cssprop --ha-combo-box-item-headline-color - Headline color. Defaults to `var(--primary-text-color)`.
 * @cssprop --ha-combo-box-item-headline-font-weight - Headline font weight. Defaults to `var(--ha-font-weight-normal)`.
 * @cssprop --ha-combo-box-item-start-color - Color of the leading content. Defaults to `var(--secondary-text-color)`.
 * @cssprop --ha-combo-box-item-end-color - Color of the trailing content. Defaults to `var(--secondary-text-color)`.
 * @cssprop --ha-combo-box-item-disabled-opacity - Opacity of the content when disabled. Defaults to `0.3`.
 *
 * @attr {boolean} border-top - Draws a divider above the row.
 * @attr {boolean} multiline - Lets the headline and supporting text wrap instead of truncating.
 */
@customElement("ha-combo-box-item")
export class HaComboBoxItem extends HaRowItem {
  @property({ type: Boolean, reflect: true, attribute: "border-top" })
  public borderTop = false;

  // Allow the headline/supporting text to wrap onto multiple lines instead of
  // truncating with an ellipsis. Off by default to preserve single-line rows.
  @property({ type: Boolean, reflect: true })
  public multiline = false;

  private readonly _textSlots = new HasSlotController(
    this,
    "[default]",
    "overline",
    "headline",
    "supporting-text"
  );

  private _isTwoLine(): boolean {
    const lines = [
      this._textSlots.test("overline"),
      this._textSlots.test("[default]"),
      this._textSlots.test("headline") || this.headline !== undefined,
      this._textSlots.test("supporting-text") ||
        this.supportingText !== undefined,
    ].filter(Boolean).length;
    return lines > 1;
  }

  protected _renderBase(inner: TemplateResult): TemplateResult {
    return html`<div
      part="base"
      class=${classMap({ base: true, "two-line": this._isTwoLine() })}
    >
      ${inner}
    </div>`;
  }

  protected _renderInner(): TemplateResult {
    return html`
      ${this._renderStart()}
      <div part="content" class="content">
        <slot name="overline"></slot>
        <slot class="default"></slot>
        <slot name="headline">${this.headline ?? nothing}</slot>
        <slot name="supporting-text">${this.supportingText ?? nothing}</slot>
      </div>
      <div class="trailing">
        <slot name="trailing-supporting-text"></slot>
      </div>
      ${this._renderEnd()}
    `;
  }

  static styles: CSSResultGroup = [
    HaRowItem.styles,
    css`
      :host {
        --ha-icon-display: block;
      }
      /* Disabled rows fade out instead of switching to the disabled color. */
      :host([disabled]) {
        color: var(--primary-text-color);
      }
      .base {
        gap: var(--ha-combo-box-item-gap, var(--ha-space-4));
        padding-block: var(
          --ha-combo-box-item-padding-block,
          var(--ha-space-3)
        );
        padding-inline-start: var(
          --ha-combo-box-item-padding-inline-start,
          var(--ha-space-4)
        );
        padding-inline-end: var(
          --ha-combo-box-item-padding-inline-end,
          var(--ha-space-4)
        );
        min-height: var(--ha-combo-box-item-min-height, 48px);
        border-radius: inherit;
        overflow: hidden;
      }
      .base.two-line {
        min-height: var(--ha-combo-box-item-two-line-min-height, 64px);
      }
      :host([border-top]) .base {
        border-top: 1px solid var(--divider-color);
      }
      :host([disabled]) .base {
        opacity: var(--ha-combo-box-item-disabled-opacity, 0.3);
      }
      .start,
      .end {
        gap: inherit;
      }
      .start {
        color: var(
          --ha-combo-box-item-start-color,
          var(--secondary-text-color)
        );
        --state-icon-color: var(--secondary-text-color);
      }
      .end {
        color: var(--ha-combo-box-item-end-color, var(--secondary-text-color));
      }
      .start ::slotted(*),
      .end ::slotted(*) {
        fill: currentColor;
      }
      /* Slotted trailing content lays out as items of the row itself. */
      .trailing {
        display: contents;
        color: var(--secondary-text-color);
        font-size: var(--ha-font-size-xs);
        font-weight: var(--ha-font-weight-medium);
        line-height: var(--ha-line-height-normal);
      }
      .content {
        overflow: hidden;
      }
      .content ::slotted(*) {
        overflow: hidden;
        text-overflow: ellipsis;
      }
      slot[name="overline"] {
        /* mimicing a floating label of mdc-select */
        line-height: 1.15rem;
        font-size: calc(var(--mdc-typography-subtitle1-font-size, 1rem) * 0.75);
        font-weight: var(--mdc-typography-subtitle1-font-weight, 400);
        font-family: var(
          --mdc-typography-subtitle1-font-family,
          var(--mdc-typography-font-family)
        );
        color: var(--mdc-select-label-ink-color, rgba(0, 0, 0, 0.6));
      }
      slot.default,
      slot[name="headline"] {
        color: var(
          --ha-combo-box-item-headline-color,
          var(--primary-text-color)
        );
        font-weight: var(
          --ha-combo-box-item-headline-font-weight,
          var(--ha-font-weight-normal)
        );
        line-height: var(--ha-line-height-normal);
        font-size: var(--ha-font-size-m);
        white-space: nowrap;
      }
      slot.default {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      slot[name="supporting-text"] {
        color: var(--secondary-text-color);
        line-height: var(--ha-line-height-normal);
        font-size: var(--ha-font-size-s);
        white-space: nowrap;
      }
      :host([multiline]) slot.default,
      :host([multiline]) slot[name="headline"],
      :host([multiline]) slot[name="supporting-text"] {
        white-space: normal;
      }
      ::slotted(state-badge),
      ::slotted(img),
      ::slotted(ha-app-icon) {
        width: 32px;
        height: 32px;
      }
      ::slotted(ha-app-icon.colored) {
        width: 24px;
        height: 24px;
        padding: var(--ha-space-1);
        border-radius: var(--ha-border-radius-circle);
        background-color: var(--app-icon-background-color);
        color: var(--white-color);
      }
      ::slotted(.code) {
        font-family: var(--ha-font-family-code);
        font-size: var(--ha-font-size-xs);
      }
      ::slotted(.domain) {
        font-size: var(--ha-font-size-s);
        font-weight: var(--ha-font-weight-normal);
        line-height: var(--ha-line-height-normal);
        align-self: flex-end;
        max-width: 30%;
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-combo-box-item": HaComboBoxItem;
  }
}
