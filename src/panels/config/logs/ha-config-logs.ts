import {
  mdiDotsVertical,
  mdiChevronDown,
  mdiChip,
  mdiDns,
  mdiDownload,
  mdiFilterVariant,
  mdiFilterVariantRemove,
  mdiPackageVariant,
  mdiPuzzle,
  mdiRadar,
  mdiRefresh,
  mdiText,
  mdiVolumeHigh,
} from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { atLeastVersion } from "../../../common/config/version";
import { navigate } from "../../../common/navigate";
import { stringCompare } from "../../../common/string/compare";
import { extractSearchParam } from "../../../common/url/search-params";
import "../../../components/ha-button";
import "../../../components/chips/ha-assist-chip";
import "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import "../../../components/ha-generic-picker";
import "../../../components/ha-icon-button";
import type { HaGenericPicker } from "../../../components/ha-generic-picker";
import type { PickerComboBoxItem } from "../../../components/ha-picker-combo-box";
import "../../../components/search-input-outlined";
import type { LogProvider } from "../../../data/error_log";
import { fetchHassioAddonsInfo } from "../../../data/hassio/addon";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-subpage";
import { mdiHomeAssistant } from "../../../resources/home-assistant-logo-svg";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant, Route, ValueChangedEvent } from "../../../types";
import type { HaDropdownSelectEvent } from "../../../components/ha-dropdown";
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

  @query("ha-generic-picker") private providerPicker?: HaGenericPicker;

  @state() private _selectedLogProvider = "core";

  @state() private _logProviders = logProviders;

  @state() private _showSystemLogFilters = false;

  @state() private _systemLogFiltersCount = 0;

  protected firstUpdated(changedProps): void {
    super.firstUpdated(changedProps);
    this._init();
  }

  private async _filterChanged(ev) {
    this._filter = ev.detail.value;
  }

  private _toggleSystemLogFilters = () => {
    this._showSystemLogFilters = !this._showSystemLogFilters;
  };

  private _handleSystemLogFiltersChanged(ev: CustomEvent) {
    this._showSystemLogFilters = ev.detail.open;
    this._systemLogFiltersCount = ev.detail.count;
  }

  private _downloadSystemLog = () => {
    this.systemLog?.downloadLogs();
  };

  private _refreshSystemLog = () => {
    this.systemLog?.fetchData();
  };

  private _clearSystemLog = () => {
    this.systemLog?.clearLogs();
  };

  private _clearSystemLogFilters = () => {
    this.systemLog?.clearFilters();
  };

  private _handleSystemLogOverflowAction(ev: HaDropdownSelectEvent): void {
    if (ev.detail.item.value === "show-full-logs") {
      this._showDetail();
    }
  }

  protected render(): TemplateResult {
    const showSystemLog = this._selectedLogProvider === "core" && !this._detail;
    const selectedProvider = this._getActiveProvider(this._selectedLogProvider);
    const header =
      selectedProvider?.primary ||
      this.hass.localize("ui.panel.config.logs.caption");

    const searchRow = html`
      <div
        class="search-row ${showSystemLog
          ? "with-filters"
          : ""} ${showSystemLog && this._showSystemLogFilters && !this.narrow
          ? "with-pane"
          : ""}"
      >
        ${showSystemLog
          ? this._showSystemLogFilters && !this.narrow
            ? html`
                <div class="filter-controls">
                  <div class="relative filter-button">
                    <ha-assist-chip
                      .label=${this.hass.localize(
                        "ui.components.subpage-data-table.filters"
                      )}
                      active
                      @click=${this._toggleSystemLogFilters}
                    >
                      <ha-svg-icon
                        slot="icon"
                        .path=${mdiFilterVariant}
                      ></ha-svg-icon>
                    </ha-assist-chip>
                    ${this._systemLogFiltersCount
                      ? html`<div class="badge">
                          ${this._systemLogFiltersCount}
                        </div>`
                      : nothing}
                  </div>
                  <ha-icon-button
                    .path=${mdiFilterVariantRemove}
                    .label=${this.hass.localize(
                      "ui.components.subpage-data-table.clear_filter"
                    )}
                    .disabled=${!this._systemLogFiltersCount}
                    @click=${this._clearSystemLogFilters}
                  ></ha-icon-button>
                </div>
              `
            : html`
                <div class="relative filter-button">
                  <ha-assist-chip
                    .label=${this.hass.localize(
                      "ui.components.subpage-data-table.filters"
                    )}
                    .active=${this._showSystemLogFilters ||
                    Boolean(this._systemLogFiltersCount)}
                    @click=${this._toggleSystemLogFilters}
                  >
                    <ha-svg-icon
                      slot="icon"
                      .path=${mdiFilterVariant}
                    ></ha-svg-icon>
                  </ha-assist-chip>
                  ${this._systemLogFiltersCount
                    ? html`<div class="badge">
                        ${this._systemLogFiltersCount}
                      </div>`
                    : nothing}
                </div>
              `
          : nothing}

        <search-input-outlined
          class="search-input"
          .hass=${this.hass}
          .filter=${this._filter}
          .label=${this.hass.localize("ui.panel.config.logs.search")}
          .placeholder=${this.hass.localize("ui.panel.config.logs.search")}
          @value-changed=${this._filterChanged}
        ></search-input-outlined>

        ${showSystemLog
          ? html`
              <ha-assist-chip
                class="clear-chip"
                .label=${this.hass.localize("ui.panel.config.logs.clear")}
                .disabled=${!this.systemLog?.hasItems}
                @click=${this._clearSystemLog}
              ></ha-assist-chip>
            `
          : nothing}
      </div>
    `;

    const search = this.narrow
      ? html`<div slot="header">${searchRow}</div>`
      : searchRow;

    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${header}
        back-path="/config/system"
      >
        ${isComponentLoaded(this.hass, "hassio") && this._logProviders
          ? html`
              <ha-generic-picker
                slot="toolbar-icon"
                .hass=${this.hass}
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
                  ${selectedProvider?.icon
                    ? html`<img
                        src=${selectedProvider.icon}
                        alt=${selectedProvider.primary}
                        slot="start"
                      />`
                    : selectedProvider?.icon_path
                      ? html`<ha-svg-icon
                          slot="start"
                          .path=${selectedProvider.icon_path}
                        ></ha-svg-icon>`
                      : nothing}
                  ${selectedProvider?.primary}
                  <ha-svg-icon slot="end" .path=${mdiChevronDown}></ha-svg-icon>
                </ha-button>
              </ha-generic-picker>
            `
          : nothing}
        ${showSystemLog
          ? html`
              <ha-icon-button
                slot="toolbar-icon"
                .path=${mdiDownload}
                @click=${this._downloadSystemLog}
                .label=${this.hass.localize(
                  "ui.panel.config.logs.download_logs"
                )}
              ></ha-icon-button>
              <ha-icon-button
                slot="toolbar-icon"
                .path=${mdiRefresh}
                @click=${this._refreshSystemLog}
                .label=${this.hass.localize("ui.common.refresh")}
              ></ha-icon-button>
              <ha-dropdown
                slot="toolbar-icon"
                @wa-select=${this._handleSystemLogOverflowAction}
              >
                <ha-icon-button
                  slot="trigger"
                  .path=${mdiDotsVertical}
                  .label=${this.hass.localize("ui.common.menu")}
                ></ha-icon-button>
                <ha-dropdown-item value="show-full-logs">
                  <ha-svg-icon slot="icon" .path=${mdiText}></ha-svg-icon>
                  ${this.hass.localize("ui.panel.config.logs.show_full_logs")}
                </ha-dropdown-item>
              </ha-dropdown>
            `
          : nothing}
        ${search}
        <div class="content">
          ${showSystemLog
            ? html`
                <system-log-card
                  .hass=${this.hass}
                  .filter=${this._filter}
                  .showFilters=${this._showSystemLogFilters}
                  @system-log-filters-changed=${this
                    ._handleSystemLogFiltersChanged}
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
    this._showSystemLogFilters = false;
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
    this._showSystemLogFilters = false;
    this._systemLogFiltersCount = 0;
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

  private _getLogProviderItems = (): PickerComboBoxItem[] =>
    this._logProviders.map((provider) => ({
      id: provider.key,
      primary: provider.name,
      icon: provider.addon
        ? atLeastVersion(this.hass.config.version, 0, 105) &&
          provider.addon.icon
          ? `/api/hassio/addons/${provider.addon.slug}/icon`
          : undefined
        : undefined,
      icon_path: provider.addon
        ? mdiPuzzle
        : this._getProviderIconPath(provider.key),
    }));

  private _providerRenderer = (item: PickerComboBoxItem) => html`
    <ha-combo-box-item type="button" compact>
      ${item.icon
        ? html`<img src=${item.icon} alt=${item.primary} slot="start" />`
        : item.icon_path
          ? html`<ha-svg-icon
              slot="start"
              .path=${item.icon_path}
            ></ha-svg-icon>`
          : nothing}
      <span slot="headline">${item.primary}</span>
      ${item.secondary
        ? html`<span slot="supporting-text">${item.secondary}</span>`
        : nothing}
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
        icon: provider.addon
          ? atLeastVersion(this.hass.config.version, 0, 105) &&
            provider.addon.icon
            ? `/api/hassio/addons/${provider.addon.slug}/icon`
            : undefined
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
          -ms-user-select: initial;
          -webkit-user-select: initial;
          -moz-user-select: initial;
        }
        .search-row {
          position: sticky;
          top: 0;
          z-index: 2;
          display: flex;
          align-items: center;
          height: 56px;
          width: 100%;
          gap: var(--ha-space-4);
          padding: 0 var(--ha-space-4);
          background: var(--primary-background-color);
          border-bottom: 1px solid var(--divider-color);
          box-sizing: border-box;
        }

        .search-row.with-pane {
          display: grid;
          grid-template-columns:
            var(--sidepane-width, 250px) minmax(0, 1fr)
            auto;
          align-items: center;
          gap: 0;
          padding: 0;
        }

        .search-row.with-pane .filter-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-width: 0;
          width: 100%;
          height: 100%;
          padding: 0 var(--ha-space-4);
          border-inline-end: 1px solid var(--divider-color);
          box-sizing: border-box;
        }

        .search-row.with-pane .search-input {
          width: 100%;
          min-width: 0;
          margin-inline-start: var(--ha-space-4);
        }

        .search-row.with-pane .clear-chip {
          justify-self: end;
          margin-inline-start: var(--ha-space-4);
          margin-inline-end: var(--ha-space-4);
        }

        search-input-outlined {
          display: block;
          flex: 1;
        }

        .relative {
          position: relative;
        }

        .badge {
          position: absolute;
          top: -4px;
          right: -4px;
          inset-inline-end: -4px;
          inset-inline-start: initial;
          min-width: 16px;
          box-sizing: border-box;
          border-radius: var(--ha-border-radius-circle);
          font-size: var(--ha-font-size-xs);
          font-weight: var(--ha-font-weight-normal);
          background-color: var(--primary-color);
          line-height: var(--ha-line-height-normal);
          text-align: center;
          padding: 0 2px;
          color: var(--text-primary-color);
        }
        .content {
          direction: ltr;
          height: calc(
            100vh -
              1px - var(--header-height, 0px) - var(
                --safe-area-inset-top,
                0px
              ) - var(--safe-area-inset-bottom, 0px) -
              56px
          );
          overflow: hidden;
        }

        ha-assist-chip {
          --ha-assist-chip-container-shape: 10px;
          --ha-assist-chip-container-color: var(--card-background-color);
        }

        .clear-chip {
          white-space: nowrap;
        }
        ha-generic-picker {
          --md-list-item-leading-icon-color: var(--ha-color-primary-50);
          --mdc-icon-size: 32px;
        }

        img {
          height: 32px;
        }

        @media all and (max-width: 870px) {
          ha-generic-picker {
            max-width: max(30%, 160px);
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
