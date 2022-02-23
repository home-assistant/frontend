import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import "../../../layouts/hass-tabs-subpage";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route } from "../../../types";
import { configSections } from "../ha-panel-config";
import "../../../common/search/search-input";
import { extractSearchParam } from "../../../common/url/search-params";
import "./error-log-card";
import "./system-log-card";
import type { SystemLogCard } from "./system-log-card";

@customElement("ha-config-logs")
export class HaConfigLogs extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow!: boolean;

  @property() public isWide!: boolean;

  @property() public showAdvanced!: boolean;

  @property() public route!: Route;

  @state() private _filter = extractSearchParam("filter") ?? "";

  @query("system-log-card", true) private systemLog?: SystemLogCard;

  public connectedCallback() {
    super.connectedCallback();
    if (this.systemLog && this.systemLog.loaded) {
      this.systemLog.fetchData();
    }
  }

  private async _filterChanged(ev) {
    this._filter = ev.detail.value;
  }

  protected render(): TemplateResult {
    const search = this.narrow
      ? html`
          <div slot="header">
            <search-input
              class="header"
              no-label-float
              no-underline
              @value-changed=${this._filterChanged}
              .hass=${this.hass}
              .filter=${this._filter}
              .label=${this.hass.localize("ui.panel.config.logs.search")}
            ></search-input>
          </div>
        `
      : html`
          <div class="search">
            <search-input
              autofocus
              no-label-float
              no-underline
              @value-changed=${this._filterChanged}
              .hass=${this.hass}
              .filter=${this._filter}
              .label=${this.hass.localize("ui.panel.config.logs.search")}
            ></search-input>
          </div>
        `;

    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config"
        .route=${this.route}
        .tabs=${configSections.general}
      >
        ${search}
        <div class="content">
          <system-log-card
            .hass=${this.hass}
            .filter=${this._filter}
          ></system-log-card>
          <error-log-card
            .hass=${this.hass}
            .filter=${this._filter}
          ></error-log-card>
        </div>
      </hass-tabs-subpage>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          -ms-user-select: initial;
          -webkit-user-select: initial;
          -moz-user-select: initial;
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
        search-input.header {
          --mdc-ripple-color: transparant;
        }
        .content {
          direction: ltr;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-logs": HaConfigLogs;
  }
}
