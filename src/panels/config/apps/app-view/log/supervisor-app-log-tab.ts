import {
  css,
  type CSSResultGroup,
  html,
  LitElement,
  type TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/ha-spinner";
import type { HassioAddonDetails } from "../../../../../data/hassio/addon";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import { supervisorAppsStyle } from "../../resources/supervisor-apps-style";
import "../../../logs/error-log-card";
import "../../../../../components/search-input";
import { extractSearchParam } from "../../../../../common/url/search-params";

@customElement("supervisor-app-log-tab")
class SupervisorAppLogDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public addon?: HassioAddonDetails;

  @state() private _filter = extractSearchParam("filter") || "";

  protected render(): TemplateResult {
    if (!this.addon) {
      return html` <ha-spinner></ha-spinner> `;
    }
    return html`
      <div class="search">
        <search-input
          @value-changed=${this._filterChanged}
          .hass=${this.hass}
          .filter=${this._filter}
          .label=${this.hass.localize("ui.panel.config.logs.search")}
        ></search-input>
      </div>
      <div class="content">
        <error-log-card
          .hass=${this.hass}
          .header=${this.addon.name}
          .provider=${this.addon.slug}
          .filter=${this._filter}
        >
        </error-log-card>
      </div>
    `;
  }

  private async _filterChanged(ev) {
    this._filter = ev.detail.value;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      supervisorAppsStyle,
      css`
        .content {
          margin: auto;
          padding: var(--ha-space-2);
        }
        .search {
          position: sticky;
          top: 0;
          z-index: 2;
        }
        search-input {
          display: block;
          --mdc-text-field-fill-color: var(--sidebar-background-color);
          --mdc-text-field-idle-line-color: var(--divider-color);
        }
        @media all and (max-width: 870px) {
          :host {
            --error-log-card-height: calc(100vh - 304px);
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "supervisor-app-log-tab": SupervisorAppLogDashboard;
  }
}
