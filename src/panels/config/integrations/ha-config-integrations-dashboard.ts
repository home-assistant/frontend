import type { ActionDetail } from "@material/mwc-list";
import { mdiFilterVariant, mdiPlus } from "@mdi/js";
import type { IFuseOptions } from "fuse.js";
import Fuse from "fuse.js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import {
  PROTOCOL_INTEGRATIONS,
  protocolIntegrationPicked,
} from "../../../common/integrations/protocolIntegrationPicked";
import { navigate } from "../../../common/navigate";
import { caseInsensitiveStringCompare } from "../../../common/string/compare";
import { extractSearchParam } from "../../../common/url/search-params";
import { nextRender } from "../../../common/util/render-status";
import "../../../components/ha-button-menu";
import "../../../components/ha-check-list-item";
import "../../../components/ha-checkbox";
import "../../../components/ha-fab";
import "../../../components/ha-button";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import "../../../components/search-input";
import "../../../components/search-input-outlined";
import type { ConfigEntry } from "../../../data/config_entries";
import { getConfigEntries } from "../../../data/config_entries";
import { fetchDiagnosticHandlers } from "../../../data/diagnostics";
import type { EntityRegistryEntry } from "../../../data/entity_registry";
import { subscribeEntityRegistry } from "../../../data/entity_registry";
import { fetchEntitySourcesWithCache } from "../../../data/entity_sources";
import type {
  IntegrationLogInfo,
  IntegrationManifest,
} from "../../../data/integration";
import {
  domainToName,
  fetchIntegrationManifest,
  fetchIntegrationManifests,
  subscribeLogInfo,
} from "../../../data/integration";
import {
  findIntegration,
  getIntegrationDescriptions,
} from "../../../data/integrations";
import { scanUSBDevices } from "../../../data/usb";
import { showConfigFlowDialog } from "../../../dialogs/config-flow/show-dialog-config-flow";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import type { ImprovDiscoveredDevice } from "../../../external_app/external_messaging";
import "../../../layouts/hass-loading-screen";
import "../../../layouts/hass-tabs-subpage";
import { KeyboardShortcutMixin } from "../../../mixins/keyboard-shortcut-mixin";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant, Route } from "../../../types";
import { configSections } from "../ha-panel-config";
import { isHelperDomain } from "../helpers/const";
import "./ha-config-flow-card";
import type { DataEntryFlowProgressExtended } from "./ha-config-integrations";
import "./ha-disabled-config-entry-card";
import "./ha-ignored-config-entry-card";
import "./ha-integration-card";
import type { HaIntegrationCard } from "./ha-integration-card";
import "./ha-integration-overflow-menu";
import { showAddIntegrationDialog } from "./show-add-integration-dialog";

export interface ConfigEntryExtended extends Omit<ConfigEntry, "entry_id"> {
  entry_id?: string;
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
@customElement("ha-config-integrations-dashboard")
class HaConfigIntegrationsDashboard extends KeyboardShortcutMixin(
  SubscribeMixin(LitElement)
) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ attribute: false }) public showAdvanced = false;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: false }) public configEntries?: ConfigEntryExtended[];

  @property({ attribute: false })
  public configEntriesInProgress?: DataEntryFlowProgressExtended[];

  @state() private _improvDiscovered = new Map<
    string,
    ImprovDiscoveredDevice
  >();

  @state()
  private _entityRegistryEntries: EntityRegistryEntry[] = [];

  @state()
  private _manifests: Record<string, IntegrationManifest> = {};

  @state() private _domainEntities: Record<string, string[]> = {};

  private _extraFetchedManifests?: Set<string>;

  @state() private _showIgnored = false;

  @state() private _showDisabled = false;

  @state() private _searchParms = new URLSearchParams(
    window.location.hash.substring(1)
  );

  @state() private _filter: string = history.state?.filter || "";

  @state() private _diagnosticHandlers?: Record<string, boolean>;

  @state() private _logInfos?: Record<string, IntegrationLogInfo>;

  @query("search-input-outlined") private _searchInput!: HTMLElement;

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener(
      "improv-discovered-device",
      this._handleImprovDiscovered
    );
    window.removeEventListener(
      "improv-device-setup-done",
      this._reScanImprovDevices
    );
  }

  public hassSubscribe(): (UnsubscribeFunc | Promise<UnsubscribeFunc>)[] {
    return [
      subscribeEntityRegistry(this.hass.connection, (entries) => {
        this._entityRegistryEntries = entries;
      }),
      subscribeLogInfo(this.hass.connection, (log_infos) => {
        const logInfoLookup: Record<string, IntegrationLogInfo> = {};
        for (const log_info of log_infos) {
          logInfoLookup[log_info.domain] = log_info;
        }
        this._logInfos = logInfoLookup;
      }),
    ];
  }

  private _filterConfigEntries = memoizeOne(
    (
      components: string[],
      manifests: Record<string, IntegrationManifest>,
      configEntries: ConfigEntryExtended[],
      entityEntries: EntityRegistryEntry[],
      localize: HomeAssistant["localize"],
      filter?: string
    ): [
      [string, ConfigEntryExtended[]][],
      ConfigEntryExtended[],
      ConfigEntryExtended[],
    ] => {
      const entryDomains = new Set(configEntries.map((entry) => entry.domain));

      const domains = new Set<string>();

      for (const component of components) {
        const componentDomain = component.split(".")[0];
        if (
          !entryDomains.has(componentDomain) &&
          manifests[componentDomain] &&
          !manifests[componentDomain].config_flow &&
          (!manifests[componentDomain].integration_type ||
            ["device", "hub", "service", "integration"].includes(
              manifests[componentDomain].integration_type!
            ))
        ) {
          domains.add(componentDomain);
        }
      }

      const nonConfigEntry: ConfigEntryExtended[] = [...domains].map(
        (domain) => ({
          domain,
          localized_domain_name: domainToName(localize, domain),
          title: domain,
          source: "yaml",
          state: "loaded",
          supports_options: false,
          supports_remove_device: false,
          supports_unload: false,
          supports_reconfigure: false,
          supported_subentry_types: {},
          num_subentries: 0,
          pref_disable_new_entities: false,
          pref_disable_polling: false,
          disabled_by: null,
          reason: null,
          error_reason_translation_key: null,
          error_reason_translation_placeholders: null,
        })
      );

      const allEntries = [
        ...configEntries.filter(
          (entry) =>
            entry.supports_options ||
            this._manifests[entry.domain]?.integration_type !== "hardware" ||
            entityEntries.some(
              (entity) => entity.config_entry_id === entry.entry_id
            )
        ),
        ...nonConfigEntry,
      ];

      let filteredConfigEntries: ConfigEntryExtended[];
      const ignored: ConfigEntryExtended[] = [];
      const disabled: ConfigEntryExtended[] = [];
      const integrations: ConfigEntryExtended[] = [];
      if (filter) {
        const options: IFuseOptions<ConfigEntryExtended> = {
          keys: ["domain", "localized_domain_name", "title"],
          isCaseSensitive: false,
          minMatchCharLength: Math.min(filter.length, 2),
          threshold: 0.2,
        };
        const fuse = new Fuse(allEntries, options);
        filteredConfigEntries = fuse
          .search(filter)
          .map((result) => result.item);
      } else {
        filteredConfigEntries = allEntries;
      }

      for (const entry of filteredConfigEntries) {
        if (entry.source === "ignore") {
          ignored.push(entry);
        } else if (entry.disabled_by !== null) {
          disabled.push(entry);
        } else {
          integrations.push(entry);
        }
      }
      return [
        Array.from(groupByIntegration(integrations)).sort((groupA, groupB) =>
          caseInsensitiveStringCompare(
            groupA[1][0].localized_domain_name || groupA[0],
            groupB[1][0].localized_domain_name || groupB[0],
            this.hass.locale.language
          )
        ),
        ignored,
        disabled,
      ];
    }
  );

  private _filterConfigEntriesInProgress = memoizeOne(
    (
      configEntriesInProgress: DataEntryFlowProgressExtended[],
      improvDiscovered: Map<string, ImprovDiscoveredDevice>,
      filter?: string
    ): DataEntryFlowProgressExtended[] => {
      let inProgress = [...configEntriesInProgress];

      const improvDiscoveredArray = Array.from(improvDiscovered.values());

      if (improvDiscoveredArray.length) {
        // filter out native flows that have been discovered by both mobile and local bluetooth
        inProgress = inProgress.filter(
          (flow) =>
            !improvDiscoveredArray.some(
              (discovered) => discovered.name === flow.localized_title
            )
        );

        // add mobile flows to the list
        improvDiscovered.forEach((discovered) => {
          inProgress.push({
            flow_id: "external",
            handler: "improv_ble",
            context: {
              title_placeholders: {
                name: discovered.name,
              },
            },
            step_id: "bluetooth_confirm",
            localized_title: discovered.name,
          });
        });
      }

      let filteredEntries: DataEntryFlowProgressExtended[];
      if (filter) {
        const options: IFuseOptions<DataEntryFlowProgressExtended> = {
          keys: ["handler", "localized_title"],
          isCaseSensitive: false,
          minMatchCharLength: Math.min(filter.length, 2),
          threshold: 0.2,
          ignoreDiacritics: true,
        };
        const fuse = new Fuse(inProgress, options);
        filteredEntries = fuse.search(filter).map((result) => result.item);
      } else {
        filteredEntries = inProgress;
      }
      return filteredEntries.sort((a, b) =>
        caseInsensitiveStringCompare(
          a.localized_title || a.handler,
          b.localized_title || b.handler,
          this.hass.locale.language
        )
      );
    }
  );

  protected firstUpdated(changed: PropertyValues) {
    super.firstUpdated(changed);
    this._fetchManifests();
    this._fetchEntitySources();
    if (this.route.path === "/add") {
      this._handleAdd();
    }
    this._scanUSBDevices();
    this._scanImprovDevices();

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
      (this._searchParms.has("config_entry") ||
        this._searchParms.has("domain")) &&
      changed.has("configEntries") &&
      !changed.get("configEntries") &&
      this.configEntries
    ) {
      this._highlightEntry();
    }
    if (
      changed.has("configEntriesInProgress") &&
      this.configEntriesInProgress
    ) {
      this._fetchIntegrationManifests(
        this.configEntriesInProgress.map((flow) => flow.handler)
      );
    }
    if (changed.has("configEntries") && this.configEntries) {
      this._fetchIntegrationManifests(
        this.configEntries.map((entry) => entry.domain)
      );
    }
  }

  protected render() {
    if (!this.configEntries || !this.configEntriesInProgress) {
      return html`<hass-loading-screen
        .hass=${this.hass}
        .narrow=${this.narrow}
      ></hass-loading-screen>`;
    }
    const [integrations, ignoredConfigEntries, disabledConfigEntries] =
      this._filterConfigEntries(
        this.hass.config.components,
        this._manifests,
        this.configEntries,
        this._entityRegistryEntries,
        this.hass.localize,
        this._filter
      );
    const configEntriesInProgress = this._filterConfigEntriesInProgress(
      this.configEntriesInProgress,
      this._improvDiscovered,
      this._filter
    );

    const filterMenu = html`
      <div slot=${ifDefined(this.narrow ? "toolbar-icon" : undefined)}>
        <div class="menu-badge-container">
          ${!this._showDisabled && this.narrow && disabledConfigEntries.length
            ? html`<span class="badge">${disabledConfigEntries.length}</span>`
            : ""}
          <ha-button-menu multi @action=${this._handleMenuAction}>
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
        has-fab
      >
        ${this.narrow
          ? html`
              <div slot="header" class="header">
                <search-input-outlined
                  .hass=${this.hass}
                  .filter=${this._filter}
                  @value-changed=${this._handleSearchChange}
                  .label=${this.hass.localize(
                    "ui.panel.config.integrations.search"
                  )}
                >
                </search-input-outlined>
              </div>
              ${filterMenu}
            `
          : html`
              <ha-integration-overflow-menu
                .hass=${this.hass}
                slot="toolbar-icon"
              ></ha-integration-overflow-menu>
              <div class="search">
                <search-input-outlined
                  .hass=${this.hass}
                  .filter=${this._filter}
                  @value-changed=${this._handleSearchChange}
                  .label=${this.hass.localize(
                    "ui.panel.config.integrations.search"
                  )}
                >
                </search-input-outlined>
                <div class="filters">
                  ${!this._showDisabled && disabledConfigEntries.length
                    ? html`<div
                        class="active-filters"
                        @click=${this._preventDefault}
                      >
                        ${this.hass.localize(
                          "ui.panel.config.integrations.disable.disabled_integrations",
                          { number: disabledConfigEntries.length }
                        )}
                        <ha-button
                          appearance="plain"
                          size="small"
                          @click=${this._toggleShowDisabled}
                        >
                          ${this.hass.localize(
                            "ui.panel.config.integrations.disable.show"
                          )}
                        </ha-button>
                      </div>`
                    : ""}
                  ${filterMenu}
                </div>
              </div>
            `}
        ${this._showIgnored
          ? html`<h1>
                ${this.hass.localize(
                  "ui.panel.config.integrations.ignore.ignored"
                )}
              </h1>
              <div class="container">
                ${ignoredConfigEntries.length > 0
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
                  : html`${this.hass.localize(
                      "ui.panel.config.integrations.no_ignored_integrations"
                    )}`}
              </div>`
          : ""}
        ${configEntriesInProgress.length
          ? html`<h1>
                ${this.hass.localize("ui.panel.config.integrations.discovered")}
              </h1>
              <div class="container">
                ${configEntriesInProgress.map(
                  (flow: DataEntryFlowProgressExtended) => html`
                    <ha-config-flow-card
                      .hass=${this.hass}
                      .manifest=${this._manifests[flow.handler]}
                      .flow=${flow}
                      @change=${this._handleFlowUpdated}
                    ></ha-config-flow-card>
                  `
                )}
              </div>`
          : ""}
        ${this._showDisabled
          ? html`<h1>
                ${this.hass.localize("ui.panel.config.integrations.disabled")}
              </h1>
              <div class="container">
                ${disabledConfigEntries.length > 0
                  ? disabledConfigEntries.map(
                      (entry: ConfigEntryExtended) => html`
                        <ha-disabled-config-entry-card
                          .hass=${this.hass}
                          .entry=${entry}
                          .manifest=${this._manifests[entry.domain]}
                          .entityRegistryEntries=${this._entityRegistryEntries}
                        ></ha-disabled-config-entry-card>
                      `
                    )
                  : html`${this.hass.localize(
                      "ui.panel.config.integrations.no_disabled_integrations"
                    )}`}
              </div>`
          : ""}
        ${configEntriesInProgress.length ||
        this._showDisabled ||
        this._showIgnored
          ? html`<h1>
              ${this.hass.localize("ui.panel.config.integrations.configured")}
            </h1>`
          : ""}
        <div class="container">
          ${integrations.length
            ? integrations.map(
                ([domain, items]) =>
                  html`<ha-integration-card
                    data-domain=${domain}
                    .hass=${this.hass}
                    .domain=${domain}
                    .items=${items}
                    .manifest=${this._manifests[domain]}
                    .entityRegistryEntries=${this._entityRegistryEntries}
                    .domainEntities=${this._domainEntities[domain] || []}
                    .supportsDiagnostics=${this._diagnosticHandlers
                      ? this._diagnosticHandlers[domain]
                      : false}
                    .logInfo=${this._logInfos
                      ? this._logInfos[domain]
                      : nothing}
                  ></ha-integration-card>`
              )
            : this._filter &&
                !configEntriesInProgress.length &&
                !integrations.length &&
                this.configEntries.length
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
                    <ha-button
                      @click=${this._createFlow}
                      appearance="filled"
                      size="small"
                    >
                      <ha-svg-icon slot="prefix" .path=${mdiPlus}></ha-svg-icon>
                      ${this.hass.localize(
                        "ui.panel.config.integrations.add_integration"
                      )}
                    </ha-button>
                  </div>
                `
              : // If we have a filter, never show a card
                this._filter
                ? ""
                : // If we're showing 0 cards, show empty state text
                  (!this._showIgnored || ignoredConfigEntries.length === 0) &&
                    (!this._showDisabled ||
                      disabledConfigEntries.length === 0) &&
                    integrations.length === 0
                  ? html`
                      <div class="empty-message">
                        <h1>
                          ${this.hass.localize(
                            "ui.panel.config.integrations.none"
                          )}
                        </h1>
                        <p>
                          ${this.hass.localize(
                            "ui.panel.config.integrations.no_integrations"
                          )}
                        </p>
                        <ha-button
                          @click=${this._createFlow}
                          appearance="filled"
                          size="small"
                        >
                          <ha-svg-icon
                            slot="prefix"
                            .path=${mdiPlus}
                          ></ha-svg-icon>
                          ${this.hass.localize(
                            "ui.panel.config.integrations.add_integration"
                          )}
                        </ha-button>
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

  private async _scanUSBDevices() {
    if (!isComponentLoaded(this.hass, "usb")) {
      return;
    }
    await scanUSBDevices(this.hass);
  }

  private _scanImprovDevices() {
    if (!this.hass.auth.external?.config.canSetupImprov) {
      return;
    }

    window.addEventListener(
      "improv-discovered-device",
      this._handleImprovDiscovered
    );

    window.addEventListener(
      "improv-device-setup-done",
      this._reScanImprovDevices
    );

    this.hass.auth.external!.fireMessage({
      type: "improv/scan",
    });
  }

  private _reScanImprovDevices = () => {
    if (!this.hass.auth.external?.config.canSetupImprov) {
      return;
    }
    this._improvDiscovered = new Map();
    this.hass.auth.external!.fireMessage({
      type: "improv/scan",
    });
  };

  private _handleImprovDiscovered = (ev) => {
    this._fetchManifests(["improv_ble"]);
    this._improvDiscovered.set(ev.detail.name, ev.detail);
    // copy for memoize and reactive updates
    this._improvDiscovered = new Map(Array.from(this._improvDiscovered));
  };

  private async _fetchEntitySources() {
    const entitySources = await fetchEntitySourcesWithCache(this.hass);

    const entitiesByDomain = {};

    for (const [entity, source] of Object.entries(entitySources)) {
      if (!(source.domain in entitiesByDomain)) {
        entitiesByDomain[source.domain] = [];
      }
      entitiesByDomain[source.domain].push(entity);
    }

    this._domainEntities = entitiesByDomain;
  }

  private async _fetchManifests(integrations?: string[]) {
    const fetched = await fetchIntegrationManifests(this.hass, integrations);
    // Make a copy so we can keep track of previously loaded manifests
    // for discovered flows (which are not part of these results)
    const manifests = { ...this._manifests };
    for (const manifest of fetched) {
      manifests[manifest.domain] = manifest;
    }
    this._manifests = manifests;
  }

  private async _fetchIntegrationManifests(integrations: string[]) {
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

  private _handleFlowUpdated() {
    this._reScanImprovDevices();
    this._fetchManifests();
  }

  private _createFlow() {
    showAddIntegrationDialog(this, {
      initialFilter: this._filter,
    });
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
    const entryId = this._searchParms.get("config_entry");
    let domain: string | null;
    if (entryId) {
      const configEntry = this.configEntries!.find(
        (entry) => entry.entry_id === entryId
      );
      if (!configEntry) {
        return;
      }
      domain = configEntry.domain;
    } else {
      domain = this._searchParms.get("domain");
    }
    const card: HaIntegrationCard = this.shadowRoot!.querySelector(
      `[data-domain=${domain}]`
    ) as HaIntegrationCard;
    if (card) {
      card.scrollIntoView({
        block: "center",
      });
      card.classList.add("highlight");
    }
  }

  private async _handleAdd() {
    const brand = extractSearchParam("brand");
    const domain = extractSearchParam("domain");
    navigate("/config/integrations", { replace: true });

    if (brand) {
      showAddIntegrationDialog(this, {
        brand,
      });
      return;
    }
    if (!domain) {
      return;
    }

    const descriptions = await getIntegrationDescriptions(this.hass);
    const integrations = {
      ...descriptions.core.integration,
      ...descriptions.custom.integration,
    };

    const integration = findIntegration(integrations, domain);

    if (integration?.config_flow) {
      if (integration.single_config_entry) {
        const configEntries = await getConfigEntries(this.hass, { domain });
        if (configEntries.length > 0) {
          const localize = await this.hass.loadBackendTranslation(
            "title",
            integration.name
          );
          showAlertDialog(this, {
            title: this.hass.localize(
              "ui.panel.config.integrations.config_flow.single_config_entry_title"
            ),
            text: this.hass.localize(
              "ui.panel.config.integrations.config_flow.single_config_entry",
              {
                integration_name: domainToName(localize, integration.name!),
              }
            ),
          });
          return;
        }
      }

      // Integration exists, so we can just create a flow
      const localize = await this.hass.loadBackendTranslation(
        "title",
        domain,
        false
      );
      if (
        await showConfirmationDialog(this, {
          title: localize("ui.panel.config.integrations.confirm_new", {
            integration: integration.name || domainToName(localize, domain),
          }),
        })
      ) {
        showAddIntegrationDialog(this, {
          domain,
        });
      }
      return;
    }

    if (integration?.supported_by) {
      // Integration is an alias, so we can just create a flow
      const localize = await this.hass.loadBackendTranslation(
        "title",
        domain,
        false
      );
      const supportedIntegration = findIntegration(
        integrations,
        integration.supported_by
      );

      if (!supportedIntegration) {
        return;
      }

      showConfirmationDialog(this, {
        text: this.hass.localize(
          "ui.panel.config.integrations.config_flow.supported_brand_flow",
          {
            supported_brand: integration.name || domainToName(localize, domain),
            flow_domain_name:
              supportedIntegration.name ||
              domainToName(localize, integration.supported_by),
          }
        ),
        confirm: async () => {
          if (
            (PROTOCOL_INTEGRATIONS as readonly string[]).includes(
              integration.supported_by!
            )
          ) {
            protocolIntegrationPicked(
              this,
              this.hass,
              integration.supported_by!
            );
            return;
          }
          showConfigFlowDialog(this, {
            dialogClosedCallback: () => {
              this._handleFlowUpdated();
            },
            startFlowHandler: integration.supported_by,
            manifest: await fetchIntegrationManifest(
              this.hass,
              integration.supported_by!
            ),
            showAdvanced: this.hass.userData?.showAdvanced,
          });
        },
      });
      return;
    }

    // If not an integration or supported brand, try helper else show alert
    if (isHelperDomain(domain)) {
      navigate(`/config/helpers/add?domain=${domain}`, {
        replace: true,
      });
      return;
    }
    const helpers = {
      ...descriptions.core.helper,
      ...descriptions.custom.helper,
    };
    const helper = findIntegration(helpers, domain);
    if (helper) {
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

  protected supportedShortcuts(): SupportedShortcuts {
    return {
      f: () => this._searchInput.focus(),
    };
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
          margin-inline-start: 8px;
          margin-inline-end: initial;
          direction: var(--direction);
        }
        .container {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          grid-gap: 8px 8px;
          padding: 8px 16px 16px;
        }
        .empty-message {
          margin: auto;
          text-align: center;
          grid-column-start: 1;
          grid-column-end: -1;
        }
        .empty-message h1 {
          margin: 0;
        }
        search-input-outlined {
          flex: 1;
        }
        .header {
          display: flex;
        }
        .search {
          display: flex;
          justify-content: space-between;
          width: 100%;
          align-items: center;
          height: 56px;
          position: sticky;
          top: 0;
          z-index: 2;
          background-color: var(--primary-background-color);
          padding: 0 16px;
          gap: 16px;
          box-sizing: border-box;
          border-bottom: 1px solid var(--divider-color);
        }
        .filters {
          --mdc-text-field-fill-color: var(--input-fill-color);
          --mdc-text-field-idle-line-color: var(--input-idle-line-color);
          --mdc-shape-small: 4px;
          --text-field-overflow: initial;
          display: flex;
          justify-content: flex-end;
          align-items: center;
          color: var(--primary-text-color);
        }
        .active-filters {
          color: var(--primary-text-color);
          position: relative;
          display: flex;
          align-items: center;
          padding-top: 2px;
          padding-bottom: 2px;
          padding-right: 2px;
          padding-left: 8px;
          padding-inline-start: 8px;
          padding-inline-end: 2px;
          font-size: var(--ha-font-size-m);
          width: max-content;
          cursor: initial;
          direction: var(--direction);
          height: 32px;
        }
        .active-filters ha-button {
          margin-left: 8px;
          margin-inline-start: 8px;
          margin-inline-end: initial;
          direction: var(--direction);
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
          min-height: 20px;
          border-radius: 50%;
          font-weight: var(--ha-font-weight-normal);
          background-color: var(--primary-color);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-primary-color);
          position: absolute;
          right: 0px;
          top: 4px;
          font-size: var(--ha-font-size-s);
        }
        .menu-badge-container {
          position: relative;
        }
        h1 {
          margin-top: 8px;
          margin-left: 16px;
          margin-inline-start: 16px;
          margin-inline-end: initial;
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
    "ha-config-integrations-dashboard": HaConfigIntegrationsDashboard;
  }
}
