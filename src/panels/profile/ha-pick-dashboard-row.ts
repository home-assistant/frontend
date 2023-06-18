import "@material/mwc-list/mwc-list-item";
import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../components/ha-select";
import "../../components/ha-settings-row";
import { fetchDashboards, LovelaceDashboard } from "../../data/lovelace";
import { setDefaultPanel } from "../../data/panel";
import { HomeAssistant } from "../../types";

@customElement("ha-pick-dashboard-row")
class HaPickDashboardRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow!: boolean;

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
              .value=${this.hass.defaultPanel}
              @selected=${this._dashboardChanged}
              naturalMenuWidth
            >
              <mwc-list-item value="lovelace">
                ${this.hass.localize(
                  "ui.panel.profile.dashboard.default_dashboard_label"
                )}
              </mwc-list-item>
              ${this._dashboards.map((dashboard) => {
                if (!this.hass.user!.is_admin && dashboard.require_admin) {
                  return "";
                }
                return html`
                  <mwc-list-item .value=${dashboard.url_path}>
                    ${dashboard.title}
                  </mwc-list-item>
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
    const urlPath = ev.target.value;
    if (!urlPath || urlPath === this.hass.defaultPanel) {
      return;
    }
    setDefaultPanel(this, urlPath);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-pick-dashboard-row": HaPickDashboardRow;
  }
}
