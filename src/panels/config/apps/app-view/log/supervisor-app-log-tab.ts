import {
  css,
  type CSSResultGroup,
  html,
  LitElement,
  type PropertyValues,
  type TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { QueryParamsController } from "../../../../../common/controllers/query-params-controller";
import type { HASSDomTargetEvent } from "../../../../../common/dom/fire_event";
import {
  logSearchFromUrl,
  logSearchQueryParamConfig,
} from "../../../../../common/url/logs-query-params";
import "../../../../../components/ha-spinner";
import "../../../../../components/input/ha-input-search";
import type { HaInputSearch } from "../../../../../components/input/ha-input-search";
import type { HassioAddonDetails } from "../../../../../data/hassio/addon";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import "../../../logs/error-log-card";
import { supervisorAppsStyle } from "../../resources/supervisor-apps-style";

@customElement("supervisor-app-log-tab")
class SupervisorAppLogDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public addon?: HassioAddonDetails;

  @state() private _filter = "";

  private _queryParams = new QueryParamsController(
    this,
    logSearchQueryParamConfig,
    {
      enabled: () => true,
      navigated: () => this._applyUrl(),
    }
  );

  protected willUpdate(changedProps: PropertyValues<this>): void {
    super.willUpdate(changedProps);

    if (!this.hasUpdated) {
      this._applyUrl();
    }
  }

  protected render(): TemplateResult {
    if (!this.addon) {
      return html` <ha-spinner></ha-spinner> `;
    }
    return html`
      <div class="search">
        <ha-input-search
          appearance="outlined"
          @input=${this._filterChanged}
          @blur=${this._flushUrl}
          .value=${this._filter}
          .placeholder=${this.hass.localize("ui.panel.config.logs.search")}
        ></ha-input-search>
      </div>
      <div class="content">
        <error-log-card
          .header=${this.addon.name}
          .provider=${this.addon.slug}
          .filter=${this._filter}
        >
        </error-log-card>
      </div>
    `;
  }

  private _filterChanged(ev: HASSDomTargetEvent<HaInputSearch>) {
    this._filter = ev.target.value ?? "";
    this._queryParams.write({ search: this._filter }, true);
  }

  private _flushUrl() {
    this._queryParams.flush();
  }

  // A link without a search clears it, like the logs page
  private _applyUrl() {
    const searchParams = this._queryParams.searchParams();

    if (!searchParams) {
      return;
    }

    this._filter = logSearchFromUrl(searchParams);
    this._queryParams.write({ search: this._filter });
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
        ha-input-search {
          padding: var(--ha-space-3) var(--ha-space-2);
          background: var(--sidebar-background-color);
          border-bottom: 1px solid var(--divider-color);
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
