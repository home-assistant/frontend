import { ActionDetail } from "@material/mwc-list";
import { mdiDotsVertical } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { canShowPage } from "../../../common/config/can_show_page";
import "../../../components/ha-card";
import "../../../components/ha-navigation-list";
import { CloudStatus } from "../../../data/cloud";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-subpage";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import "../ha-config-section";
import { configSections } from "../ha-panel-config";

@customElement("ha-config-system-navigation")
class HaConfigSystemNavigation extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true })
  public narrow!: boolean;

  @property({ type: Boolean }) public isWide!: boolean;

  @property({ attribute: false }) public cloudStatus?: CloudStatus;

  @property({ type: Boolean }) public showAdvanced!: boolean;

  protected render(): TemplateResult {
    const pages = configSections.general
      .filter((page) => canShowPage(this.hass, page))
      .map((page) => ({
        ...page,
        name: page.translationKey
          ? this.hass.localize(page.translationKey)
          : page.name,
      }));

    return html`
      <hass-subpage
        back-path="/config"
        .header=${this.hass.localize("ui.panel.config.dashboard.system.main")}
      >
        <ha-button-menu
          corner="BOTTOM_START"
          slot="toolbar-icon"
          @action=${this._handleAction}
        >
          <ha-icon-button
            slot="trigger"
            .label=${this.hass.localize("ui.common.overflow_menu")}
            .path=${mdiDotsVertical}
          ></ha-icon-button>
          <mwc-list-item>
            ${this.hass.localize(
              "ui.panel.config.server_control.section.server_management.restart_home_assistant"
            )}
          </mwc-list-item>
        </ha-button-menu>
        <ha-config-section
          .narrow=${this.narrow}
          .isWide=${this.isWide}
          full-width
        >
          <ha-card outlined>
            ${this.narrow
              ? html`<div class="title">
                  ${this.hass.localize("ui.panel.config.dashboard.system.main")}
                </div>`
              : ""}
            <ha-navigation-list
              .hass=${this.hass}
              .narrow=${this.narrow}
              .pages=${pages}
            ></ha-navigation-list>
          </ha-card>
        </ha-config-section>
      </hass-subpage>
    `;
  }

  private _handleAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        showConfirmationDialog(this, {
          text: this.hass.localize(
            "ui.panel.config.server_control.section.server_management.confirm_restart"
          ),
          confirmText: this.hass!.localize("ui.common.leave"),
          dismissText: this.hass!.localize("ui.common.stay"),
          confirm: () => {
            this.hass.callService("homeassistant", "restart");
          },
        });
        break;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-card {
          margin-bottom: env(safe-area-inset-bottom);
        }
        :host(:not([narrow])) ha-card {
          margin-bottom: max(24px, env(safe-area-inset-bottom));
        }

        ha-config-section {
          margin: auto;
          margin-top: -32px;
          max-width: 600px;
        }

        ha-card {
          overflow: hidden;
        }

        ha-card a {
          text-decoration: none;
          color: var(--primary-text-color);
        }

        .title {
          font-size: 16px;
          padding: 16px;
          padding-bottom: 0;
        }

        :host([narrow]) ha-card {
          border-radius: 0;
          box-shadow: unset;
        }

        :host([narrow]) ha-config-section {
          margin-top: -42px;
        }

        ha-navigation-list {
          --navigation-list-item-title-font-size: 16px;
          --navigation-list-item-padding: 4px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-system-navigation": HaConfigSystemNavigation;
  }
}
