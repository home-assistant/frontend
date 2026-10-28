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
import { storage } from "../../../common/decorators/storage";
import type {
  HASSDomEvent,
  HASSDomTargetEvent,
} from "../../../common/dom/fire_event";
import { navigate } from "../../../common/navigate";
import { stringCompare } from "../../../common/string/compare";
import type { LocalizeFunc } from "../../../common/translations/localize";
import { currentPath } from "../../../common/url/current-path";
import { deepEqual } from "../../../common/util/deep-equal";
import {
  DEFAULT_LOG_PROVIDER,
  DEFAULT_LOGS_STATE,
  logsLinkFromUrl,
  logsQueryParamConfig,
  logsQueryParams,
  type LogsState,
} from "../../../common/url/logs-query-params";
import { createQueryString } from "../../../common/url/query-params";
import "../../../components/ha-app-icon";
import "../../../components/ha-button";
import "../../../components/ha-combo-box-item";
import "../../../components/ha-filter-integrations";
import type { IntegrationFilterCount } from "../../../components/ha-filter-integrations";
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
import type { LoggedError, SystemLogLevel } from "../../../data/system_log";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-subpage";
import { mdiHomeAssistant } from "../../../resources/home-assistant-logo-svg";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant, Route, ValueChangedEvent } from "../../../types";
import "./error-log-card";
import "./ha-filter-log-levels";
import "./system-log-card";
import type { SystemLogCard } from "./system-log-card";
import { LOG_LEVELS } from "./util";

const NO_INTEGRATIONS: string[] = [];

const NO_LEVELS: SystemLogLevel[] = [];

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

  @state() private _showFilters = false;

  @state() private _integrationsExpanded = true;

  @state() private _levels: SystemLogLevel[] = [];

  @state() private _levelsExpanded = true;

  @state() private _logItems?: LoggedError[];

  // What the user picked, shown again when the page is opened without params,
  // like from the sidebar. What a link shows isn't stored.
  @storage({
    storage: "sessionStorage",
    key: "logs-search",
    state: false,
    subscribe: false,
  })
  private _storedSearch = "";

  @storage({
    storage: "sessionStorage",
    key: "logs-integrations",
    state: false,
    subscribe: false,
  })
  private _storedIntegrations: string[] = [];

  @storage({
    storage: "sessionStorage",
    key: "logs-levels",
    state: false,
    subscribe: false,
  })
  private _storedLevels: SystemLogLevel[] = [];

  @storage({ key: "logs-raw", state: false, subscribe: false })
  private _storedRaw = false;

  @state()
  @consume({ context: manifestsContext, subscribe: true })
  private _manifests?: ContextType<typeof manifestsContext>;

  // The add-on providers are only known after loading them, until then the
  // provider a link asks for is kept in the URL
  private _providersLoaded = false;

  private _queryParams = new QueryParamsController(this, logsQueryParamConfig, {
    enabled: () => true,
    navigated: (ev) => this._navigated(ev),
  });

  public connectedCallback() {
    super.connectedCallback();
    const systemLog = this.systemLog;
    if (systemLog && systemLog.loaded) {
      systemLog.fetchData();
    }
  }

  protected willUpdate(changedProps: PropertyValues<this>): void {
    super.willUpdate(changedProps);

    if (!this.hasUpdated) {
      this._applyUrl();
    }
  }

  protected firstUpdated(changedProps: PropertyValues<this>): void {
    super.firstUpdated(changedProps);
    this._init();
  }

  private _filterChanged(ev: HASSDomTargetEvent<HaInputSearch>) {
    this._filter = ev.target.value ?? "";

    if (this._currentProvider() === DEFAULT_LOG_PROVIDER) {
      this._storedSearch = this._filter;
    }
    this._writeUrl(true);
  }

  private _flushUrl() {
    this._queryParams.flush();
  }

  protected render(): TemplateResult {
    const core = this._selectedLogProvider === DEFAULT_LOG_PROVIDER;
    const integrations = core ? this._integrations : NO_INTEGRATIONS;
    const levels = core && !this._detail ? this._levels : NO_LEVELS;
    const filterCount = integrations.length + levels.length;
    const filtersShown = core && this._showFilters;
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
                  .count=${filterCount}
                  @close-filter-pane=${this._closeFilters}
                  @clear-filter=${this._clearFilters}
                >
                  <ha-filter-integrations
                    .narrow=${this.narrow}
                    .value=${this._integrations}
                    .expanded=${this._integrationsExpanded}
                    .counts=${
                      this._detail
                        ? undefined
                        : this._getIntegrationCounts(
                            this._logItems,
                            this._manifests,
                            this.hass.localize
                          )
                    }
                    @data-table-filter-changed=${this._integrationsChanged}
                    @expanded-changed=${this._integrationsExpandedChanged}
                  ></ha-filter-integrations>
                  ${
                    this._detail
                      ? nothing
                      : html`<ha-filter-log-levels
                          .value=${this._levels}
                          .expanded=${this._levelsExpanded}
                          .counts=${this._getLevelCounts(this._logItems)}
                          @data-table-filter-changed=${this._levelsChanged}
                          @expanded-changed=${this._levelsExpandedChanged}
                        ></ha-filter-log-levels>`
                  }
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
                      .count=${filterCount}
                      .active=${filterCount > 0}
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
                        .levels=${levels}
                        @switch-log-view=${this._showDetail}
                        @system-log-items-changed=${this._logItemsChanged}
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

    if (this._currentProvider() === DEFAULT_LOG_PROVIDER) {
      this._storedRaw = this._detail;
    }
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
    this._levels = [];
    this._storedSearch = "";
    this._storedIntegrations = [];
    this._storedLevels = [];
    // Keep the search typed so far on the entry Back returns to
    this._queryParams.flush();
    // Picking another provider is a navigation of its own, so Back returns
    // to the previous one
    const search = createQueryString(
      logsQueryParams({
        provider,
        search: "",
        integrations: [],
        levels: [],
        raw: this._detail,
      }),
      logsQueryParamConfig
    );

    // From the current path, so a trailing slash still matches the controller
    navigate(`${currentPath()}${search ? `?${search}` : ""}`);
  }

  private _toggleFilters() {
    this._showFilters = !this._showFilters;
  }

  private _closeFilters() {
    this._showFilters = false;
  }

  private _integrationsChanged(
    ev: HASSDomEvent<{ value: DataTableFiltersValue }>
  ) {
    ev.stopPropagation();
    const value = ev.detail.value;
    const integrations = Array.isArray(value) ? value : [];

    // The filter also sends the value it was given once it has its items, in
    // its own order, so only a change is the user's
    if (
      this._currentProvider() === DEFAULT_LOG_PROVIDER &&
      !deepEqual([...integrations].sort(), [...this._integrations].sort())
    ) {
      this._storedIntegrations = integrations;
    }

    this._integrations = integrations;
    this._writeUrl();
  }

  private _clearFilters() {
    const core = this._currentProvider() === DEFAULT_LOG_PROVIDER;

    this._integrations = [];

    if (core) {
      this._storedIntegrations = [];
    }

    // Levels don't apply to the raw log, so they're kept for the errors view
    if (!this._detail) {
      this._levels = [];

      if (core) {
        this._storedLevels = [];
      }
    }
    this._writeUrl();
  }

  private _integrationsExpandedChanged(
    ev: HASSDomEvent<{ expanded: boolean }>
  ) {
    this._integrationsExpanded = ev.detail.expanded;
  }

  private _levelsChanged(ev: HASSDomEvent<{ value: DataTableFiltersValue }>) {
    ev.stopPropagation();

    const value = ev.detail.value;

    const levels = Array.isArray(value)
      ? LOG_LEVELS.map((item) => item.level).filter((level) =>
          value.includes(level)
        )
      : [];

    this._levels = levels;

    if (this._currentProvider() === DEFAULT_LOG_PROVIDER) {
      this._storedLevels = levels;
    }

    this._writeUrl();
  }

  private _levelsExpandedChanged(ev: HASSDomEvent<{ expanded: boolean }>) {
    this._levelsExpanded = ev.detail.expanded;
  }

  // Until the apps are loaded, the provider is the one the URL asks for
  private _currentProvider(): string {
    return this._providersLoaded
      ? this._selectedLogProvider
      : (logsLinkFromUrl(this._queryParams.searchParams() ?? "")?.provider ??
          DEFAULT_LOG_PROVIDER);
  }

  private _writeUrl(debounced = false) {
    this._queryParams.write(logsQueryParams(this._urlState()), debounced);
  }

  private _urlState(): LogsState {
    return {
      provider: this._currentProvider(),
      search: this._filter,
      integrations: this._integrations,
      levels: this._levels,
      raw: this._detail,
    };
  }

  // Closing a dialog, like an entry's details, goes back to the URL the page
  // is already showing, so there's nothing to apply. A link is always applied.
  private _navigated(ev?: Event) {
    const searchParams = this._queryParams.searchParams();

    if (ev?.type === "popstate" && searchParams) {
      const shown = createQueryString(
        logsQueryParams(this._urlState()),
        logsQueryParamConfig
      );

      const back = createQueryString(
        logsQueryParams(logsLinkFromUrl(searchParams) ?? DEFAULT_LOGS_STATE),
        logsQueryParamConfig
      );

      if (back === shown) {
        return;
      }
    }

    this._applyUrl();
  }

  private async _init() {
    if (isComponentLoaded(this.hass.config, "hassio")) {
      await this._getInstalledAddons();
    }
    // Keep a search typed while the apps were loading
    this._queryParams.flush();
    this._providersLoaded = true;
    // What was stored is already applied, and an empty URL now is a link like
    // `?provider=core` that was tidied up
    this._applyUrl(false);
  }

  private _applyUrl(restoreStored = true) {
    const searchParams = this._queryParams.searchParams();
    if (!searchParams) {
      return;
    }
    // A link is shown, but not stored. Opened without params, like from the
    // sidebar or Back to before another provider was picked, the page shows
    // what the user picked.
    const link =
      logsLinkFromUrl(searchParams) ??
      (searchParams.toString() === ""
        ? restoreStored
          ? {
              ...DEFAULT_LOGS_STATE,
              search: this._storedSearch,
              integrations: this._storedIntegrations,
              levels: this._storedLevels,
              raw: this._storedRaw,
            }
          : DEFAULT_LOGS_STATE
        : undefined);
    let missingProvider: string | undefined;
    if (link) {
      // The provider is checked once the apps are loaded, the rest of the link
      // applies straight away
      if (this._providersLoaded) {
        const found =
          link.provider === DEFAULT_LOG_PROVIDER ||
          (isComponentLoaded(this.hass.config, "hassio") &&
            this._logProviders.some((p) => p.key === link.provider));
        missingProvider = found ? undefined : link.provider;
        this._selectedLogProvider = found
          ? link.provider
          : DEFAULT_LOG_PROVIDER;
      }
      const loaded = this._getLoadedIntegrations(this.hass.config.components);
      this._filter = link.search;
      if (link.provider === DEFAULT_LOG_PROVIDER) {
        this._detail = link.raw;
      }

      if (!deepEqual(link.levels, this._levels)) {
        this._levels = link.levels;
      }
      const integrations = link.integrations.filter((domain) =>
        loaded.includes(domain)
      );
      // A new list restarts the log streams, so keep the current one if equal
      if (!deepEqual(integrations, this._integrations)) {
        this._integrations = integrations;
      }
    }
    // Before the alert adds its history entry, so closing it doesn't go back
    // to the missing provider
    this._writeUrl();
    if (missingProvider) {
      showAlertDialog(this, {
        title:
          this.hass.localize("ui.panel.config.logs.provider_not_found") ||
          "Log provider not found",
        text: this.hass.localize(
          "ui.panel.config.logs.provider_not_available",
          { provider: missingProvider }
        ),
      });
    }
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

  private _getLevelCounts = memoizeOne(
    (
      items: LoggedError[] | undefined
    ): Partial<Record<SystemLogLevel, number>> | undefined => {
      if (!items) {
        return undefined;
      }

      const counts: Partial<Record<SystemLogLevel, number>> = {};

      for (const item of items) {
        counts[item.level] = (counts[item.level] ?? 0) + 1;
      }

      return counts;
    }
  );

  // Matches entries to integrations by logger name, the same way
  // `_getIntegrationLoggers` filters them
  private _getIntegrationCounts = memoizeOne(
    (
      items: LoggedError[] | undefined,
      manifests: ContextType<typeof manifestsContext> | undefined,
      localize: LocalizeFunc
    ): Record<string, IntegrationFilterCount[]> | undefined => {
      if (!items?.length || !manifests) {
        return undefined;
      }

      const loggerDomains = new Map<string, string[]>();

      for (const { domain, loggers } of Object.values(manifests)) {
        for (const logger of [
          `homeassistant.components.${domain}`,
          `custom_components.${domain}`,
          ...(loggers ?? []),
        ]) {
          loggerDomains.set(logger, [
            ...(loggerDomains.get(logger) ?? []),
            domain,
          ]);
        }
      }

      const levelCounts: Record<
        string,
        Partial<Record<SystemLogLevel, number>>
      > = {};

      for (const item of items) {
        const parts = item.name.split(".");

        const domains = new Set(
          parts.flatMap(
            (_part, index) =>
              loggerDomains.get(parts.slice(0, index + 1).join(".")) ?? []
          )
        );

        for (const domain of domains) {
          const counts = (levelCounts[domain] ??= {});

          counts[item.level] = (counts[item.level] ?? 0) + 1;
        }
      }

      return Object.fromEntries(
        Object.entries(levelCounts).map(([domain, counts]) => [
          domain,
          LOG_LEVELS.flatMap(({ level, path, color }) => {
            const count = counts[level];

            return count
              ? [
                  {
                    key: level,
                    path,
                    color,
                    count,
                    label: localize(
                      `ui.panel.config.logs.level_count.${level}`,
                      { count }
                    ),
                  },
                ]
              : [];
          }),
        ])
      );
    }
  );

  private _logItemsChanged(
    ev: HASSDomEvent<HASSDomEvents["system-log-items-changed"]>
  ) {
    this._logItems = ev.detail.items;
  }

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
