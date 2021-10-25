import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "./ha-button-menu";
import "@material/mwc-list/mwc-list-item";
import "@material/mwc-icon-button";
import "./ha-svg-icon";
import { mdiDotsVertical } from "@mdi/js";
import { HomeAssistant } from "../types";
import "@polymer/paper-tooltip/paper-tooltip";

export interface IconOverflowMenuItem {
  [key: string]: any;
  path: string;
  label: string;
  narrowOnly?: boolean;
  disabled?: boolean;
  tooltip?: string;
  onClick: CallableFunction;
}

@customElement("ha-icon-overflow-menu")
export class HaIconOverflowMenu extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Array }) public items: IconOverflowMenuItem[] = [];

  @property({ type: Boolean }) public narrow = false;

  protected render(): TemplateResult {
    return html`
      ${this.narrow
        ? html` <!-- Collapsed Representation for Small Screens -->
            <ha-button-menu
              @click=${this._handleIconOverflowMenuOpened}
              @closed=${this._handleIconOverflowMenuClosed}
              class="ha-icon-overflow-menu-overflow"
              corner="BOTTOM_START"
              absolute
            >
              <mwc-icon-button
                .title=${this.hass.localize("ui.common.menu")}
                .label=${this.hass.localize("ui.common.overflow_menu")}
                slot="trigger"
              >
                <ha-svg-icon .path=${mdiDotsVertical}></ha-svg-icon>
              </mwc-icon-button>

              ${this.items.map(
                (item) => html`
                  <mwc-list-item
                    graphic="icon"
                    .disabled=${item.disabled}
                    @click=${item.action}
                  >
                    <div slot="graphic">
                      <ha-svg-icon .path=${item.path}></ha-svg-icon>
                    </div>
                    ${item.label}
                  </mwc-list-item>
                `
              )}
            </ha-button-menu>`
        : html`
            <!-- Icon Representation for Big Screens -->

            ${this.items.map((item) =>
              item.narrowOnly
                ? ""
                : html`<div>
                    ${item.tooltip
                      ? html`<paper-tooltip animation-delay="0" position="left">
                          ${item.tooltip}
                        </paper-tooltip>`
                      : ""}
                    <mwc-icon-button
                      @click=${item.action}
                      .label=${item.label}
                      .disabled=${item.disabled}
                    >
                      <ha-svg-icon .path=${item.path}></ha-svg-icon>
                    </mwc-icon-button>
                  </div> `
            )}
          `}
    `;
  }

  protected _handleIconOverflowMenuOpened() {
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
    return css`
      :host {
        display: flex;
        justify-content: flex-end;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-icon-overflow-menu": HaIconOverflowMenu;
  }
}
