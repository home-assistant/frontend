import { mdiClose, mdiDotsVertical } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import "../../../../components/ha-card";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-md-button-menu";
import "../../../../components/ha-md-divider";
import "../../../../components/ha-md-menu-item";
import type { HomeAssistant } from "../../../../types";
import "../ha-automation-editor-warning";

export interface SidebarOverflowMenuEntry {
  clickAction: () => void;
  disabled?: boolean;
  label: string;
  icon?: string;
  danger?: boolean;
}

export type SidebarOverflowMenu = (SidebarOverflowMenuEntry | "separator")[];

@customElement("ha-automation-sidebar-card")
export default class HaAutomationSidebarCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, attribute: "wide" }) public isWide = false;

  @property({ type: Boolean, attribute: "yaml-mode" }) public yamlMode = false;

  @property({ attribute: false }) public menuEntries: SidebarOverflowMenu = [];

  @property({ attribute: false }) public warnings?: string[];

  protected render() {
    return html`
      <ha-card
        outlined
        class=${classMap({
          mobile: !this.isWide,
          yaml: this.yamlMode,
        })}
      >
        <ha-dialog-header>
          <ha-icon-button
            slot="navigationIcon"
            .label=${this.hass.localize("ui.common.close")}
            .path=${mdiClose}
            @click=${this._closeSidebar}
          ></ha-icon-button>
          <slot slot="title" name="title"></slot>
          <slot slot="subtitle" name="subtitle"></slot>
          ${this.menuEntries.filter((entry) => entry !== "separator").length
            ? html`
                <ha-md-button-menu
                  slot="actionItems"
                  @click=${this._openOverflowMenu}
                  @keydown=${stopPropagation}
                  @closed=${stopPropagation}
                  positioning="fixed"
                >
                  <ha-icon-button
                    slot="trigger"
                    .label=${this.hass.localize("ui.common.menu")}
                    .path=${mdiDotsVertical}
                  ></ha-icon-button>
                  ${this.menuEntries.map((menuEntry) =>
                    menuEntry !== "separator"
                      ? html`
                          <ha-md-menu-item
                            .clickAction=${menuEntry.clickAction}
                            .disabled=${!!menuEntry.disabled}
                            class=${menuEntry.danger ? "warning" : ""}
                          >
                            ${menuEntry.label}
                            ${menuEntry.icon
                              ? html`<ha-svg-icon
                                  slot="start"
                                  .path=${menuEntry.icon}
                                ></ha-svg-icon>`
                              : nothing}
                          </ha-md-menu-item>
                        `
                      : html`
                          <ha-md-divider
                            role="separator"
                            tabindex="-1"
                          ></ha-md-divider>
                        `
                  )}
                </ha-md-button-menu>
              `
            : nothing}
        </ha-dialog-header>
        ${this.warnings
          ? html`<ha-automation-editor-warning
              .localize=${this.hass.localize}
              .warnings=${this.warnings}
            >
            </ha-automation-editor-warning>`
          : nothing}
        <div class="card-content">
          <slot></slot>
        </div>
      </ha-card>
    `;
  }

  private _closeSidebar() {
    fireEvent(this, "close-sidebar");
  }

  private _openOverflowMenu(ev: MouseEvent) {
    ev.stopPropagation();
    ev.preventDefault();
  }

  static styles = css`
    ha-card {
      height: 100%;
      width: 100%;
      border-color: var(--primary-color);
      border-width: 2px;
      display: block;
    }
    ha-card.mobile {
      border-bottom-right-radius: var(--ha-border-radius-square);
      border-bottom-left-radius: var(--ha-border-radius-square);
    }

    @media all and (max-width: 870px) {
      ha-card.mobile {
        max-height: 70vh;
        max-height: 70dvh;
        border-width: 2px 2px 0;
      }
      ha-card.mobile.yaml {
        height: 70vh;
        height: 70dvh;
      }
    }

    ha-dialog-header {
      border-radius: var(--ha-card-border-radius);
    }

    .card-content {
      max-height: calc(100% - 80px);
      overflow: auto;
    }

    @media (min-width: 450px) and (min-height: 500px) {
      .card-content {
        max-height: calc(100% - 104px);
        overflow: auto;
      }
    }

    @media all and (max-width: 870px) {
      ha-card.mobile .card-content {
        max-height: calc(
          70vh - 88px - max(var(--safe-area-inset-bottom), 16px)
        );
        max-height: calc(
          70dvh - 88px - max(var(--safe-area-inset-bottom), 16px)
        );
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-sidebar-card": HaAutomationSidebarCard;
  }
}
