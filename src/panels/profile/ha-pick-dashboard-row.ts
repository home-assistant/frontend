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
              .value=${this.hass.sidebar.defaultPanel}
              @selected=${this._dashboardChanged}
              naturalMenuWidth
            >
              <ha-list-item value="lovelace">
                ${this.hass.localize(
                  "ui.panel.profile.dashboard.default_dashboard_label"
                )}
              </ha-list-item>
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

  private async _dashboardChanged(ev) {
    const urlPath = ev.target.value;
    if (!urlPath || urlPath === this.hass.sidebar.defaultPanel) {
      return;
    }
    await saveFrontendUserData(this.hass!.connection, "sidebar", {
      panelOrder: this.hass!.sidebar.panelOrder,
      hiddenPanels: this.hass!.sidebar.hiddenPanels,
      defaultPanel: urlPath,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-pick-dashboard-row": HaPickDashboardRow;
  }
}
