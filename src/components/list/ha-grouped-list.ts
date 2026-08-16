import type { TemplateResult } from "lit";
import { css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { HaListBase } from "./ha-list-base";

/**
 * @element ha-grouped-list
 * @extends {HaListBase}
 *
 * @summary
 * Grouped list: an optional header above a framed box of rows separated by
 * hairlines — the "grouped list" idiom of settings and detail views. Items
 * are `<ha-list-item-*>` rows; use `ha-list-item-value` for label/value
 * facts and `ha-list-item-button` for navigable rows.
 *
 * @slot - List items (`<ha-list-item-*>`).
 *
 * @csspart header - The header above the frame.
 * @csspart base - The framed `<div role="list">`.
 *
 * @cssprop --ha-row-item-padding-inline - Horizontal padding of the rows, which the header aligns to. Defaults to `--ha-space-3`.
 *
 * @attr {string} header - Header text rendered above the frame.
 */
@customElement("ha-grouped-list")
export class HaGroupedList extends HaListBase {
  // The frame carries the list role so the header stays out of the list
  // semantics.
  protected override readonly hostRole = "";

  @property({ type: String }) public header?: string;

  protected override render(): TemplateResult {
    return html`
      ${
        this.header
          ? html`<div part="header" class="header" id="header">
              ${this.header}
            </div>`
          : nothing
      }
      <div
        part="base"
        class="base"
        role="list"
        aria-labelledby=${ifDefined(this.header ? "header" : undefined)}
      >
        <slot></slot>
      </div>
    `;
  }

  static styles = [
    ...HaListBase.styles,
    css`
      :host {
        --ha-row-item-padding-inline: var(--ha-space-3);
      }

      .header {
        margin: 0 0 var(--ha-space-1);
        margin-inline-start: calc(
          var(--ha-row-item-padding-inline) + var(--ha-border-width-sm)
        );
        font-size: var(--ha-font-size-m);
        font-weight: var(--ha-font-weight-medium);
        color: var(--secondary-text-color);
      }

      .base {
        border: var(--ha-border-width-sm) solid var(--divider-color);
        border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg));
        overflow: hidden;
      }

      ::slotted(:not(:first-child)) {
        border-top: var(--ha-border-width-sm) solid var(--divider-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-grouped-list": HaGroupedList;
  }
}
