import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../components/ha-list-item";
import "../../components/ha-select";
import "../../components/ha-settings-row";
import type { LovelaceDashboard } from "../../data/lovelace/dashboard";
import { fetchDashboards } from "../../data/lovelace/dashboard";
import type { HomeAssistant } from "../../types";
import type { LocalizeKeys } from "../../common/translations/localize";
import { DEFAULT_PANEL } from "../../data/panel";

@customElement("ha-pick-dashboard-row")
class HaPickDashboardRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: String, attribute: "header-key" })
  public headerKey!: LocalizeKeys;

  @property({ type: String, attribute: "description-key" })
  public descriptionKey!: LocalizeKeys;

  @property({ type: String, attribute: "selected-dashboard" })
  public selectedDashboard?: string;

  @property({ attribute: false })
  public setDashboard!: (element: HTMLElement, urlPath: string) => void;

  @state() private _dashboards?: LovelaceDashboard[];

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this._getDashboards();
  }

  protected render(): TemplateResult {
    return html`
      <ha-settings-row .narrow=${this.narrow}>
        <span slot="heading"> ${this.hass.localize(this.headerKey)} </span>
        <span slot="description">
          ${this.hass.localize(this.descriptionKey)}
        </span>
        ${this._dashboards
          ? html`<ha-select
              .label=${this.hass.localize(
                "ui.panel.profile.dashboard.dropdown_label"
              )}
              .disabled=${!this._dashboards?.length}
              .value=${this.selectedDashboard || DEFAULT_PANEL}
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

  private _dashboardChanged(ev) {
    this.setDashboard(this, ev.target.value);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-pick-dashboard-row": HaPickDashboardRow;
  }
}
