import "@material/mwc-icon-button";
import "@material/mwc-list/mwc-list-item";
import { mdiDotsVertical, mdiPlus } from "@mdi/js";
import "@polymer/app-route/app-route";
import Fuse from "fuse.js";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
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
import { classMap } from "lit-html/directives/class-map";
import memoizeOne from "memoize-one";
import { HASSDomEvent } from "../../../common/dom/fire_event";
import { navigate } from "../../../common/navigate";
import "../../../common/search/search-input";
import { caseInsensitiveCompare } from "../../../common/string/compare";
import { LocalizeFunc } from "../../../common/translations/localize";
import { extractSearchParam } from "../../../common/url/search-params";
import { nextRender } from "../../../common/util/render-status";
import "../../../components/ha-button-menu";
import "../../../components/ha-card";
import "../../../components/ha-fab";
import "../../../components/ha-svg-icon";
import {
  ConfigEntry,
  deleteConfigEntry,
  getConfigEntries,
} from "../../../data/config_entries";
import {
  ATTENTION_SOURCES,
  DISCOVERY_SOURCES,
  getConfigFlowInProgressCollection,
  ignoreConfigFlow,
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
import "../../../layouts/hass-loading-screen";
import "../../../layouts/hass-tabs-subpage";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import { configSections } from "../ha-panel-config";
import "./ha-integration-card";
import type {
  ConfigEntryRemovedEvent,
  ConfigEntryUpdatedEvent,
  HaIntegrationCard,
} from "./ha-integration-card";

interface DataEntryFlowProgressExtended extends DataEntryFlowProgress {
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

  @internalProperty() private _manifests!: {
    [domain: string]: IntegrationManifest;
  };

  @internalProperty() private _showIgnored = false;

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
    ): [Map<string, ConfigEntryExtended[]>, ConfigEntryExtended[]] => {
      const filteredConfigEnties = this._filterConfigEntries(
        configEntries,
        filter
      );
      const ignored: ConfigEntryExtended[] = [];
      for (let i = filteredConfigEnties.length - 1; i >= 0; i--) {
        if (filteredConfigEnties[i].source === "ignore") {
          ignored.push(filteredConfigEnties.splice(i, 1)[0]);
        }
      }
      return [groupByIntegration(filteredConfigEnties), ignored];
    }
  );

  private _filterConfigEntriesInProgress = memoizeOne(
    (
      configEntriesInProgress: DataEntryFlowProgressExtended[],
      filter?: string
    ): DataEntryFlowProgressExtended[] => {
      configEntriesInProgress = configEntriesInProgress.map(
        (flow: DataEntryFlowProgressExtended) => ({
          ...flow,
          title: localizeConfigFlowTitle(this.hass.localize, flow),
        })
      );
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
    ] = this._filterGroupConfigEntries(this._configEntries, this._filter);
    const configEntriesInProgress = this._filterConfigEntriesInProgress(
      this._configEntriesInProgress,
      this._filter
    );

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
                <slot name="header">
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
                </slot>
              </div>
            `
          : ""}
        <ha-button-menu
          corner="BOTTOM_START"
          slot="toolbar-icon"
          @action=${this._toggleShowIgnored}
        >
          <mwc-icon-button
            .title=${this.hass.localize("ui.common.menu")}
            .label=${this.hass.localize("ui.common.overflow_menu")}
            slot="trigger"
          >
            <ha-svg-icon .path=${mdiDotsVertical}></ha-svg-icon>
          </mwc-icon-button>
          <mwc-list-item>
            ${this.hass.localize(
              this._showIgnored
                ? "ui.panel.config.integrations.ignore.hide_ignored"
                : "ui.panel.config.integrations.ignore.show_ignored"
            )}
          </mwc-list-item>
        </ha-button-menu>

        ${!this.narrow
          ? html`
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
              </div>
            `
          : ""}

        <div
          class="container"
          @entry-removed=${this._handleRemoved}
          @entry-updated=${this._handleUpdated}
        >
          ${this._showIgnored
            ? ignoredConfigEntries.map(
                (item: ConfigEntryExtended) => html`
                  <ha-card outlined class="ignored">
                    <div class="header">
                      ${this.hass.localize(
                        "ui.panel.config.integrations.ignore.ignored"
                      )}
                    </div>
                    <div class="card-content">
                      <div class="image">
                        <img
                          src=${brandsUrl(item.domain, "logo")}
                          referrerpolicy="no-referrer"
                          @error=${this._onImageError}
                          @load=${this._onImageLoad}
                        />
                      </div>
                      <h2>
                        ${// In 2020.2 we added support for item.title. All ignored entries before
                        // that have title "Ignored" so we fallback to localized domain name.
                        item.title === "Ignored"
                          ? item.localized_domain_name
                          : item.title}
                      </h2>
                      <mwc-button
                        @click=${this._removeIgnoredIntegration}
                        .entry=${item}
                        aria-label=${this.hass.localize(
                          "ui.panel.config.integrations.ignore.stop_ignore"
                        )}
                        >${this.hass.localize(
                          "ui.panel.config.integrations.ignore.stop_ignore"
                        )}</mwc-button
                      >
                    </div>
                  </ha-card>
                `
              )
            : ""}
          ${configEntriesInProgress.length
            ? configEntriesInProgress.map(
                (flow: DataEntryFlowProgressExtended) => {
                  const attention = ATTENTION_SOURCES.includes(
                    flow.context.source
                  );
                  return html`
                    <ha-card
                      outlined
                      class=${classMap({
                        discovered: !attention,
                        attention: attention,
                      })}
                    >
                      <div class="header">
                        ${this.hass.localize(
                          `ui.panel.config.integrations.${
                            attention ? "attention" : "discovered"
                          }`
                        )}
                      </div>
                      <div class="card-content">
                        <div class="image">
                          <img
                            src=${brandsUrl(flow.handler, "logo")}
                            referrerpolicy="no-referrer"
                            @error=${this._onImageError}
                            @load=${this._onImageLoad}
                          />
                        </div>
                        <h2>
                          ${flow.localized_title}
                        </h2>
                        <div>
                          <mwc-button
                            unelevated
                            @click=${this._continueFlow}
                            .flowId=${flow.flow_id}
                          >
                            ${this.hass.localize(
                              `ui.panel.config.integrations.${
                                attention ? "reconfigure" : "configure"
                              }`
                            )}
                          </mwc-button>
                          ${DISCOVERY_SOURCES.includes(flow.context.source) &&
                          flow.context.unique_id
                            ? html`
                                <mwc-button
                                  @click=${this._ignoreFlow}
                                  .flow=${flow}
                                >
                                  ${this.hass.localize(
                                    "ui.panel.config.integrations.ignore.ignore"
                                  )}
                                </mwc-button>
                              `
                            : ""}
                        </div>
                      </div>
                    </ha-card>
                  `;
                }
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
                    <mwc-button @click=${this._createFlow} unelevated
                      >${this.hass.localize(
                        "ui.panel.config.integrations.add_integration"
                      )}</mwc-button
                    >
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

  private _handleRemoved(ev: HASSDomEvent<ConfigEntryRemovedEvent>) {
    this._configEntries = this._configEntries!.filter(
      (entry) => entry.entry_id !== ev.detail.entryId
    );
  }

  private _handleUpdated(ev: HASSDomEvent<ConfigEntryUpdatedEvent>) {
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
  }

  private _createFlow() {
    showConfigFlowDialog(this, {
      dialogClosedCallback: () => {
        this._handleFlowUpdated();
      },
      showAdvanced: this.showAdvanced,
    });
    // For config entries. Also loading config flow ones for add integration
    this.hass.loadBackendTranslation("title", undefined, true);
  }

  private _continueFlow(ev: Event) {
    showConfigFlowDialog(this, {
      continueFlowId: (ev.target! as any).flowId,
      dialogClosedCallback: () => {
        this._handleFlowUpdated();
      },
    });
  }

  private async _ignoreFlow(ev: Event) {
    const flow = (ev.target! as any).flow;
    const confirmed = await showConfirmationDialog(this, {
      title: this.hass!.localize(
        "ui.panel.config.integrations.ignore.confirm_ignore_title",
        "name",
        localizeConfigFlowTitle(this.hass.localize, flow)
      ),
      text: this.hass!.localize(
        "ui.panel.config.integrations.ignore.confirm_ignore"
      ),
      confirmText: this.hass!.localize(
        "ui.panel.config.integrations.ignore.ignore"
      ),
    });
    if (!confirmed) {
      return;
    }
    await ignoreConfigFlow(
      this.hass,
      flow.flow_id,
      localizeConfigFlowTitle(this.hass.localize, flow)
    );
    this._loadConfigEntries();
    getConfigFlowInProgressCollection(this.hass.connection).refresh();
  }

  private _toggleShowIgnored() {
    this._showIgnored = !this._showIgnored;
  }

  private async _removeIgnoredIntegration(ev: Event) {
    const entry = (ev.target! as any).entry;
    showConfirmationDialog(this, {
      title: this.hass!.localize(
        "ui.panel.config.integrations.ignore.confirm_delete_ignore_title",
        "name",
        this.hass.localize(`component.${entry.domain}.title`)
      ),
      text: this.hass!.localize(
        "ui.panel.config.integrations.ignore.confirm_delete_ignore"
      ),
      confirmText: this.hass!.localize(
        "ui.panel.config.integrations.ignore.stop_ignore"
      ),
      confirm: async () => {
        const result = await deleteConfigEntry(this.hass, entry.entry_id);
        if (result.require_restart) {
          alert(
            this.hass.localize(
              "ui.panel.config.integrations.config_entry.restart_confirm"
            )
          );
        }
        this._loadConfigEntries();
      },
    });
  }

  private _handleSearchChange(ev: CustomEvent) {
    this._filter = ev.detail.value;
  }

  private _onImageLoad(ev) {
    ev.target.style.visibility = "initial";
  }

  private _onImageError(ev) {
    ev.target.style.visibility = "hidden";
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
        .container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          grid-gap: 16px 16px;
          padding: 8px 16px 16px;
          margin-bottom: 64px;
        }
        ha-card {
          max-width: 500px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .attention {
          --ha-card-border-color: var(--error-color);
        }
        .attention .header {
          background: var(--error-color);
          color: var(--text-primary-color);
          padding: 8px;
          text-align: center;
        }
        .attention mwc-button {
          --mdc-theme-primary: var(--error-color);
        }
        .discovered {
          --ha-card-border-color: var(--primary-color);
        }
        .discovered .header {
          background: var(--primary-color);
          color: var(--text-primary-color);
          padding: 8px;
          text-align: center;
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
          padding: 0 16px;
          background: var(--sidebar-background-color);
          border-bottom: 1px solid var(--divider-color);
        }
        .search search-input {
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-integrations": HaConfigIntegrations;
  }
}
