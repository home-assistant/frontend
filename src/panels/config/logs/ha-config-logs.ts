import { mdiChevronDown } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { extractSearchParam } from "../../../common/url/search-params";
import "../../../components/ha-button-menu";
import "../../../components/ha-button";
import "../../../components/search-input";
import { LogProvider } from "../../../data/error_log";
import { fetchHassioAddonsInfo } from "../../../data/hassio/addon";
import "../../../layouts/hass-subpage";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route } from "../../../types";
import "./error-log-card";
import "./system-log-card";
import type { SystemLogCard } from "./system-log-card";

const logProviders: LogProvider[] = [
  {
    key: "core",
    name: "Home Assistant Core",
  },
  {
    key: "supervisor",
    name: "Supervisor",
  },
  {
    key: "host",
    name: "Host",
  },
  {
    key: "dns",
    name: "DNS",
  },
  {
    key: "audio",
    name: "Audio",
  },
  {
    key: "multicast",
    name: "Multicast",
  },
];

@customElement("ha-config-logs")
export class HaConfigLogs extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ type: Boolean }) public isWide!: boolean;

  @property({ type: Boolean }) public showAdvanced!: boolean;

  @property({ attribute: false }) public route!: Route;

  @state() private _filter = extractSearchParam("filter") || "";

  @query("system-log-card", true) private systemLog?: SystemLogCard;

  @state() private _selectedLogProvider = "core";

  @state() private _logProviders = logProviders;

  public connectedCallback() {
    super.connectedCallback();
    if (this.systemLog && this.systemLog.loaded) {
      this.systemLog.fetchData();
    }
  }

  protected firstUpdated(changedProps): void {
    super.firstUpdated(changedProps);
    if (isComponentLoaded(this.hass, "hassio")) {
      this._getInstalledAddons();
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
              @value-changed=${this._filterChanged}
              .hass=${this.hass}
              .filter=${this._filter}
              .label=${this.hass.localize("ui.panel.config.logs.search")}
            ></search-input>
          </div>
        `;

    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize("ui.panel.config.logs.caption")}
        back-path="/config/system"
      >
        ${isComponentLoaded(this.hass, "hassio") &&
        this.hass.userData?.showAdvanced
          ? html`
              <ha-button-menu slot="toolbar-icon">
                <ha-button
                  slot="trigger"
                  .label=${this._logProviders.find(
                    (p) => p.key === this._selectedLogProvider
                  )!.name}
                >
                  <ha-svg-icon
                    slot="trailingIcon"
                    .path=${mdiChevronDown}
                  ></ha-svg-icon>
                </ha-button>
                ${this._logProviders.map(
                  (provider) => html`
                    <mwc-list-item
                      ?selected=${provider.key === this._selectedLogProvider}
                      .provider=${provider.key}
                      @click=${this._selectProvider}
                    >
                      ${provider.name}
                    </mwc-list-item>
                  `
                )}
              </ha-button-menu>
            `
          : ""}
        ${search}
        <div class="content">
          ${this._selectedLogProvider === "core"
            ? html`
                <system-log-card
                  .hass=${this.hass}
                  .header=${this._logProviders.find(
                    (p) => p.key === this._selectedLogProvider
                  )!.name}
                  .filter=${this._filter}
                ></system-log-card>
              `
            : ""}
          <error-log-card
            .hass=${this.hass}
            .header=${this._logProviders.find(
              (p) => p.key === this._selectedLogProvider
            )!.name}
            .filter=${this._filter}
            .provider=${this._selectedLogProvider}
            .show=${this._selectedLogProvider !== "core"}
          ></error-log-card>
        </div>
      </hass-subpage>
    `;
  }

  private _selectProvider(ev) {
    this._selectedLogProvider = (ev.currentTarget as any).provider;
  }

  private async _getInstalledAddons() {
    try {
      const addonsInfo = await fetchHassioAddonsInfo(this.hass);
      this._logProviders = [
        ...this._logProviders,
        ...addonsInfo.addons
          .filter((addon) => addon.version)
          .map((addon) => ({
            key: addon.slug,
            name: addon.name,
          })),
      ];
    } catch (err) {
      // Ignore, nothing the user can do anyway
    }
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

        mwc-button[slot="trigger"] {
          --mdc-theme-primary: var(--primary-text-color);
          --mdc-icon-size: 36px;
        }
        ha-button-menu > mwc-button > ha-svg-icon {
          margin-inline-end: 0px;
          margin-inline-start: 8px;
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
