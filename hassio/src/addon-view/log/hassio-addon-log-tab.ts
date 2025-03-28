import {
  css,
  type CSSResultGroup,
  html,
  LitElement,
  type TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../src/components/ha-spinner";
import type { HassioAddonDetails } from "../../../../src/data/hassio/addon";
import type { Supervisor } from "../../../../src/data/supervisor/supervisor";
import { haStyle } from "../../../../src/resources/styles";
import type { HomeAssistant } from "../../../../src/types";
import { hassioStyle } from "../../resources/hassio-style";
import "../../../../src/panels/config/logs/error-log-card";
import "../../../../src/components/search-input";
import { extractSearchParam } from "../../../../src/common/url/search-params";

@customElement("hassio-addon-log-tab")
class HassioAddonLogDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

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
          .label=${this.supervisor.localize("ui.panel.config.logs.search")}
        ></search-input>
      </div>
      <div class="content">
        <error-log-card
          .hass=${this.hass}
          .localizeFunc=${this.supervisor.localize}
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
      hassioStyle,
      css`
        .content {
          margin: auto;
          padding: 8px;
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
    "hassio-addon-log-tab": HassioAddonLogDashboard;
  }
}
