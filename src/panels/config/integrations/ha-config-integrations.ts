import { ActionDetail } from "@material/mwc-list";
import { mdiFilterVariant, mdiPlus } from "@mdi/js";
import Fuse from "fuse.js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { fireEvent, HASSDomEvent } from "../../../common/dom/fire_event";
import { protocolIntegrationPicked } from "../../../common/integrations/protocolIntegrationPicked";
import { navigate } from "../../../common/navigate";
import { caseInsensitiveStringCompare } from "../../../common/string/compare";
import type { LocalizeFunc } from "../../../common/translations/localize";
import { extractSearchParam } from "../../../common/url/search-params";
import { nextRender } from "../../../common/util/render-status";
import "../../../components/ha-button-menu";
import "../../../components/ha-check-list-item";
import "../../../components/ha-checkbox";
import "../../../components/ha-fab";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import "../../../components/search-input";
import { ConfigEntry, getConfigEntries } from "../../../data/config_entries";
import {
  getConfigFlowHandlers,
  getConfigFlowInProgressCollection,
  localizeConfigFlowTitle,
  subscribeConfigFlowInProgress,
} from "../../../data/config_flow";
import type { DataEntryFlowProgress } from "../../../data/data_entry_flow";
import {
  DeviceRegistryEntry,
  subscribeDeviceRegistry,
} from "../../../data/device_registry";
import { fetchDiagnosticHandlers } from "../../../data/diagnostics";
import {
  EntityRegistryEntry,
  subscribeEntityRegistry,
} from "../../../data/entity_registry";
import {
  domainToName,
  fetchIntegrationManifests,
  IntegrationManifest,
} from "../../../data/integration";
import {
  getSupportedBrands,
  getSupportedBrandsLookup,
} from "../../../data/supported_brands";
import { scanUSBDevices } from "../../../data/usb";
import { showConfigFlowDialog } from "../../../dialogs/config-flow/show-dialog-config-flow";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-loading-screen";
import "../../../layouts/hass-tabs-subpage";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant, Route } from "../../../types";
import { configSections } from "../ha-panel-config";
import { HELPER_DOMAINS } from "../helpers/const";
import "./ha-config-flow-card";
import "./ha-ignored-config-entry-card";
import "./ha-integration-card";
import type { HaIntegrationCard } from "./ha-integration-card";
import "./ha-integration-overflow-menu";

export interface ConfigEntryUpdatedEvent {
  entry: ConfigEntry;
}

export interface ConfigEntryRemovedEvent {
  entryId: string;
}

declare global {
  // for fire event
  interface HASSDomEvents {
    "entry-updated": ConfigEntryUpdatedEvent;
    "entry-removed": ConfigEntryRemovedEvent;
  }
}

export interface DataEntryFlowProgressExtended extends DataEntryFlowProgress {
  localized_title?: string;
}

export interface ConfigEntryExtended extends ConfigEntry {
  localized_domain_name?: string;
}

const groupByIntegration = (
  entries: ConfigEntryExtended[]
): Map<string, ConfigEntryExtended[]> => {
  const result = new Map();
  entries.forEach((entry) => {
    if (result.has(entry.domain)) {
      result.get(entry.domain).push(entry);
    } else {
      result.set(entry.domain, [entry]);
    }
  });
  return result;
};

@customElement("ha-config-integrations")
class HaConfigIntegrations extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow!: boolean;

  @property() public isWide!: boolean;

  @property() public showAdvanced!: boolean;

  @property() public route!: Route;

  @state() private _configEntries?: ConfigEntryExtended[];

  @property()
  private _configEntriesInProgress: DataEntryFlowProgressExtended[] = [];

  @state()
  private _entityRegistryEntries: EntityRegistryEntry[] = [];

  @state()
  private _deviceRegistryEntries: DeviceRegistryEntry[] = [];

  @state()
  private _manifests: Record<string, IntegrationManifest> = {};

  private _extraFetchedManifests?: Set<string>;

  @state() private _showIgnored = false;

  @state() private _showDisabled = false;

  @state() private _searchParms = new URLSearchParams(
    window.location.hash.substring(1)
  );

  @state() private _filter: string = history.state?.filter || "";

  @state() private _diagnosticHandlers?: Record<string, boolean>;

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeEntityRegistry(this.hass.connection, (entries) => {
        this._entityRegistryEntries = entries;
      }),
      subscribeDeviceRegistry(this.hass.connection, (entries) => {
        this._deviceRegistryEntries = entries;
      }),
      subscribeConfigFlowInProgress(this.hass, async (flowsInProgress) => {
        const integrations: Set<string> = new Set();
        const manifests: Set<string> = new Set();
        flowsInProgress.forEach((flow) => {
          // To render title placeholders
          if (flow.context.title_placeholders) {
            integrations.add(flow.handler);
          }
          manifests.add(flow.handler);
        });
        await this.hass.loadBackendTranslation(
          "config",
          Array.from(integrations)
        );
        this._fetchIntegrationManifests(manifests);
        await nextRender();
        this._configEntriesInProgress = flowsInProgress.map((flow) => ({
          ...flow,
          localized_title: localizeConfigFlowTitle(this.hass.localize, flow),
        }));
      }),
    ];
  }

  private _filterConfigEntries = memoizeOne(
    (
      configEntries: ConfigEntryExtended[],
      filter?: string
    ): ConfigEntryExtended[] => {
      if (!filter) {
        return [...configEntries];
      }
      const options: Fuse.IFuseOptions<ConfigEntryExtended> = {
        keys: ["domain", "localized_domain_name", "title"],
        isCaseSensitive: false,
        minMatchCharLength: 2,
        threshold: 0.2,
      };
      const fuse = new Fuse(configEntries, options);
      return fuse.search(filter).map((result) => result.item);
    }
  );

  private _filterGroupConfigEntries = memoizeOne(
    (
      configEntries: ConfigEntryExtended[],
      filter?: string
    ): [
      Map<string, ConfigEntryExtended[]>,
      ConfigEntryExtended[],
      Map<string, ConfigEntryExtended[]>,
      // Counter for disabled integrations since the tuple element above will
      // be grouped by the integration name and therefore not provide a valid count
      number
    ] => {
      const filteredConfigEnties = this._filterConfigEntries(
        configEntries,
        filter
      );
      const ignored: ConfigEntryExtended[] = [];
      const disabled: ConfigEntryExtended[] = [];
      for (let i = filteredConfigEnties.length - 1; i >= 0; i--) {
        if (filteredConfigEnties[i].source === "ignore") {
          ignored.push(filteredConfigEnties.splice(i, 1)[0]);
        } else if (filteredConfigEnties[i].disabled_by !== null) {
          disabled.push(filteredConfigEnties.splice(i, 1)[0]);
        }
      }
      return [
        groupByIntegration(filteredConfigEnties),
        ignored,
        groupByIntegration(disabled),
        disabled.length,
      ];
    }
  );

  private _filterConfigEntriesInProgress = memoizeOne(
    (
      configEntriesInProgress: DataEntryFlowProgressExtended[],
      filter?: string
    ): DataEntryFlowProgressExtended[] => {
      if (!filter) {
        return configEntriesInProgress;
      }
      const options: Fuse.IFuseOptions<DataEntryFlowProgressExtended> = {
        keys: ["handler", "localized_title"],
        isCaseSensitive: false,
        minMatchCharLength: 2,
        threshold: 0.2,
      };
      const fuse = new Fuse(configEntriesInProgress, options);
      return fuse.search(filter).map((result) => result.item);
    }
  );

  protected firstUpdated(changed: PropertyValues) {
    super.firstUpdated(changed);
    this._loadConfigEntries();
    const localizePromise = this.hass.loadBackendTranslation(
      "title",
      undefined,
      true
    );
    this._fetchManifests();
    if (this.route.path === "/add") {
      this._handleAdd(localizePromise);
    }
    this._scanUSBDevices();
    if (isComponentLoaded(this.hass, "diagnostics")) {
      fetchDiagnosticHandlers(this.hass).then((infos) => {
        const handlers = {};
        for (const info of infos) {
          handlers[info.domain] = info.handlers.config_entry;
        }
        this._diagnosticHandlers = handlers;
      });
    }
  }

  protected updated(changed: PropertyValues) {
    super.updated(changed);
    if (
      this._searchParms.has("config_entry") &&
      changed.has("_configEntries") &&
      !changed.get("_configEntries") &&
      this._configEntries
    ) {
      this._highlightEntry();
    }
  }

  protected render(): TemplateResult {
    if (!this._configEntries) {
      return html`<hass-loading-screen
        .hass=${this.hass}
        .narrow=${this.narrow}
      ></hass-loading-screen>`;
    }
    const [
      groupedConfigEntries,
      ignoredConfigEntries,
      disabledConfigEntries,
      disabledCount,
    ] = this._filterGroupConfigEntries(this._configEntries, this._filter);
    const configEntriesInProgress = this._filterConfigEntriesInProgress(
      this._configEntriesInProgress,
      this._filter
    );

    const filterMenu = html`
      <div slot=${ifDefined(this.narrow ? "toolbar-icon" : "suffix")}>
        <div class="menu-badge-container">
          ${!this._showDisabled && this.narrow && disabledCount
            ? html`<span class="badge">${disabledCount}</span>`
            : ""}
          <ha-button-menu
            corner="BOTTOM_START"
            multi
            @action=${this._handleMenuAction}
            @click=${this._preventDefault}
          >
            <ha-icon-button
              slot="trigger"
              .label=${this.hass.localize("ui.common.menu")}
              .path=${mdiFilterVariant}
            >
            </ha-icon-button>
            <ha-check-list-item left .selected=${this._showIgnored}>
              ${this.hass.localize(
                "ui.panel.config.integrations.ignore.show_ignored"
              )}
            </ha-check-list-item>
            <ha-check-list-item left .selected=${this._showDisabled}>
              ${this.hass.localize(
                "ui.panel.config.integrations.disable.show_disabled"
              )}
            </ha-check-list-item>
          </ha-button-menu>
        </div>
        ${this.narrow
          ? html`
              <ha-integration-overflow-menu
                .hass=${this.hass}
                slot="toolbar-icon"
              ></ha-integration-overflow-menu>
            `
          : ""}
      </div>
    `;

    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config"
        .route=${this.route}
        .tabs=${configSections.devices}
      >
        ${this.narrow
          ? html`
              <div slot="header">
                <search-input
                  .hass=${this.hass}
                  .filter=${this._filter}
                  class="header"
                  @value-changed=${this._handleSearchChange}
                  .label=${this.hass.localize(
                    "ui.panel.config.integrations.search"
                  )}
                ></search-input>
              </div>
              ${filterMenu}
            `
          : html`
              <ha-integration-overflow-menu
                .hass=${this.hass}
                slot="toolbar-icon"
              ></ha-integration-overflow-menu>
              <div class="search">
                <search-input
                  .hass=${this.hass}
                  suffix
                  .filter=${this._filter}
                  @value-changed=${this._handleSearchChange}
                  .label=${this.hass.localize(
                    "ui.panel.config.integrations.search"
                  )}
                >
                  ${!this._showDisabled && disabledCount
                    ? html`<div
                        class="active-filters"
                        slot="suffix"
                        @click=${this._preventDefault}
                      >
                        ${this.hass.localize(
                          "ui.panel.config.integrations.disable.disabled_integrations",
                          { number: disabledCount }
                        )}
                        <mwc-button
                          @click=${this._toggleShowDisabled}
                          .label=${this.hass.localize(
                            "ui.panel.config.integrations.disable.show"
                          )}
                        ></mwc-button>
                      </div>`
                    : ""}
                  ${filterMenu}
                </search-input>
              </div>
            `}

        <div
          class="container"
          @entry-removed=${this._handleEntryRemoved}
          @entry-updated=${this._handleEntryUpdated}
        >
          ${this._showIgnored
            ? ignoredConfigEntries.map(
                (entry: ConfigEntryExtended) => html`
                  <ha-ignored-config-entry-card
                    .hass=${this.hass}
                    .manifest=${this._manifests[entry.domain]}
                    .entry=${entry}
                    @change=${this._handleFlowUpdated}
                  ></ha-ignored-config-entry-card>
                `
              )
            : ""}
          ${configEntriesInProgress.length
            ? configEntriesInProgress.map(
                (flow: DataEntryFlowProgressExtended) => html`
                  <ha-config-flow-card
                    .hass=${this.hass}
                    .manifest=${this._manifests[flow.handler]}
                    .flow=${flow}
                    @change=${this._handleFlowUpdated}
                  ></ha-config-flow-card>
                `
              )
            : ""}
          ${this._showDisabled
            ? Array.from(disabledConfigEntries.entries()).map(
                ([domain, items]) =>
                  html`<ha-integration-card
                    data-domain=${domain}
                    disabled
                    .hass=${this.hass}
                    .domain=${domain}
                    .items=${items}
                    .manifest=${this._manifests[domain]}
                    .entityRegistryEntries=${this._entityRegistryEntries}
                    .deviceRegistryEntries=${this._deviceRegistryEntries}
                  ></ha-integration-card> `
              )
            : ""}
          ${groupedConfigEntries.size
            ? Array.from(groupedConfigEntries.entries()).map(
                ([domain, items]) =>
                  html`<ha-integration-card
                    data-domain=${domain}
                    .hass=${this.hass}
                    .domain=${domain}
                    .items=${items}
                    .manifest=${this._manifests[domain]}
                    .entityRegistryEntries=${this._entityRegistryEntries}
                    .deviceRegistryEntries=${this._deviceRegistryEntries}
                    .supportsDiagnostics=${this._diagnosticHandlers
                      ? this._diagnosticHandlers[domain]
                      : false}
                  ></ha-integration-card>`
              )
            : this._filter &&
              !configEntriesInProgress.length &&
              !groupedConfigEntries.size &&
              this._configEntries.length
            ? html`
                <div class="empty-message">
                  <h1>
                    ${this.hass.localize(
                      "ui.panel.config.integrations.none_found"
                    )}
                  </h1>
                  <p>
                    ${this.hass.localize(
                      "ui.panel.config.integrations.none_found_detail"
                    )}
                  </p>
                  <mwc-button
                    @click=${this._createFlow}
                    unelevated
                    .label=${this.hass.localize(
                      "ui.panel.config.integrations.add_integration"
                    )}
                  ></mwc-button>
                </div>
              `
            : // If we have a filter, never show a card
            this._filter
            ? ""
            : // If we're showing 0 cards, show empty state text
            (!this._showIgnored || ignoredConfigEntries.length === 0) &&
              (!this._showDisabled || disabledConfigEntries.size === 0) &&
              groupedConfigEntries.size === 0
            ? html`
                <div class="empty-message">
                  <h1>
                    ${this.hass.localize("ui.panel.config.integrations.none")}
                  </h1>
                  <p>
                    ${this.hass.localize(
                      "ui.panel.config.integrations.no_integrations"
                    )}
                  </p>
                  <mwc-button
                    @click=${this._createFlow}
                    unelevated
                    .label=${this.hass.localize(
                      "ui.panel.config.integrations.add_integration"
                    )}
                  ></mwc-button>
                </div>
              `
            : ""}
        </div>
        <ha-fab
          slot="fab"
          .label=${this.hass.localize(
            "ui.panel.config.integrations.add_integration"
          )}
          extended
          @click=${this._createFlow}
        >
          <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
        </ha-fab>
      </hass-tabs-subpage>
    `;
  }

  private _preventDefault(ev) {
    ev.preventDefault();
  }

  private _loadConfigEntries() {
    getConfigEntries(this.hass, { type: "integration" }).then(
      (configEntries) => {
        this._configEntries = configEntries
          .map(
            (entry: ConfigEntry): ConfigEntryExtended => ({
              ...entry,
              localized_domain_name: domainToName(
                this.hass.localize,
                entry.domain
              ),
            })
          )
          .sort((conf1, conf2) =>
            caseInsensitiveStringCompare(
              conf1.localized_domain_name + conf1.title,
              conf2.localized_domain_name + conf2.title
            )
          );
      }
    );
  }

  private async _scanUSBDevices() {
    if (!isComponentLoaded(this.hass, "usb")) {
      return;
    }
    await scanUSBDevices(this.hass);
  }

  private async _fetchManifests(integrations?: string[]) {
    const fetched = await fetchIntegrationManifests(this.hass, integrations);
    // Make a copy so we can keep track of previously loaded manifests
    // for discovered flows (which are not part of these results)
    const manifests = { ...this._manifests };
    for (const manifest of fetched) manifests[manifest.domain] = manifest;
    this._manifests = manifests;
  }

  private async _fetchIntegrationManifests(integrations: Set<string>) {
    const manifestsToFetch: string[] = [];
    for (const integration of integrations) {
      if (integration in this._manifests) {
        continue;
      }
      if (this._extraFetchedManifests) {
        if (this._extraFetchedManifests.has(integration)) {
          continue;
        }
      } else {
        this._extraFetchedManifests = new Set();
      }
      this._extraFetchedManifests.add(integration);
      manifestsToFetch.push(integration);
    }
    if (manifestsToFetch.length) {
      await this._fetchManifests(manifestsToFetch);
    }
  }

  private _handleEntryRemoved(ev: HASSDomEvent<ConfigEntryRemovedEvent>) {
    this._configEntries = this._configEntries!.filter(
      (entry) => entry.entry_id !== ev.detail.entryId
    );
  }

  private _handleEntryUpdated(ev: HASSDomEvent<ConfigEntryUpdatedEvent>) {
    const newEntry = ev.detail.entry;
    this._configEntries = this._configEntries!.map((entry) =>
      entry.entry_id === newEntry.entry_id
        ? { ...newEntry, localized_domain_name: entry.localized_domain_name }
        : entry
    );
  }

  private _handleFlowUpdated() {
    this._loadConfigEntries();
    getConfigFlowInProgressCollection(this.hass.connection).refresh();
    this._fetchManifests();
  }

  private _createFlow() {
    showConfigFlowDialog(this, {
      searchQuery: this._filter,
      dialogClosedCallback: () => {
        this._handleFlowUpdated();
      },
      showAdvanced: this.showAdvanced,
    });
    // For config entries. Also loading config flow ones for added integration
    this.hass.loadBackendTranslation("title", undefined, true);
  }

  private _handleMenuAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        this._showIgnored = !this._showIgnored;
        break;
      case 1:
        this._toggleShowDisabled();
        break;
    }
  }

  private _toggleShowDisabled() {
    this._showDisabled = !this._showDisabled;
  }

  private _handleSearchChange(ev: CustomEvent) {
    this._filter = ev.detail.value;
    history.replaceState({ filter: this._filter }, "");
  }

  private async _highlightEntry() {
    await nextRender();
    const entryId = this._searchParms.get("config_entry")!;
    const configEntry = this._configEntries!.find(
      (entry) => entry.entry_id === entryId
    );
    if (!configEntry) {
      return;
    }
    const card: HaIntegrationCard = this.shadowRoot!.querySelector(
      `[data-domain=${configEntry?.domain}]`
    ) as HaIntegrationCard;
    if (card) {
      card.scrollIntoView({
        block: "center",
      });
      card.classList.add("highlight");
      card.selectedConfigEntryId = entryId;
    }
  }

  private async _handleAdd(localizePromise: Promise<LocalizeFunc>) {
    const domain = extractSearchParam("domain");
    navigate("/config/integrations", { replace: true });
    if (!domain) {
      return;
    }

    const handlers = await getConfigFlowHandlers(this.hass, "integration");

    // Integration exists, so we can just create a flow
    if (handlers.includes(domain)) {
      const localize = await localizePromise;
      if (
        await showConfirmationDialog(this, {
          title: localize("ui.panel.config.integrations.confirm_new", {
            integration: domainToName(localize, domain),
          }),
        })
      ) {
        showConfigFlowDialog(this, {
          dialogClosedCallback: () => {
            this._handleFlowUpdated();
          },
          startFlowHandler: domain,
          manifest: this._manifests[domain],
          showAdvanced: this.hass.userData?.showAdvanced,
        });
      }
      return;
    }

    const supportedBrands = await getSupportedBrands(this.hass);
    const supportedBrandsIntegrations =
      getSupportedBrandsLookup(supportedBrands);

    // Supported brand exists, so we can just create a flow
    if (Object.keys(supportedBrandsIntegrations).includes(domain)) {
      const brand = supportedBrandsIntegrations[domain];
      const slug = brand.supported_flows![0];

      showConfirmationDialog(this, {
        text: this.hass.localize(
          "ui.panel.config.integrations.config_flow.supported_brand_flow",
          {
            supported_brand: brand.name,
            flow_domain_name: domainToName(this.hass.localize, slug),
          }
        ),
        confirm: () => {
          if (["zha", "zwave_js"].includes(slug)) {
            protocolIntegrationPicked(this, this.hass, slug);
            return;
          }

          fireEvent(this, "handler-picked", {
            handler: slug,
          });
        },
      });

      return;
    }

    // If not an integration or supported brand, try helper else show alert
    if (HELPER_DOMAINS.includes(domain)) {
      navigate(`/config/helpers/add?domain=${domain}`, {
        replace: true,
      });
      return;
    }
    const helpers = await getConfigFlowHandlers(this.hass, "helper");
    if (helpers.includes(domain)) {
      navigate(`/config/helpers/add?domain=${domain}`, {
        replace: true,
      });
      return;
    }
    showAlertDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.integrations.config_flow.error"
      ),
      text: this.hass.localize(
        "ui.panel.config.integrations.config_flow.no_config_flow"
      ),
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host([narrow]) hass-tabs-subpage {
          --main-title-margin: 0;
        }
        ha-button-menu {
          margin-left: 8px;
        }
        .container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          grid-gap: 16px 16px;
          padding: 8px 16px 16px;
          margin-bottom: 64px;
        }
        .container > * {
          max-width: 500px;
        }

        .empty-message {
          margin: auto;
          text-align: center;
        }
        .empty-message h1 {
          margin-bottom: 0;
        }
        search-input {
          --mdc-text-field-fill-color: var(--sidebar-background-color);
          --mdc-text-field-idle-line-color: var(--divider-color);
          --text-field-overflow: visible;
        }
        search-input.header {
          display: block;
          color: var(--secondary-text-color);
          margin-left: 8px;
          --mdc-ripple-color: transparant;
        }
        .search {
          display: flex;
          justify-content: flex-end;
          width: 100%;
          align-items: center;
          height: 56px;
          position: sticky;
          top: 0;
          z-index: 2;
        }
        .search search-input {
          display: block;
          position: absolute;
          top: 0;
          right: 0;
          left: 0;
        }
        .active-filters {
          color: var(--primary-text-color);
          position: relative;
          display: flex;
          align-items: center;
          padding: 2px 2px 2px 8px;
          font-size: 14px;
          width: max-content;
          cursor: initial;
        }
        .active-filters mwc-button {
          margin-left: 8px;
        }
        .active-filters::before {
          background-color: var(--primary-color);
          opacity: 0.12;
          border-radius: 4px;
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          content: "";
        }
        .badge {
          min-width: 20px;
          box-sizing: border-box;
          border-radius: 50%;
          font-weight: 400;
          background-color: var(--primary-color);
          line-height: 20px;
          text-align: center;
          padding: 0px 4px;
          color: var(--text-primary-color);
          position: absolute;
          right: 0px;
          top: 4px;
          font-size: 0.65em;
        }
        .menu-badge-container {
          position: relative;
        }
        ha-button-menu {
          color: var(--primary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-integrations": HaConfigIntegrations;
  }
}
