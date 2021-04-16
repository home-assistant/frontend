import "@material/mwc-icon-button";
import { ActionDetail } from "@material/mwc-list";
import "@material/mwc-list/mwc-list-item";
import { mdiFilterVariant, mdiPlus } from "@mdi/js";
import Fuse from "fuse.js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { ifDefined } from "lit-html/directives/if-defined";
import memoizeOne from "memoize-one";
import { navigate } from "../../../common/navigate";
import { caseInsensitiveCompare } from "../../../common/string/compare";
import { extractSearchParam } from "../../../common/url/search-params";
import { nextRender } from "../../../common/util/render-status";
import { ConfigEntry, getConfigEntries } from "../../../data/config_entries";
import {
  getConfigFlowInProgressCollection,
  localizeConfigFlowTitle,
  subscribeConfigFlowInProgress,
} from "../../../data/config_flow";
import type { DataEntryFlowProgress } from "../../../data/data_entry_flow";
import {
  DeviceRegistryEntry,
  subscribeDeviceRegistry,
} from "../../../data/device_registry";
import {
  EntityRegistryEntry,
  subscribeEntityRegistry,
} from "../../../data/entity_registry";
import {
  domainToName,
  fetchIntegrationManifests,
  IntegrationManifest,
} from "../../../data/integration";
import { showConfigFlowDialog } from "../../../dialogs/config-flow/show-dialog-config-flow";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { haStyle } from "../../../resources/styles";
import { configSections } from "../ha-panel-config";

import type { HomeAssistant, Route } from "../../../types";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../common/translations/localize";
import type { HaIntegrationCard } from "./ha-integration-card";

import "../../../common/search/search-input";
import "../../../components/ha-button-menu";
import "../../../components/ha-card";
import "../../../components/ha-fab";
import "../../../components/ha-checkbox";
import "../../../components/ha-svg-icon";
import "../../../layouts/hass-loading-screen";
import "../../../layouts/hass-tabs-subpage";
import "./ha-integration-card";
import "./ha-config-flow-card";
import "./ha-ignored-config-entry-card";

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

  @property() public narrow!: boolean;

  @property() public isWide!: boolean;

  @property() public showAdvanced!: boolean;

  @property() public route!: Route;

  @internalProperty() private _configEntries?: ConfigEntryExtended[];

  @property()
  private _configEntriesInProgress: DataEntryFlowProgressExtended[] = [];

  @internalProperty()
  private _entityRegistryEntries: EntityRegistryEntry[] = [];

  @internalProperty()
  private _deviceRegistryEntries: DeviceRegistryEntry[] = [];

  @internalProperty()
  private _manifests: Record<string, IntegrationManifest> = {};

  @internalProperty() private _showIgnored = false;

  @internalProperty() private _showDisabled = false;

  @internalProperty() private _searchParms = new URLSearchParams(
    window.location.hash.substring(1)
  );

  @internalProperty() private _filter?: string;

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeEntityRegistry(this.hass.connection, (entries) => {
        this._entityRegistryEntries = entries;
      }),
      subscribeDeviceRegistry(this.hass.connection, (entries) => {
        this._deviceRegistryEntries = entries;
      }),
      subscribeConfigFlowInProgress(this.hass, async (flowsInProgress) => {
        const translationsPromisses: Promise<LocalizeFunc>[] = [];
        flowsInProgress.forEach((flow) => {
          // To render title placeholders
          if (flow.context.title_placeholders) {
            translationsPromisses.push(
              this.hass.loadBackendTranslation("config", flow.handler)
            );
          }
        });
        await Promise.all(translationsPromisses);
        await nextRender();
        this._configEntriesInProgress = flowsInProgress.map((flow) => {
          return {
            ...flow,
            localized_title: localizeConfigFlowTitle(this.hass.localize, flow),
          };
        });
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
      Map<string, ConfigEntryExtended[]>
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
      return html`<hass-loading-screen></hass-loading-screen>`;
    }
    const [
      groupedConfigEntries,
      ignoredConfigEntries,
      disabledConfigEntries,
    ] = this._filterGroupConfigEntries(this._configEntries, this._filter);
    const configEntriesInProgress = this._filterConfigEntriesInProgress(
      this._configEntriesInProgress,
      this._filter
    );

    const filterMenu = html`<ha-button-menu
      corner="BOTTOM_START"
      multi
      slot=${ifDefined(this.narrow ? "toolbar-icon" : undefined)}
      @action=${this._handleMenuAction}
    >
      <mwc-icon-button
        .title=${this.hass.localize("ui.common.menu")}
        .label=${this.hass.localize("ui.common.overflow_menu")}
        slot="trigger"
      >
        <ha-svg-icon .path=${mdiFilterVariant}></ha-svg-icon>
      </mwc-icon-button>
      <mwc-list-item graphic="control" .selected=${this._showIgnored}>
        <ha-checkbox slot="graphic" .checked=${this._showIgnored}></ha-checkbox>
        ${this.hass.localize(
          "ui.panel.config.integrations.ignore.show_ignored"
        )}
      </mwc-list-item>
      <mwc-list-item graphic="control" .selected=${this._showDisabled}>
        <ha-checkbox
          slot="graphic"
          .checked=${this._showDisabled}
        ></ha-checkbox>
        ${this.hass.localize(
          "ui.panel.config.integrations.disable.show_disabled"
        )}
      </mwc-list-item>
    </ha-button-menu>`;

    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config"
        .route=${this.route}
        .tabs=${configSections.integrations}
      >
        ${this.narrow
          ? html`
              <div slot="header">
                <search-input
                  .filter=${this._filter}
                  class="header"
                  no-label-float
                  no-underline
                  @value-changed=${this._handleSearchChange}
                  .label=${this.hass.localize(
                    "ui.panel.config.integrations.search"
                  )}
                ></search-input>
              </div>
              ${filterMenu}
            `
          : html`
              <div class="search">
                <search-input
                  no-label-float
                  no-underline
                  .filter=${this._filter}
                  @value-changed=${this._handleSearchChange}
                  .label=${this.hass.localize(
                    "ui.panel.config.integrations.search"
                  )}
                ></search-input>
                ${!this._showDisabled && disabledConfigEntries.size
                  ? html`<div class="active-filters">
                      ${this.hass.localize(
                        "ui.panel.config.integrations.disable.disabled_integrations",
                        "number",
                        disabledConfigEntries.size
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
                  ></ha-integration-card>`
              )
            : !this._configEntries.length
            ? html`
                <ha-card outlined>
                  <div class="card-content">
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
                </ha-card>
              `
            : ""}
          ${this._filter &&
          !configEntriesInProgress.length &&
          !groupedConfigEntries.size &&
          this._configEntries.length
            ? html`
                <div class="none-found">
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

  private _loadConfigEntries() {
    getConfigEntries(this.hass).then((configEntries) => {
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
          caseInsensitiveCompare(
            conf1.localized_domain_name + conf1.title,
            conf2.localized_domain_name + conf2.title
          )
        );
    });
  }

  private async _fetchManifests() {
    const manifests = {};
    const fetched = await fetchIntegrationManifests(this.hass);
    for (const manifest of fetched) manifests[manifest.domain] = manifest;
    this._manifests = manifests;
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
    navigate(this, "/config/integrations", true);
    if (!domain) {
      return;
    }
    const localize = await localizePromise;
    if (
      !(await showConfirmationDialog(this, {
        title: localize(
          "ui.panel.config.integrations.confirm_new",
          "integration",
          domainToName(localize, domain)
        ),
      }))
    ) {
      return;
    }
    showConfigFlowDialog(this, {
      dialogClosedCallback: () => {
        this._handleFlowUpdated();
      },
      startFlowHandler: domain,
      showAdvanced: this.hass.userData?.showAdvanced,
    });
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        ha-button-menu {
          margin: 0 -8px 0 8px;
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
        ha-card {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .ignored {
          --ha-card-border-color: var(--light-theme-disabled-color);
        }
        .ignored img {
          filter: grayscale(1);
        }
        .ignored .header {
          background: var(--light-theme-disabled-color);
          color: var(--text-primary-color);
          padding: 8px;
          text-align: center;
        }
        .card-content {
          display: flex;
          height: 100%;
          margin-top: 0;
          padding: 16px;
          text-align: center;
          flex-direction: column;
          justify-content: space-between;
        }
        .image {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 60px;
          margin-bottom: 16px;
          vertical-align: middle;
        }
        .none-found {
          margin: auto;
          text-align: center;
        }
        search-input.header {
          display: block;
          position: relative;
          left: -8px;
          color: var(--secondary-text-color);
          margin-left: 16px;
        }
        .search {
          display: flex;
          align-items: center;
          padding: 0 16px;
          background: var(--sidebar-background-color);
          border-bottom: 1px solid var(--divider-color);
        }
        .search search-input {
          flex: 1;
          position: relative;
          top: 2px;
        }
        img {
          max-height: 100%;
          max-width: 90%;
        }
        .none-found {
          margin: auto;
          text-align: center;
        }
        h1 {
          margin-bottom: 0;
        }
        h2 {
          margin-top: 0;
          word-wrap: break-word;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 3;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: normal;
        }
        .active-filters {
          color: var(--primary-text-color);
          position: relative;
          display: flex;
          align-items: center;
          padding: 2px 2px 2px 8px;
          margin-left: 4px;
          font-size: 14px;
        }
        .active-filters ha-icon {
          color: var(--primary-color);
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-integrations": HaConfigIntegrations;
  }
}
