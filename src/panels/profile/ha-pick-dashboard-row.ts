import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../components/ha-divider";
import "../../components/ha-icon";
import "../../components/ha-list-item";
import "../../components/ha-select";
import "../../components/ha-settings-row";
import "../../components/ha-spinner";
import "../../components/ha-svg-icon";
import { saveFrontendUserData } from "../../data/frontend";
import type { LovelaceDashboard } from "../../data/lovelace/dashboard";
import { fetchDashboards } from "../../data/lovelace/dashboard";
import { getPanelIcon, getPanelTitle } from "../../data/panel";
import type { HomeAssistant, PanelInfo } from "../../types";
import { PANEL_DASHBOARDS } from "../config/lovelace/dashboards/ha-config-lovelace-dashboards";

const USE_SYSTEM_VALUE = "___use_system___";

@customElement("ha-pick-dashboard-row")
class HaPickDashboardRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @state() private _dashboards?: LovelaceDashboard[];

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this._getDashboards();
  }

  protected render(): TemplateResult {
    const value = this.hass.userData?.default_panel || USE_SYSTEM_VALUE;
    return html`
      <ha-settings-row .narrow=${this.narrow}>
        <span slot="heading">
          ${this.hass.localize("ui.panel.profile.dashboard.header")}
        </span>
        <span slot="description">
          ${this.hass.localize("ui.panel.profile.dashboard.description")}
        </span>
        ${this._dashboards
          ? html`
              <ha-select
                .label=${this.hass.localize(
                  "ui.panel.profile.dashboard.dropdown_label"
                )}
                .value=${value}
                @selected=${this._dashboardChanged}
                naturalMenuWidth
              >
                <ha-list-item .value=${USE_SYSTEM_VALUE}>
                  ${this.hass.localize("ui.panel.profile.dashboard.system")}
                </ha-list-item>
                <ha-divider></ha-divider>
                ${PANEL_DASHBOARDS.map((panel) => {
                  const panelInfo = this.hass.panels[panel] as
                    | PanelInfo
                    | undefined;
                  if (!panelInfo) {
                    return nothing;
                  }
                  return html`
                    <ha-list-item value=${panelInfo.url_path} graphic="icon">
                      <ha-icon
                        slot="graphic"
                        .icon=${getPanelIcon(panelInfo)}
                      ></ha-icon>
                      ${getPanelTitle(this.hass, panelInfo)}
                    </ha-list-item>
                  `;
                })}
                ${this._dashboards.length
                  ? html`
                      <ha-divider></ha-divider>
                      ${this._dashboards.map((dashboard) => {
                        if (
                          !this.hass.user!.is_admin &&
                          dashboard.require_admin
                        ) {
                          return "";
                        }
                        return html`
                          <ha-list-item
                            .value=${dashboard.url_path}
                            graphic="icon"
                          >
                            <ha-icon
                              slot="graphic"
                              .icon=${dashboard.icon || "mdi:view-dashboard"}
                            ></ha-icon>
                            ${dashboard.title}
                          </ha-list-item>
                        `;
                      })}
                    `
                  : nothing}
              </ha-select>
            `
          : html`<div class="loading">
              <ha-spinner size="small"></ha-spinner>
            </div>`}
      </ha-settings-row>
    `;
  }

  private async _getDashboards() {
    this._dashboards = await fetchDashboards(this.hass);
  }

  private _dashboardChanged(ev) {
    const value = ev.target.value as string;
    if (!value) {
      return;
    }
    const urlPath = value === USE_SYSTEM_VALUE ? undefined : value;
    if (urlPath === this.hass.userData?.default_panel) {
      return;
    }
    saveFrontendUserData(this.hass.connection, "core", {
      ...this.hass.userData,
      default_panel: urlPath,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 56px;
          width: 200px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-pick-dashboard-row": HaPickDashboardRow;
  }
}
