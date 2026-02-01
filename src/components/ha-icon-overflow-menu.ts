import "@home-assistant/webawesome/dist/components/divider/divider";
import { mdiDotsVertical } from "@mdi/js";
import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { stopPropagation } from "../common/dom/stop_propagation";
import { haStyle } from "../resources/styles";
import type { HomeAssistant } from "../types";
import "./ha-dropdown";
import "./ha-dropdown-item";
import "./ha-icon-button";
import "./ha-md-divider";
import "./ha-svg-icon";
import "./ha-tooltip";

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

  protected render(): TemplateResult | typeof nothing {
    if (this.items.length === 0) {
      return nothing;
    }
    return html`
      ${this.narrow
        ? html` <!-- Collapsed representation for small screens -->
            <ha-dropdown
              @wa-show=${this._handleIconOverflowMenuOpened}
              @click=${stopPropagation}
            >
              <ha-icon-button
                .label=${this.hass.localize("ui.common.overflow_menu")}
                .path=${mdiDotsVertical}
                slot="trigger"
              ></ha-icon-button>

              ${this.items.map((item) =>
                item.divider
                  ? html`<wa-divider></wa-divider>`
                  : html`<ha-dropdown-item
                      ?disabled=${item.disabled}
                      @click=${item.action}
                      variant=${item.warning ? "danger" : "default"}
                    >
                      <ha-svg-icon slot="icon" .path=${item.path}></ha-svg-icon>
                      ${item.label}
                    </ha-dropdown-item>`
              )}
            </ha-dropdown>`
        : html`
            <!-- Icon representation for big screens -->
            ${this.items.map((item) =>
              item.narrowOnly
                ? nothing
                : item.divider
                  ? html`<div role="separator"></div>`
                  : html`<ha-tooltip
                        .disabled=${!item.tooltip}
                        .for="icon-button-${item.label}"
                        >${item.tooltip ?? ""} </ha-tooltip
                      ><ha-icon-button
                        .id="icon-button-${item.label}"
                        @click=${item.action}
                        .label=${item.label}
                        .path=${item.path}
                        ?disabled=${item.disabled}
                      ></ha-icon-button> `
            )}
          `}
    `;
  }

  protected _handleIconOverflowMenuOpened(e) {
    e.stopPropagation();
  }

  static get styles() {
    return [
      haStyle,
      css`
        :host {
          display: flex;
          justify-content: flex-end;
          cursor: initial;
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
