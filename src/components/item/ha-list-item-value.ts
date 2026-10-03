import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { HaListItemBase } from "./ha-list-item-base";

/**
 * @element ha-list-item-value
 * @extends {HaListItemBase}
 *
 * @summary
 * Non-interactive label/value row for grouped lists: label on the start
 * side, value content end-aligned. The value is the default slot so callers
 * can render rich content (links, secondary lines).
 *
 * @slot - The value content.
 *
 * @csspart label - The label column.
 * @csspart value - The value column.
 *
 * @cssprop --ha-list-item-value-max-width - Maximum width of the value column. Defaults to 60%.
 *
 * @attr {string} label - The row label.
 */
@customElement("ha-list-item-value")
export class HaListItemValue extends HaListItemBase {
  @property({ type: String }) public label?: string;

  protected override _renderInner(): TemplateResult {
    return html`
      <div part="label" class="label">${this.label}</div>
      <div part="value" class="value"><slot></slot></div>
    `;
  }

  static styles: CSSResultGroup = [
    HaListItemBase.styles,
    css`
      :host {
        --ha-row-item-padding-block: var(--ha-space-2);
        --ha-row-item-min-height: 40px;
      }

      .label {
        flex: 1;
        color: var(--secondary-text-color);
      }

      .value {
        max-width: var(--ha-list-item-value-max-width, 60%);
        min-width: 0;
        text-align: end;
        overflow-wrap: anywhere;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-list-item-value": HaListItemValue;
  }
}
