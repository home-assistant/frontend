import {
  LitElement,
  TemplateResult,
  html,
  property,
  customElement,
  PropertyValues,
} from "lit-element";

import "./ha-settings-row";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import "../../components/ha-paper-dropdown-menu";

import { HomeAssistant } from "../../types";
import { LovelaceDashboard, fetchDashboards } from "../../data/lovelace";
import { setDefaultPanel } from "../../data/panel";

@customElement("ha-pick-dashboard-row")
class HaPickDashboardRow extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public narrow!: boolean;
  @property() private _dashboards: LovelaceDashboard[] = [];

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
        <ha-paper-dropdown-menu
          .label=${this.hass.localize(
            "ui.panel.profile.dashboard.dropdown_label"
          )}
          dynamic-align
          .disabled=${!this._dashboards.length}
        >
          <paper-listbox
            slot="dropdown-content"
            .selected=${this.hass.defaultPanel}
            @iron-select=${this._dashboardChanged}
            attr-for-selected="url-path"
          >
            <paper-item url-path="lovelace">default</paper-item>
            ${this._dashboards.map((dashboard) => {
              if (!this.hass.user!.is_admin && dashboard.require_admin) {
                return "";
              }
              return html`
                <paper-item url-path=${dashboard.url_path}
                  >${dashboard.title}</paper-item
                >
              `;
            })}
          </paper-listbox>
        </ha-paper-dropdown-menu>
      </ha-settings-row>
    `;
  }

  private async _getDashboards() {
    this._dashboards = await fetchDashboards(this.hass);
  }

  private _dashboardChanged(ev: CustomEvent) {
    const urlPath = ev.detail.item.getAttribute("url-path");
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
