import type { ContextType } from "@lit/context";
import {
  mdiChevronDown,
  mdiChip,
  mdiDns,
  mdiFilterVariant,
  mdiPackageVariant,
  mdiPuzzle,
  mdiRadar,
  mdiVolumeHigh,
} from "@mdi/js";
import type { CSSResultGroup, TemplateResult, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { atLeastVersion } from "../../../common/config/version";
import { QueryParamsController } from "../../../common/controllers/query-params-controller";
import { consume } from "../../../common/decorators/consume";
import type {
  HASSDomEvent,
  HASSDomTargetEvent,
} from "../../../common/dom/fire_event";
import {
  getHistoryState,
  navigate,
  updateHistoryState,
} from "../../../common/navigate";
import { stringCompare } from "../../../common/string/compare";
import { deepEqual } from "../../../common/util/deep-equal";
import {
  DEFAULT_LOG_PROVIDER,
  DEFAULT_LOGS_STATE,
  logsLinkFromUrl,
  logsQueryParamConfig,
  logsQueryParams,
} from "../../../common/url/logs-query-params";
import { createQueryString } from "../../../common/url/query-params";
import "../../../components/ha-app-icon";
import "../../../components/ha-button";
import "../../../components/ha-combo-box-item";
import "../../../components/ha-filter-integrations";
import "../../../components/ha-filter-pane";
import "../../../components/ha-filter-pane-chip";
import "../../../components/ha-generic-picker";
import type { HaGenericPicker } from "../../../components/ha-generic-picker";
import type { PickerComboBoxItem } from "../../../components/ha-picker-combo-box";
import "../../../components/input/ha-input-search";
import type { HaInputSearch } from "../../../components/input/ha-input-search";
import { manifestsContext } from "../../../data/context";
import type { DataTableFiltersValue } from "../../../data/data_table_filters";
import type { LogProvider } from "../../../data/error_log";
import {
  fetchHassioAddonsInfo,
  type HassioAddonInfo,
} from "../../../data/hassio/addon";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-subpage";
import { mdiHomeAssistant } from "../../../resources/home-assistant-logo-svg";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant, Route, ValueChangedEvent } from "../../../types";
import "./error-log-card";
import "./system-log-card";
import type { SystemLogCard } from "./system-log-card";

const NO_INTEGRATIONS: string[] = [];

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

const LOGS_HISTORY_STATE = "logsPage";

interface LogProviderPickerItem extends PickerComboBoxItem {
  addon?: HassioAddonInfo;
  hasAppIcon?: boolean;
}

@customElement("ha-config-logs")
export class HaConfigLogs extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _filter = "";

  @state() private _detail = false;

  @query("system-log-card") private systemLog?: SystemLogCard;

  @query("#provider-picker") private providerPicker?: HaGenericPicker;

  @state() private _selectedLogProvider = DEFAULT_LOG_PROVIDER;

  @state() private _integrations: string[] = [];

  @state() private _logProviders = logProviders;

  @state() private _showFilters?: boolean;

  @state() private _integrationsExpanded = true;

  @state()
  @consume({ context: manifestsContext, subscribe: true })
  private _manifests?: ContextType<typeof manifestsContext>;

  // The add-on providers are only known after loading them, links are applied
  // once they are
  private _providersLoaded = false;

  private _queryParams = new QueryParamsController(this, logsQueryParamConfig, {
    enabled: () => true,
    navigated: () => this._applyUrl(),
  });

  public connectedCallback() {
    super.connectedCallback();
    const systemLog = this.systemLog;
    if (systemLog && systemLog.loaded) {
      systemLog.fetchData();
    }
  }

  protected firstUpdated(changedProps: PropertyValues<this>): void {
    super.firstUpdated(changedProps);
    this._init();
  }

  private _filterChanged(ev: HASSDomTargetEvent<HaInputSearch>) {
    this._filter = ev.target.value ?? "";
    this._writeUrl(true);
  }

  private _flushUrl() {
    this._queryParams.flush();
  }

  protected render(): TemplateResult {
    const core = this._selectedLogProvider === DEFAULT_LOG_PROVIDER;
    const integrations = core ? this._integrations : NO_INTEGRATIONS;
    const filtersShown = core && this._filtersShown();
    const filtersLabel = this.hass.localize(
      "ui.components.subpage-data-table.filters"
    );

    const selectedProvider = this._getActiveProvider(this._selectedLogProvider);

    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize("ui.panel.config.logs.caption")}
        back-path="/config/system"
      >
        ${
          isComponentLoaded(this.hass.config, "hassio") && this._logProviders
            ? html`
                <ha-generic-picker
                  id="provider-picker"
                  slot="toolbar-icon"
                  .getItems=${this._getLogProviderItems}
                  value=""
                  .rowRenderer=${this._providerRenderer}
                  @value-changed=${this._handleDropdownSelect}
                >
                  <ha-button
                    slot="field"
                    appearance="filled"
                    @click=${this._openPicker}
                  >
                    ${
                      selectedProvider
                        ? this._renderProviderIcon(selectedProvider)
                        : nothing
                    }
                    ${selectedProvider?.primary}
                    <ha-svg-icon
                      slot="end"
                      .path=${mdiChevronDown}
                    ></ha-svg-icon>
                  </ha-button>
                </ha-generic-picker>
              `
            : nothing
        }
        <div class="main">
          ${
            filtersShown
              ? html`<ha-filter-pane
                  .narrow=${this.narrow}
                  .count=${this._integrations.length}
                  @close-filter-pane=${this._closeFilters}
                  @clear-filter=${this._clearIntegrations}
                >
                  <ha-filter-integrations
                    .narrow=${this.narrow}
                    .value=${this._integrations}
                    .expanded=${this._integrationsExpanded}
                    @data-table-filter-changed=${this._integrationsChanged}
                    @expanded-changed=${this._integrationsExpandedChanged}
                  ></ha-filter-integrations>
                </ha-filter-pane>`
              : nothing
          }
          <div class="content-column">
            <div class="toolbar">
              ${
                core && (!filtersShown || this.narrow)
                  ? html`<ha-filter-pane-chip
                      .label=${filtersLabel}
                      .path=${mdiFilterVariant}
                      .count=${this._integrations.length}
                      .active=${this._integrations.length > 0}
                      @click=${this._toggleFilters}
                    ></ha-filter-pane-chip>`
                  : nothing
              }
              <ha-input-search
                appearance="outlined"
                @input=${this._filterChanged}
                @blur=${this._flushUrl}
                .value=${this._filter}
                .placeholder=${this.hass.localize("ui.panel.config.logs.search")}
              ></ha-input-search>
            </div>
            <div class="content">
              ${
                core && !this._detail
                  ? html`
                      <system-log-card
                        .hass=${this.hass}
                        .header=${
                          this._logProviders.find(
                            (p) => p.key === this._selectedLogProvider
                          )!.name
                        }
                        .filter=${this._filter}
                        .integrations=${integrations}
                        .integrationLoggers=${this._getIntegrationLoggers(
                          integrations,
                          this._manifests
                        )}
                        @switch-log-view=${this._showDetail}
                      ></system-log-card>
                    `
                  : html`<error-log-card
                      .header=${
                        this._logProviders.find(
                          (p) => p.key === this._selectedLogProvider
                        )!.name
                      }
                      .filter=${this._filter}
                      .provider=${this._selectedLogProvider}
                      .integrations=${integrations}
                      @switch-log-view=${this._showDetail}
                      allow-switch
                    ></error-log-card>`
              }
            </div>
          </div>
        </div>
      </hass-subpage>
    `;
  }

  private _showDetail() {
    this._detail = !this._detail;
    this._writeUrl();
  }

  private _openPicker(ev: Event) {
    ev.stopPropagation();
    this.providerPicker?.open();
  }

  private _handleDropdownSelect(ev: ValueChangedEvent<string>) {
    const provider = ev.detail?.value;
    if (!provider) {
      return;
    }
    this._selectedLogProvider = provider;
    this._filter = "";
    this._integrations = [];
    // Picking another provider is a navigation of its own, so Back returns
    // to the previous one. Both entries are marked, so going back to one
    // without params shows the default view instead of keeping the provider.
    updateHistoryState({ [LOGS_HISTORY_STATE]: true });
    const search = createQueryString(
      logsQueryParams({
        provider,
        filter: "",
        integrations: [],
        raw: this._detail,
      }),
      logsQueryParamConfig
    );
    navigate(`/config/logs${search ? `?${search}` : ""}`, {
      data: { [LOGS_HISTORY_STATE]: true },
    });
  }

  private _filtersShown(): boolean {
    return this._showFilters ?? !this.narrow;
  }

  private _toggleFilters() {
    this._showFilters = !this._filtersShown();
  }

  private _closeFilters() {
    this._showFilters = false;
  }

  private _integrationsChanged(
    ev: HASSDomEvent<{ value: DataTableFiltersValue }>
  ) {
    ev.stopPropagation();
    const value = ev.detail.value;
    this._integrations = Array.isArray(value) ? value : [];
    this._writeUrl();
  }

  private _clearIntegrations() {
    this._integrations = [];
    this._writeUrl();
  }

  private _integrationsExpandedChanged(
    ev: HASSDomEvent<{ expanded: boolean }>
  ) {
    this._integrationsExpanded = ev.detail.expanded;
  }

  private _writeUrl(debounced = false) {
    this._queryParams.write(
      logsQueryParams({
        provider: this._selectedLogProvider,
        filter: this._filter,
        integrations: this._integrations,
        raw: this._detail,
      }),
      debounced
    );
  }

  private async _init() {
    if (isComponentLoaded(this.hass.config, "hassio")) {
      await this._getInstalledAddons();
    }
    this._providersLoaded = true;
    this._applyUrl();
  }

  private _applyUrl() {
    if (!this._providersLoaded) {
      return;
    }
    const searchParams = this._queryParams.searchParams();
    if (!searchParams) {
      return;
    }
    const link =
      logsLinkFromUrl(searchParams) ??
      (getHistoryState()?.[LOGS_HISTORY_STATE]
        ? DEFAULT_LOGS_STATE
        : undefined);
    if (link) {
      if (
        link.provider !== DEFAULT_LOG_PROVIDER &&
        !(
          isComponentLoaded(this.hass.config, "hassio") &&
          this._logProviders.some((p) => p.key === link.provider)
        )
      ) {
        this._selectedLogProvider = DEFAULT_LOG_PROVIDER;
        this._filter = "";
        this._integrations = [];
        this._writeUrl();
        showAlertDialog(this, {
          title:
            this.hass.localize("ui.panel.config.logs.provider_not_found") ||
            "Log provider not found",
          text: this.hass.localize(
            "ui.panel.config.logs.provider_not_available",
            { provider: link.provider }
          ),
        });
        return;
      }
      const loaded = this._getLoadedIntegrations(this.hass.config.components);
      this._selectedLogProvider = link.provider;
      this._filter = link.filter;
      if (link.provider === DEFAULT_LOG_PROVIDER) {
        this._detail = link.raw;
      }
      const integrations = link.integrations.filter((domain) =>
        loaded.includes(domain)
      );
      // A new list restarts the log streams, so keep the current one if equal
      if (!deepEqual(integrations, this._integrations)) {
        this._integrations = integrations;
      }
    }
    this._writeUrl();
  }

  private async _getInstalledAddons() {
    try {
      const addonsInfo = await fetchHassioAddonsInfo(this.hass);
      const sortedAddons = addonsInfo.addons
        .filter((addon) => addon.version)
        .map((addon) => ({
          key: addon.slug,
          name: addon.name,
          addon,
        }))
        .sort((a, b) =>
          stringCompare(a.name, b.name, this.hass.locale.language)
        );

      this._logProviders = [...this._logProviders, ...sortedAddons];
    } catch (_err) {
      // Ignore, nothing the user can do anyway
    }
  }

  // Integrations that only provide a platform are only listed with it, like
  // `other.device_tracker`
  private _getLoadedIntegrations = memoizeOne((components: string[]) => [
    ...new Set(components.map((component) => component.split(".")[0])),
  ]);

  private _getIntegrationLoggers = memoizeOne(
    (
      integrations: string[],
      manifests: ContextType<typeof manifestsContext> | undefined
    ): string[] | undefined =>
      integrations.length
        ? integrations.flatMap((domain) => [
            `homeassistant.components.${domain}`,
            `custom_components.${domain}`,
            ...(manifests?.[domain]?.loggers ?? []),
          ])
        : undefined
  );

  private _getLogProviderItems = (): LogProviderPickerItem[] =>
    this._logProviders.map((provider) => ({
      id: provider.key,
      primary: provider.name,
      addon: provider.addon,
      hasAppIcon: provider.addon
        ? atLeastVersion(this.hass.config.version, 0, 105) &&
          provider.addon.icon
        : undefined,
      icon_path: provider.addon
        ? mdiPuzzle
        : this._getProviderIconPath(provider.key),
    }));

  private _renderProviderIcon(item: LogProviderPickerItem) {
    if (item.addon) {
      return html`<ha-app-icon
        slot="start"
        .alt=${item.primary}
        .hasIcon=${item.hasAppIcon}
        .slug=${item.addon.slug}
      >
        <ha-svg-icon .path=${item.icon_path}></ha-svg-icon>
      </ha-app-icon>`;
    }

    return item.icon_path
      ? html`<ha-svg-icon slot="start" .path=${item.icon_path}></ha-svg-icon>`
      : nothing;
  }

  private _providerRenderer = (item: LogProviderPickerItem) => html`
    <ha-combo-box-item>
      ${this._renderProviderIcon(item)}
      <span slot="headline">${item.primary}</span>
      ${
        item.secondary
          ? html`<span slot="supporting-text">${item.secondary}</span>`
          : nothing
      }
    </ha-combo-box-item>
  `;

  private _getActiveProvider = memoizeOne((selectedLogProvider: string) => {
    const provider = this._logProviders.find(
      (p) => p.key === selectedLogProvider
    );
    if (provider) {
      return {
        id: provider.key,
        primary: provider.name,
        addon: provider.addon,
        hasAppIcon: provider.addon
          ? atLeastVersion(this.hass.config.version, 0, 105) &&
            provider.addon.icon
          : undefined,
        icon_path: provider.addon
          ? mdiPuzzle
          : this._getProviderIconPath(provider.key),
      };
    }
    return undefined;
  });

  private _getProviderIconPath(providerKey: string): string | undefined {
    switch (providerKey) {
      case "core":
        return mdiHomeAssistant;
      case "supervisor":
        return mdiPackageVariant;
      case "host":
        return mdiChip;
      case "dns":
        return mdiDns;
      case "audio":
        return mdiVolumeHigh;
      case "multicast":
        return mdiRadar;
    }
    return undefined;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          user-select: initial;
        }
        .main {
          display: flex;
          height: 100%;
        }
        .content-column {
          flex: 1;
          min-width: 0;
          overflow-y: auto;
        }
        .toolbar {
          position: sticky;
          top: 0;
          z-index: 2;
          display: flex;
          align-items: center;
          gap: var(--ha-space-4);
          box-sizing: border-box;
          height: 56px;
          padding: 0 var(--ha-space-4);
          background: var(
            --ha-panel-toolbar-background,
            var(--primary-background-color)
          );
          border-bottom: 1px solid var(--divider-color);
        }
        .toolbar ha-input-search {
          flex: 1;
        }
        @media (min-width: 871px) {
          .toolbar ha-input-search {
            --ha-input-search-height: 32px;
            --ha-input-search-border-radius: 10px;
          }
        }
        .content {
          direction: ltr;
        }
        ha-generic-picker {
          --ha-combo-box-item-start-color: var(--ha-color-primary-50);
          --mdc-icon-size: var(--ha-space-6);
        }

        ha-app-icon {
          --ha-app-icon-size: 32px;
        }

        @media all and (max-width: 870px) {
          ha-generic-picker {
            max-width: max(30%, 180px);
          }
          ha-button {
            max-width: 100%;
          }
          ha-button::part(label) {
            overflow: hidden;
            white-space: nowrap;
          }
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
