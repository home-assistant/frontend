import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import "../../components/ha-divider";
import "../../components/ha-dropdown-item";
import "../../components/ha-icon";
import type { HaSelectSelectEvent } from "../../components/ha-select";
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
                .value=${this._valueLabel(value)}
                @selected=${this._dashboardChanged}
              >
                <ha-dropdown-item
                  .value=${USE_SYSTEM_VALUE}
                  class=${value === USE_SYSTEM_VALUE ? "selected" : ""}
                >
                  ${this.hass.localize("ui.panel.profile.dashboard.system")}
                </ha-dropdown-item>
                <ha-divider></ha-divider>
                ${PANEL_DASHBOARDS.map((panel) => {
                  const panelInfo = this.hass.panels[panel] as
                    | PanelInfo
                    | undefined;
                  if (!panelInfo) {
                    return nothing;
                  }
                  return html`
                    <ha-dropdown-item
                      value=${panelInfo.url_path}
                      class=${value === panelInfo.url_path ? "selected" : ""}
                    >
                      <ha-icon
                        slot="icon"
                        .icon=${getPanelIcon(panelInfo)}
                      ></ha-icon>
                      ${getPanelTitle(this.hass, panelInfo)}
                    </ha-dropdown-item>
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
                          <ha-dropdown-item
                            .value=${dashboard.url_path}
                            class=${value === dashboard.url_path
                              ? "selected"
                              : ""}
                          >
                            <ha-icon
                              slot="icon"
                              .icon=${dashboard.icon || "mdi:view-dashboard"}
                            ></ha-icon>
                            ${dashboard.title}
                          </ha-dropdown-item>
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

  private _dashboardChanged(ev: HaSelectSelectEvent): void {
    const value = ev.detail.value;
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

  private _valueLabel = memoizeOne((value: string) => {
    if (value === USE_SYSTEM_VALUE) {
      return this.hass.localize("ui.panel.profile.dashboard.system");
    }
    if (value === "lovelace") {
      return this.hass.localize("ui.panel.profile.dashboard.lovelace");
    }
    const panelInfo = this.hass.panels[value] as PanelInfo | undefined;
    if (panelInfo) {
      return getPanelTitle(this.hass, panelInfo);
    }
    const dashboard = this._dashboards?.find((dash) => dash.url_path === value);
    if (dashboard) {
      return dashboard.title;
    }
    return value;
  });

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

        ha-select {
          display: block;
          width: 100%;
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
