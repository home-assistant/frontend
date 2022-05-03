import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { canShowPage } from "../../../common/config/can_show_page";
import "../../../components/ha-card";
import "../../../components/ha-tip";
import "../../../components/ha-navigation-list";
import { CloudStatus } from "../../../data/cloud";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
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
        <mwc-button
          slot="toolbar-icon"
          .label=${this.hass.localize(
            "ui.panel.config.system_dashboard.restart_homeassistant_short"
          )}
          @click=${this._restart}
        ></mwc-button>
        <ha-config-section
          .narrow=${this.narrow}
          .isWide=${this.isWide}
          full-width
        >
          <ha-card outlined>
            <ha-navigation-list
              .hass=${this.hass}
              .narrow=${this.narrow}
              .pages=${pages}
            ></ha-navigation-list>
          </ha-card>
          ${this.hass.userData?.showAdvanced
            ? html`<ha-tip>
                Looking for YAML Configuration? It has moved to
                <a href="/developer-tools/yaml">Developer Tools</a>
              </ha-tip>`
            : ""}
        </ha-config-section>
      </hass-subpage>
    `;
  }

  private _restart() {
    showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.system_dashboard.confirm_restart_title"
      ),
      text: this.hass.localize(
        "ui.panel.config.system_dashboard.confirm_restart_text"
      ),
      confirmText: this.hass.localize(
        "ui.panel.config.system_dashboard.restart_homeassistant_short"
      ),
      confirm: () => {
        this.hass.callService("homeassistant", "restart").catch((reason) => {
          showAlertDialog(this, {
            title: this.hass.localize(
              "ui.panel.config.system_dashboard.restart_error"
            ),
            text: reason.message,
          });
        });
      },
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
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
          margin-bottom: 24px;
          margin-bottom: max(24px, env(safe-area-inset-bottom));
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

        @media all and (max-width: 600px) {
          ha-card {
            border-width: 1px 0;
            border-radius: 0;
            box-shadow: unset;
          }
          ha-config-section {
            margin-top: -42px;
          }
        }

        ha-navigation-list {
          --navigation-list-item-title-font-size: 16px;
          --navigation-list-item-padding: 4px;
        }
        ha-tip {
          margin-bottom: max(env(safe-area-inset-bottom), 8px);
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
