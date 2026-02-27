import { mdiContentSave } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../../../common/dom/fire_event";
import { navigate } from "../../../../common/navigate";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import "../../../../components/ha-fab";
import "../../../../components/ha-spinner";
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-textarea";
import type {
  LovelaceConfig,
  LovelaceRawConfig,
} from "../../../../data/lovelace/config/types";
import {
  isStrategyDashboard,
  saveConfig,
} from "../../../../data/lovelace/config/types";
import type { LovelaceDashboard } from "../../../../data/lovelace/dashboard";
import {
  createDashboard,
  generateDashboardWithAI,
} from "../../../../data/lovelace/dashboard";
import "../../../../layouts/hass-subpage";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { checkLovelaceConfig } from "../../../lovelace/common/check-lovelace-config";
import { generateLovelaceDashboardStrategy } from "../../../lovelace/strategies/get-strategy";
import type { Lovelace } from "../../../lovelace/types";
import "../../../lovelace/views/hui-view";
import "../../../lovelace/views/hui-view-background";
import "../../../lovelace/views/hui-view-container";
import "../../automation/sidebar/ha-automation-sidebar-card";
import { showDashboardDetailDialog } from "./show-dialog-lovelace-dashboard-detail";

declare global {
  interface HASSDomEvents {
    "lovelace-dashboard-created": {
      dashboard: LovelaceDashboard;
    };
  }
}

@customElement("ha-config-lovelace-generate-dashboard")
export class HaConfigLovelaceGenerateDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @state() private _prompt = "";

  @state() private _generating = false;

  @state() private _error?: string;

  @state() private _generatedConfig?: LovelaceRawConfig;

  @state() private _lovelace?: Lovelace;

  public firstUpdated() {
    this.hass.loadFragmentTranslation("lovelace");
  }

  protected render() {
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config/lovelace/dashboards"
        .header=${this.hass.localize(
          "ui.panel.config.lovelace.dashboards.generate.title"
        )}
      >
        <div class="layout ${classMap({ "has-sidebar": !this.narrow })}">
          <div class="content-wrapper">
            <div class="content">
              <hui-view-container .hass=${this.hass}>
                <hui-view-background .hass=${this.hass}></hui-view-background>
                ${this._lovelace
                  ? html`
                      <hui-view
                        .hass=${this.hass}
                        .narrow=${this.narrow}
                        .lovelace=${this._lovelace}
                        .index=${0}
                      ></hui-view>
                    `
                  : html`
                      <div class="empty-state">
                        <h2>
                          ${this.hass.localize(
                            "ui.panel.config.lovelace.dashboards.generate.empty_title"
                          )}
                        </h2>
                        <p>
                          ${this.hass.localize(
                            "ui.panel.config.lovelace.dashboards.generate.empty_description"
                          )}
                        </p>
                      </div>
                    `}
                ${this._generating
                  ? html`
                      <div class="loading-overlay">
                        <ha-spinner size="large"></ha-spinner>
                      </div>
                    `
                  : nothing}
              </hui-view-container>
            </div>
            <div class="fab-positioner">
              <ha-fab
                class=${classMap({ dirty: Boolean(this._generatedConfig) })}
                .label=${this.hass.localize("ui.common.save")}
                .disabled=${!this._generatedConfig || this._generating}
                extended
                @click=${this._saveGeneratedDashboard}
              >
                <ha-svg-icon slot="icon" .path=${mdiContentSave}></ha-svg-icon>
              </ha-fab>
            </div>
          </div>

          <div class="sidebar-positioner">
            <ha-automation-sidebar-card
              .hass=${this.hass}
              .isWide=${this.isWide}
              .narrow=${this.narrow}
              @close-sidebar=${this._closeSidebar}
            >
              <span slot="title">
                ${this.hass.localize(
                  "ui.panel.config.lovelace.dashboards.generate.sidebar_title"
                )}
              </span>
              <span slot="subtitle">
                ${this.hass.localize(
                  "ui.panel.config.lovelace.dashboards.generate.sidebar_subtitle"
                )}
              </span>

              <div class="sidebar-content">
                <ha-textarea
                  .label=${this.hass.localize(
                    "ui.panel.config.lovelace.dashboards.generate.prompt"
                  )}
                  .value=${this._prompt}
                  ?disabled=${this._generating}
                  ?autogrow=${true}
                  @input=${this._promptChanged}
                ></ha-textarea>

                ${this._error
                  ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
                  : nothing}

                <ha-button
                  variant="primary"
                  .disabled=${this._generating || !this._prompt.trim()}
                  @click=${this._generateDashboard}
                >
                  ${this.hass.localize(
                    this._generatedConfig
                      ? "ui.panel.config.lovelace.dashboards.generate.regenerate"
                      : "ui.panel.config.lovelace.dashboards.generate.generate"
                  )}
                </ha-button>
              </div>
            </ha-automation-sidebar-card>
          </div>
        </div>
      </hass-subpage>
    `;
  }

  private _promptChanged(ev: Event) {
    this._prompt = (ev.target as HTMLTextAreaElement).value;
  }

  private _closeSidebar = () => {
    navigate("/config/lovelace/dashboards");
  };

  private _createLovelace(
    rawConfig: LovelaceRawConfig,
    config: LovelaceConfig
  ): Lovelace {
    return {
      config,
      rawConfig,
      editMode: false,
      urlPath: "lovelace-ai-preview",
      mode: "generated",
      locale: this.hass.locale,
      enableFullEditMode: () => undefined,
      saveConfig: async () => undefined,
      deleteConfig: async () => undefined,
      setEditMode: () => undefined,
      showToast: () => undefined,
    };
  }

  private async _generateDashboard() {
    if (this._generating) {
      return;
    }

    const prompt = this._prompt.trim();
    if (!prompt) {
      return;
    }

    this._generating = true;
    this._error = undefined;
    try {
      const result = await generateDashboardWithAI(this.hass, prompt);
      const rawConfig = result.config;
      const generatedConfig = isStrategyDashboard(rawConfig)
        ? await generateLovelaceDashboardStrategy(rawConfig, this.hass)
        : rawConfig;
      const config = checkLovelaceConfig(generatedConfig) as LovelaceConfig;
      this._generatedConfig = rawConfig;
      this._lovelace = this._createLovelace(rawConfig, config);
    } catch (err: any) {
      this._error = err?.message || this.hass.localize("ui.common.error");
      console.error("Error generating Lovelace dashboard:", err);
    } finally {
      this._generating = false;
    }
  }

  private _saveGeneratedDashboard() {
    if (!this._generatedConfig) {
      return;
    }

    const generatedConfig = this._generatedConfig;
    showDashboardDetailDialog(this, {
      updateDashboard: async () => undefined,
      removeDashboard: async () => false,
      createDashboard: async (values) => {
        const dashboard = await createDashboard(this.hass, values);
        await saveConfig(this.hass, dashboard.url_path, generatedConfig);
        fireEvent(this, "lovelace-dashboard-created", { dashboard });
        navigate(`/${dashboard.url_path}`);
      },
    });
  }

  static styles: CSSResultGroup = [
    haStyle,
    css`
      :host {
        display: block;
        --sidebar-width: 0;
        --sidebar-gap: 0;
      }

      .layout.has-sidebar {
        --sidebar-width: min(470px, 42vw);
        --sidebar-gap: var(--ha-space-4);
      }

      .content-wrapper {
        padding-inline-end: calc(var(--sidebar-width) + var(--sidebar-gap));
        min-height: calc(100vh - var(--header-height) - 48px);
      }

      .content {
        position: relative;
        border: 1px solid var(--divider-color);
        border-radius: var(--ha-border-radius-lg);
        overflow: hidden;
        background: var(--primary-background-color);
        min-height: calc(100vh - var(--header-height) - 64px);
      }

      .content hui-view-container {
        display: block;
      }

      .content hui-view {
        display: block;
      }

      .empty-state {
        text-align: center;
        padding: var(--ha-space-12);
        color: var(--secondary-text-color);
      }

      .empty-state h2 {
        margin: 0 0 var(--ha-space-2);
        color: var(--primary-text-color);
      }

      .empty-state p {
        margin: 0;
      }

      .loading-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: color-mix(
          in srgb,
          var(--card-background-color) 74%,
          transparent
        );
        z-index: 2;
      }

      .fab-positioner {
        display: flex;
        justify-content: flex-end;
      }

      .fab-positioner ha-fab {
        position: fixed;
        right: unset;
        left: unset;
        bottom: calc(-80px - var(--safe-area-inset-bottom));
        transition: bottom 0.3s;
      }

      .fab-positioner ha-fab.dirty {
        bottom: calc(16px + var(--safe-area-inset-bottom, 0px));
      }

      .sidebar-positioner {
        display: flex;
        justify-content: flex-end;
      }

      ha-automation-sidebar-card {
        position: fixed;
        top: calc(var(--header-height) + 16px);
        height: calc(-81px + 100vh - var(--safe-area-inset-top, 0px));
        height: calc(-81px + 100dvh - var(--safe-area-inset-top, 0px));
        width: var(--sidebar-width);
        display: block;
      }

      .sidebar-content {
        display: flex;
        flex-direction: column;
        gap: var(--ha-space-4);
        padding: var(--ha-space-4);
      }

      @media all and (max-width: 870px) {
        .content-wrapper {
          padding-inline-end: 0;
          min-height: auto;
        }

        .content {
          min-height: 52vh;
          margin-top: var(--ha-space-4);
        }

        ha-automation-sidebar-card {
          position: static;
          height: auto;
          width: auto;
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-lovelace-generate-dashboard": HaConfigLovelaceGenerateDashboard;
  }
}
