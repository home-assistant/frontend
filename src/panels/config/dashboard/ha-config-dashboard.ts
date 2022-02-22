import {
  mdiCloudLock,
  mdiDotsVertical,
  mdiLightbulbOutline,
  mdiMagnify,
  mdiNewBox,
} from "@mdi/js";
import "@material/mwc-list/mwc-list-item";
import type { ActionDetail } from "@material/mwc-list";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import "../../../components/ha-card";
import "../../../components/ha-icon-next";
import "../../../components/ha-icon-button";
import "../../../components/ha-menu-button";
import "../../../components/ha-button-menu";
import "../../../components/ha-svg-icon";
import { CloudStatus } from "../../../data/cloud";
import {
  refreshSupervisorAvailableUpdates,
  SupervisorAvailableUpdates,
} from "../../../data/supervisor/root";
import { showQuickBar } from "../../../dialogs/quick-bar/show-dialog-quick-bar";
import "../../../layouts/ha-app-layout";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import "../ha-config-section";
import { configSections } from "../ha-panel-config";
import "./ha-config-navigation";
import "./ha-config-updates";
import { fireEvent } from "../../../common/dom/fire_event";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import { showToast } from "../../../util/toast";
import { documentationUrl } from "../../../util/documentation-url";

@customElement("ha-config-dashboard")
class HaConfigDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true })
  public narrow!: boolean;

  @property() public isWide!: boolean;

  @property() public cloudStatus?: CloudStatus;

  // null means not available
  @property() public supervisorUpdates?: SupervisorAvailableUpdates[] | null;

  @property() public showAdvanced!: boolean;

  private _notifyUpdates = false;

  protected render(): TemplateResult {
    return html`
      <ha-app-layout>
        <app-header fixed slot="header">
          <app-toolbar>
            <ha-menu-button
              .hass=${this.hass}
              .narrow=${this.narrow}
            ></ha-menu-button>
            <div main-title>${this.hass.localize("panel.config")}</div>
            <ha-icon-button
              .path=${mdiMagnify}
              @click=${this._showQuickBar}
            ></ha-icon-button>
            <ha-button-menu
              corner="BOTTOM_START"
              @action=${this._handleMenuAction}
              activatable
            >
              <ha-icon-button
                slot="trigger"
                .label=${this.hass.localize("ui.common.menu")}
                .path=${mdiDotsVertical}
              ></ha-icon-button>

              <mwc-list-item>
                ${this.hass.localize("ui.panel.config.updates.check_updates")}
              </mwc-list-item>
            </ha-button-menu>
          </app-toolbar>
        </app-header>

        <ha-config-section
          .narrow=${this.narrow}
          .isWide=${this.isWide}
          full-width
        >
          ${this.supervisorUpdates === undefined
            ? // Hide everything until updates loaded
              html``
            : html`${this.supervisorUpdates?.length
                  ? html`<ha-card>
                      <ha-config-updates
                        .hass=${this.hass}
                        .narrow=${this.narrow}
                        .supervisorUpdates=${this.supervisorUpdates}
                      ></ha-config-updates>
                    </ha-card>`
                  : ""}
                <ha-card>
                  ${this.narrow && this.supervisorUpdates?.length
                    ? html`<div class="title">
                        ${this.hass.localize("panel.config")}
                      </div>`
                    : ""}
                  ${this.cloudStatus && isComponentLoaded(this.hass, "cloud")
                    ? html`
                        <ha-config-navigation
                          .hass=${this.hass}
                          .narrow=${this.narrow}
                          .showAdvanced=${this.showAdvanced}
                          .pages=${[
                            {
                              component: "cloud",
                              path: "/config/cloud",
                              name: "Home Assistant Cloud",
                              info: this.cloudStatus,
                              iconPath: mdiCloudLock,
                              iconColor: "#3B808E",
                            },
                          ]}
                        ></ha-config-navigation>
                      `
                    : ""}
                  <ha-config-navigation
                    .hass=${this.hass}
                    .narrow=${this.narrow}
                    .showAdvanced=${this.showAdvanced}
                    .pages=${configSections.dashboard}
                  ></ha-config-navigation>
                </ha-card>`}
          <div class="tips">
            <ha-svg-icon .path=${mdiLightbulbOutline}></ha-svg-icon>
            <span class="tip-word">Tip!</span>
            <span class="text">
              ${this.hass.localize(
                "ui.panel.config.tips.join",
                "forums",
                html`<a
                  href=${documentationUrl(this.hass, `/community`)}
                  target="_blank"
                  rel="noreferrer"
                  >Forums</a
                >`,
                "twitter",
                html`<a
                  href=${documentationUrl(this.hass, `/twitter`)}
                  target="_blank"
                  rel="noreferrer"
                  >Twitter</a
                >`,
                "discord",
                html`<a
                  href=${documentationUrl(this.hass, `/join-chat`)}
                  target="_blank"
                  rel="noreferrer"
                  >Chat</a
                >`,
                "blog",
                html`<a
                  href=${documentationUrl(this.hass, `/blog`)}
                  target="_blank"
                  rel="noreferrer"
                  >Blog</a
                >`,
                "newsletter",
                html`<a
                    href=${documentationUrl(this.hass, `/newsletter`)}
                    target="_blank"
                    rel="noreferrer"
                    >Newsletter</a
                  >
                  <ha-svg-icon class="new" .path=${mdiNewBox}></ha-svg-icon>`
              )}
            </span>
          </div>
        </ha-config-section>
      </ha-app-layout>
    `;
  }

  protected override updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    if (!changedProps.has("supervisorUpdates") || !this._notifyUpdates) {
      return;
    }
    this._notifyUpdates = false;
    if (this.supervisorUpdates?.length) {
      showToast(this, {
        message: this.hass.localize(
          "ui.panel.config.updates.updates_refreshed"
        ),
      });
    } else {
      showToast(this, {
        message: this.hass.localize("ui.panel.config.updates.no_new_updates"),
      });
    }
  }

  private _showQuickBar(): void {
    showQuickBar(this, {
      commandMode: true,
      hint: this.hass.localize("ui.dialogs.quick-bar.key_c_hint"),
    });
  }

  private async _handleMenuAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        if (isComponentLoaded(this.hass, "hassio")) {
          this._notifyUpdates = true;
          await refreshSupervisorAvailableUpdates(this.hass);
          fireEvent(this, "ha-refresh-supervisor");
          return;
        }
        showAlertDialog(this, {
          title: this.hass.localize(
            "ui.panel.config.updates.check_unavailable.title"
          ),
          text: this.hass.localize(
            "ui.panel.config.updates.check_unavailable.description"
          ),
          warning: true,
        });
        break;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-card:last-child {
          margin-bottom: env(safe-area-inset-bottom);
        }
        :host(:not([narrow])) ha-card:last-child {
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

        .tips {
          text-align: center;
        }

        .tips .text {
          color: var(--secondary-text-color);
        }

        .tip-word {
          font-weight: 500;
        }

        .new {
          color: var(--primary-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-dashboard": HaConfigDashboard;
  }
}
