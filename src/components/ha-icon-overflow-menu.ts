import { mdiDotsVertical } from "@mdi/js";
import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { haStyle } from "../resources/styles";
import type { HomeAssistant } from "../types";
import "./ha-md-button-menu";
import "./ha-icon-button";
import "./ha-svg-icon";
import "./ha-tooltip";
import "./ha-md-menu-item";
import "./ha-md-divider";

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
            <ha-md-button-menu
              @click=${this._handleIconOverflowMenuOpened}
              positioning="popover"
            >
              <ha-icon-button
                .label=${this.hass.localize("ui.common.overflow_menu")}
                .path=${mdiDotsVertical}
                slot="trigger"
              ></ha-icon-button>

              ${this.items.map((item) =>
                item.divider
                  ? html`<ha-md-divider
                      role="separator"
                      tabindex="-1"
                    ></ha-md-divider>`
                  : html`<ha-md-menu-item
                      ?disabled=${item.disabled}
                      .clickAction=${item.action}
                      class=${classMap({ warning: Boolean(item.warning) })}
                    >
                      <ha-svg-icon
                        slot="start"
                        class=${classMap({ warning: Boolean(item.warning) })}
                        .path=${item.path}
                      ></ha-svg-icon>
                      ${item.label}
                    </ha-md-menu-item> `
              )}
            </ha-md-button-menu>`
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
