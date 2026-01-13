import {
  mdiChevronDown,
  mdiChip,
  mdiDns,
  mdiPackageVariant,
  mdiPuzzle,
  mdiRadar,
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
import "../../../components/ha-generic-picker";
import type { HaGenericPicker } from "../../../components/ha-generic-picker";
import type { PickerComboBoxItem } from "../../../components/ha-picker-combo-box";
import "../../../components/search-input";
import type { LogProvider } from "../../../data/error_log";
import { fetchHassioAddonsInfo } from "../../../data/hassio/addon";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-subpage";
import { mdiHomeAssistant } from "../../../resources/home-assistant-logo-svg";
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

  @query("ha-generic-picker") private providerPicker?: HaGenericPicker;

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

    const selectedProvider = this._getActiveProvider(this._selectedLogProvider);

    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize("ui.panel.config.logs.caption")}
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

  private _openPicker(ev: Event) {
    ev.stopPropagation();
    this.providerPicker?.open();
  }

  private _handleDropdownSelect(ev: CustomEvent<{ value: string }>) {
    const provider = ev.detail?.value;
    if (!provider) {
      return;
    }
    this._selectedLogProvider = provider;
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
