import {
  mdiChevronDown,
  mdiChip,
  mdiDns,
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
import type { HASSDomTargetEvent } from "../../../common/dom/fire_event";
import { navigate } from "../../../common/navigate";
import { stringCompare } from "../../../common/string/compare";
import { extractSearchParam } from "../../../common/url/search-params";
import "../../../components/ha-app-icon";
import "../../../components/ha-button";
import "../../../components/ha-combo-box-item";
import "../../../components/ha-domain-icon";
import "../../../components/ha-generic-picker";
import type { HaGenericPicker } from "../../../components/ha-generic-picker";
import type { PickerComboBoxItem } from "../../../components/ha-picker-combo-box";
import "../../../components/input/ha-input-search";
import type { HaInputSearch } from "../../../components/input/ha-input-search";
import type { LogProvider } from "../../../data/error_log";
import {
  fetchHassioAddonsInfo,
  type HassioAddonInfo,
} from "../../../data/hassio/addon";
import {
  domainToName,
  fetchIntegrationManifest,
  type IntegrationManifest,
} from "../../../data/integration";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-subpage";
import { mdiHomeAssistant } from "../../../resources/home-assistant-logo-svg";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant, Route, ValueChangedEvent } from "../../../types";
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

  @state() private _filter = extractSearchParam("filter") || "";

  @state() private _detail = false;

  @query("system-log-card") private systemLog?: SystemLogCard;

  @query("#provider-picker") private providerPicker?: HaGenericPicker;

  @state() private _selectedLogProvider = "core";

  @state() private _integration?: string;

  @state() private _integrationManifest?: IntegrationManifest;

  @state() private _logProviders = logProviders;

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

  private async _filterChanged(ev: HASSDomTargetEvent<HaInputSearch>) {
    this._filter = ev.target.value ?? "";
  }

  protected render(): TemplateResult {
    const search = html`
      <div class="search">
        <ha-input-search
          appearance="outlined"
          @input=${this._filterChanged}
          .value=${this._filter}
          .placeholder=${this.hass.localize("ui.panel.config.logs.search")}
        ></ha-input-search>
        ${
          this._selectedLogProvider === "core"
            ? html`<ha-generic-picker
                class="integration-picker"
                .hass=${this.hass}
                .value=${this._integration}
                .placeholder=${this.hass.localize(
                  "ui.panel.config.logs.filter_integration"
                )}
                .getItems=${this._getIntegrationItems}
                .rowRenderer=${this._integrationRenderer}
                .valueRenderer=${this._integrationValueRenderer}
                @value-changed=${this._integrationChanged}
              ></ha-generic-picker>`
            : nothing
        }
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
        ${
          isComponentLoaded(this.hass.config, "hassio") && this._logProviders
            ? html`
                <ha-generic-picker
                  id="provider-picker"
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
        ${search}
        <div class="content">
          ${
            this._selectedLogProvider === "core" && !this._detail
              ? html`
                  <system-log-card
                    .hass=${this.hass}
                    .header=${
                      this._logProviders.find(
                        (p) => p.key === this._selectedLogProvider
                      )!.name
                    }
                    .filter=${this._filter}
                    .integration=${this._integration}
                    .integrationLoggers=${this._getIntegrationLoggers(
                      this._integration,
                      this._integrationManifest
                    )}
                    @switch-log-view=${this._showDetail}
                  ></system-log-card>
                `
              : html`<error-log-card
                  .hass=${this.hass}
                  .header=${
                    this._logProviders.find(
                      (p) => p.key === this._selectedLogProvider
                    )!.name
                  }
                  .filter=${this._filter}
                  .provider=${this._selectedLogProvider}
                  .integration=${
                    this._selectedLogProvider === "core"
                      ? this._integration
                      : undefined
                  }
                  @switch-log-view=${this._showDetail}
                  allow-switch
                ></error-log-card>`
          }
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

  private _handleDropdownSelect(ev: ValueChangedEvent<string>) {
    const provider = ev.detail?.value;
    if (!provider) {
      return;
    }
    this._selectedLogProvider = provider;
    this._filter = "";
    this._setIntegration(undefined);
    navigate(`/config/logs?provider=${this._selectedLogProvider}`);
  }

  private _integrationChanged(ev: ValueChangedEvent<string | undefined>) {
    ev.stopPropagation();
    const integration = ev.detail.value || undefined;
    if (integration === this._integration) {
      return;
    }
    this._setIntegration(integration);
    const params = new URLSearchParams();
    if (isComponentLoaded(this.hass.config, "hassio")) {
      params.set("provider", this._selectedLogProvider);
    }
    if (integration) {
      params.set("integration", integration);
    }
    const search = params.toString();
    navigate(`/config/logs${search ? `?${search}` : ""}`, { replace: true });
  }

  private _setIntegration(integration: string | undefined) {
    this._integration = integration;
    this._integrationManifest = undefined;
    if (!integration) {
      return;
    }
    fetchIntegrationManifest(this.hass, integration).then(
      (manifest) => {
        if (this._integration === integration) {
          this._integrationManifest = manifest;
        }
      },
      () => {
        // Filter on the integration's own logger only
      }
    );
  }

  private async _init() {
    const integration = extractSearchParam("integration");
    if (isComponentLoaded(this.hass.config, "hassio")) {
      await this._getInstalledAddons();
    }
    const providerKey = extractSearchParam("provider");
    if (providerKey) {
      if (
        isComponentLoaded(this.hass.config, "hassio") &&
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
    if (
      integration &&
      this._selectedLogProvider === "core" &&
      this._getLoadedIntegrations(this.hass.config.components).includes(
        integration
      )
    ) {
      this._setIntegration(integration);
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

  private _getLoadedIntegrations = memoizeOne((components: string[]) =>
    components.filter((component) => !component.includes("."))
  );

  private _getIntegrationItems = (): PickerComboBoxItem[] =>
    this._getLoadedIntegrations(this.hass.config.components).map((domain) => {
      const name = domainToName(this.hass.localize, domain);
      return {
        id: domain,
        primary: name,
        icon: domain,
        sorting_label: name,
      };
    });

  private _getIntegrationLoggers = memoizeOne(
    (
      integration: string | undefined,
      manifest: IntegrationManifest | undefined
    ): string[] | undefined =>
      integration
        ? [
            `homeassistant.components.${integration}`,
            `custom_components.${integration}`,
            ...(manifest?.loggers ?? []),
          ]
        : undefined
  );

  private _integrationRenderer = (item: PickerComboBoxItem) => html`
    <ha-combo-box-item>
      <ha-domain-icon
        slot="start"
        .domain=${item.id}
        brand-fallback
      ></ha-domain-icon>
      <span slot="headline">${item.primary}</span>
    </ha-combo-box-item>
  `;

  private _integrationValueRenderer = (domain: string) => html`
    <ha-domain-icon
      slot="start"
      .domain=${domain}
      brand-fallback
    ></ha-domain-icon>
    <span slot="headline">${domainToName(this.hass.localize, domain)}</span>
  `;

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
        .search {
          position: sticky;
          top: 0;
          z-index: 2;
        }
        .search {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: var(--ha-space-3);
          padding: var(--ha-space-3);
          background: var(--sidebar-background-color);
          border-bottom: 1px solid var(--divider-color);
        }
        .search ha-input-search {
          flex: 2 1 240px;
        }
        .search ha-generic-picker.integration-picker {
          flex: 1 1 200px;
          max-width: none;
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
