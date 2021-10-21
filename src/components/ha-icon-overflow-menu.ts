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
  disabled?: boolean;
  tooltip?: string;
  onClick: CallableFunction;
}

@customElement("ha-icon-overflow-menu")
export class HaIconOverflowMenu extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Array }) public items: IconOverflowMenuItem[] = [];

  protected render(): TemplateResult {
    return html`
      <div class="ha-overflow-menu">
        <!-- Icon Representation for Big Screens -->
        <div class="ha-icon-overflow-menu-icons">
          ${this.items.map(
            (item) => html`
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
            `
          )}
        </div>

        <!-- Collapsed Representation for Small Screens -->
        <ha-button-menu
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
              <mwc-list-item graphic="icon" .disabled=${item.disabled}>
                <div slot="graphic">
                  <ha-svg-icon .path=${item.path}></ha-svg-icon>
                </div>
                ${item.label}
              </mwc-list-item>
            `
          )}
        </ha-button-menu>
      </div>
    `;
  }

  static get styles() {
    return css`
      :host {
        display: flex;
        justify-content: flex-end;
      }

      .ha-icon-overflow-menu-overflow {
        display: none;
      }

      .ha-icon-overflow-menu-icons {
        display: block;
      }

      @media all and (max-width: 500px) {
        .ha-icon-overflow-menu-overflow {
          display: block;
        }

        .ha-icon-overflow-menu-icons {
          display: none;
        }
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-icon-overflow-menu": HaIconOverflowMenu;
  }
}
