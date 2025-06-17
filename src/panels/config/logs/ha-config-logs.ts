import { mdiChevronDown } from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { navigate } from "../../../common/navigate";
import { extractSearchParam } from "../../../common/url/search-params";
import "../../../components/ha-button";
import "../../../components/ha-button-menu";
import "../../../components/ha-list-item";
import "../../../components/search-input";
import type { LogProvider } from "../../../data/error_log";
import { fetchHassioAddonsInfo } from "../../../data/hassio/addon";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-subpage";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant, Route } from "../../../types";
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

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _filter = extractSearchParam("filter") || "";

  @state() private _detail = false;

  @query("system-log-card") private systemLog?: SystemLogCard;

  @state() private _selectedLogProvider = "core";

  @state() private _logProviders = logProviders;

  public connectedCallback() {
    super.connectedCallback();
    const systemLog = this.systemLog;
    if (systemLog && systemLog.loaded) {
      systemLog.fetchData();
    }
  }

  protected firstUpdated(changedProps): void {
    super.firstUpdated(changedProps);
    this._init();
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
        ${isComponentLoaded(this.hass, "hassio")
          ? html`
              <ha-button-menu slot="toolbar-icon">
                <ha-button slot="trigger" appearance="filled">
                  <ha-svg-icon
                    slot="suffix"
                    .path=${mdiChevronDown}
                  ></ha-svg-icon>
                  ${this._logProviders.find(
                    (p) => p.key === this._selectedLogProvider
                  )!.name}
                </ha-button>
                ${this._logProviders.map(
                  (provider) => html`
                    <ha-list-item
                      ?selected=${provider.key === this._selectedLogProvider}
                      .provider=${provider.key}
                      @click=${this._selectProvider}
                    >
                      ${provider.name}
                    </ha-list-item>
                  `
                )}
              </ha-button-menu>
            `
          : ""}
        ${search}
        <div class="content">
          ${this._selectedLogProvider === "core" && !this._detail
            ? html`
                <system-log-card
                  .hass=${this.hass}
                  .header=${this._logProviders.find(
                    (p) => p.key === this._selectedLogProvider
                  )!.name}
                  .filter=${this._filter}
                  @switch-log-view=${this._showDetail}
                ></system-log-card>
              `
            : html`<error-log-card
                .hass=${this.hass}
                .header=${this._logProviders.find(
                  (p) => p.key === this._selectedLogProvider
                )!.name}
                .filter=${this._filter}
                .provider=${this._selectedLogProvider}
                @switch-log-view=${this._showDetail}
                allow-switch
              ></error-log-card>`}
        </div>
      </hass-subpage>
    `;
  }

  private _showDetail() {
    this._detail = !this._detail;
  }

  private _selectProvider(ev) {
    this._selectedLogProvider = (ev.currentTarget as any).provider;
    this._filter = "";
    navigate(`/config/logs?provider=${this._selectedLogProvider}`);
  }

  private async _init() {
    if (isComponentLoaded(this.hass, "hassio")) {
      await this._getInstalledAddons();
    }
    const providerKey = extractSearchParam("provider");
    if (providerKey) {
      if (
        isComponentLoaded(this.hass, "hassio") &&
        this._logProviders.find((p) => p.key === providerKey)
      ) {
        this._selectedLogProvider = providerKey;
      } else {
        navigate("/config/logs", { replace: true });
        showAlertDialog(this, {
          title:
            this.hass.localize("ui.panel.config.logs.provider_not_found") ||
            "Log provider not found",
          text: this.hass.localize(
            "ui.panel.config.logs.provider_not_available",
            {
              provider:
                this._logProviders.find((p) => p.key === providerKey)?.name ||
                providerKey,
            }
          ),
        });
      }
    }
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
    } catch (_err) {
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
          margin-left: -16px;
          margin-inline-start: -16px;
          margin-inline-end: initial;
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
