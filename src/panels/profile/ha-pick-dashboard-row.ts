import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../components/ha-list-item";
import "../../components/ha-select";
import "../../components/ha-settings-row";
import type { LovelaceDashboard } from "../../data/lovelace/dashboard";
import { fetchDashboards } from "../../data/lovelace/dashboard";
import type { HomeAssistant } from "../../types";
import { saveFrontendUserData } from "../../data/frontend";
import { PANEL_DASHBOARDS } from "../config/lovelace/dashboards/ha-config-lovelace-dashboards";
import { getPanelTitle } from "../../data/panel";
import "../../components/ha-divider";

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
    const value = this.hass.userData?.defaultPanel || USE_SYSTEM_VALUE;
    return html`
      <ha-settings-row .narrow=${this.narrow}>
        <span slot="heading">
          ${this.hass.localize("ui.panel.profile.dashboard.header")}
        </span>
        <span slot="description">
          ${this.hass.localize("ui.panel.profile.dashboard.description")}
        </span>
        ${this._dashboards
          ? html`<ha-select
              .label=${this.hass.localize(
                "ui.panel.profile.dashboard.dropdown_label"
              )}
              .disabled=${!this._dashboards?.length}
              .value=${value}
              @selected=${this._dashboardChanged}
              naturalMenuWidth
            >
              <ha-list-item .value=${USE_SYSTEM_VALUE}>
                ${this.hass.localize("ui.panel.profile.dashboard.system")}
              </ha-list-item>
              <ha-divider></ha-divider>
              <ha-list-item value="lovelace">
                ${this.hass.localize("ui.panel.profile.dashboard.lovelace")}
              </ha-list-item>
              ${PANEL_DASHBOARDS.map((panel) => {
                const panelInfo = this.hass.panels[panel];
                return html`
                  <ha-list-item value="lovelace">
                    ${panelInfo ? getPanelTitle(this.hass, panelInfo) : panel}
                  </ha-list-item>
                `;
              })}
              <ha-divider></ha-divider>
              ${this._dashboards.map((dashboard) => {
                if (!this.hass.user!.is_admin && dashboard.require_admin) {
                  return "";
                }
                return html`
                  <ha-list-item .value=${dashboard.url_path}>
                    ${dashboard.title}
                  </ha-list-item>
                `;
              })}
            </ha-select>`
          : html`<ha-select
              .label=${this.hass.localize(
                "ui.panel.profile.dashboard.dropdown_label"
              )}
              disabled
            ></ha-select>`}
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
    if (urlPath === this.hass.userData?.defaultPanel) {
      return;
    }
    saveFrontendUserData(this.hass.connection, "core", {
      ...this.hass.userData,
      defaultPanel: urlPath,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-pick-dashboard-row": HaPickDashboardRow;
  }
}
