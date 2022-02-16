import "@material/mwc-list/mwc-list-item";
import { mdiDotsVertical } from "@mdi/js";
import "@lrnwebcomponents/simple-tooltip/simple-tooltip";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { haStyle } from "../resources/styles";
import { HomeAssistant } from "../types";
import "./ha-button-menu";
import "./ha-icon-button";
import "./ha-svg-icon";

export interface IconOverflowMenuItem {
  [key: string]: any;
  path: string;
  label: string;
  narrowOnly?: boolean;
  disabled?: boolean;
  tooltip?: string;
  action: () => any;
  warning?: boolean;
  divider?: boolean;
}

@customElement("ha-icon-overflow-menu")
export class HaIconOverflowMenu extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Array }) public items: IconOverflowMenuItem[] = [];

  @property({ type: Boolean }) public narrow = false;

  protected render(): TemplateResult {
    return html`
      ${this.narrow
        ? html` <!-- Collapsed representation for small screens -->
            <ha-button-menu
              @click=${this._handleIconOverflowMenuOpened}
              @closed=${this._handleIconOverflowMenuClosed}
              class="ha-icon-overflow-menu-overflow"
              absolute
            >
              <ha-icon-button
                .label=${this.hass.localize("ui.common.overflow_menu")}
                .path=${mdiDotsVertical}
                slot="trigger"
              ></ha-icon-button>

              ${this.items.map((item) =>
                item.divider
                  ? html`<li divider role="separator"></li>`
                  : html`<mwc-list-item
                      graphic="icon"
                      ?disabled=${item.disabled}
                      @click=${item.action}
                      class=${classMap({ warning: Boolean(item.warning) })}
                    >
                      <div slot="graphic">
                        <ha-svg-icon
                          class=${classMap({ warning: Boolean(item.warning) })}
                          .path=${item.path}
                        ></ha-svg-icon>
                      </div>
                      ${item.label}
                    </mwc-list-item> `
              )}
            </ha-button-menu>`
        : html`
            <!-- Icon representation for big screens -->
            ${this.items.map((item) =>
              item.narrowOnly
                ? ""
                : item.divider
                ? html`<div role="separator"></div>`
                : html`<div>
                    ${item.tooltip
                      ? html`<simple-tooltip
                          animation-delay="0"
                          position="left"
                        >
                          ${item.tooltip}
                        </simple-tooltip>`
                      : ""}
                    <ha-icon-button
                      @click=${item.action}
                      .label=${item.label}
                      .path=${item.path}
                      ?disabled=${item.disabled}
                    ></ha-icon-button>
                  </div> `
            )}
          `}
    `;
  }

  protected _handleIconOverflowMenuOpened(e) {
    e.stopPropagation();
    // If this component is used inside a data table, the z-index of the row
    // needs to be increased. Otherwise the ha-button-menu would be displayed
    // underneath the next row in the table.
    const row = this.closest(".mdc-data-table__row") as HTMLDivElement | null;
    if (row) {
      row.style.zIndex = "1";
    }
  }

  protected _handleIconOverflowMenuClosed() {
    const row = this.closest(".mdc-data-table__row") as HTMLDivElement | null;
    if (row) {
      row.style.zIndex = "";
    }
  }

  static get styles() {
    return [
      haStyle,
      css`
        :host {
          display: flex;
          justify-content: flex-end;
        }
        li[role="separator"] {
          border-bottom-color: var(--divider-color);
        }
        div[role="separator"] {
          border-right: 1px solid var(--divider-color);
          width: 1px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-icon-overflow-menu": HaIconOverflowMenu;
  }
}
