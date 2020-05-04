import "@polymer/app-route/app-route";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import memoizeOne from "memoize-one";
import * as Fuse from "fuse.js";
import { caseInsensitiveCompare } from "../../../common/string/compare";
import { computeRTL } from "../../../common/util/compute_rtl";
import {
  afterNextRender,
  nextRender,
} from "../../../common/util/render-status";
import "../../../components/entity/ha-state-icon";
import "../../../components/ha-card";
import "../../../components/ha-fab";
import {
  ConfigEntry,
  deleteConfigEntry,
  getConfigEntries,
} from "../../../data/config_entries";
import {
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
import { domainToName } from "../../../data/integration";
import { showConfigFlowDialog } from "../../../dialogs/config-flow/show-dialog-config-flow";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-tabs-subpage";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route } from "../../../types";
import { configSections } from "../ha-panel-config";
import "../../../common/search/search-input";
import "./ha-integration-card";
import type {
  ConfigEntryRemovedEvent,
  ConfigEntryUpdatedEvent,
  HaIntegrationCard,
} from "./ha-integration-card";
import { HASSDomEvent } from "../../../common/dom/fire_event";

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
  @property() public hass!: HomeAssistant;

  @property() public narrow!: boolean;

  @property() public isWide!: boolean;

  @property() public showAdvanced!: boolean;

  @property() public route!: Route;

  @property() private _configEntries: ConfigEntryExtended[] = [];

  @property()
  private _configEntriesInProgress: DataEntryFlowProgressExtended[] = [];

  @property() private _entityRegistryEntries: EntityRegistryEntry[] = [];

  @property() private _deviceRegistryEntries: DeviceRegistryEntry[] = [];

  @property() private _showIgnored = false;

  @property() private _searchParms = new URLSearchParams(
    window.location.hash.substring(1)
  );

  @property() private _filter?: string;

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeEntityRegistry(this.hass.connection, (entries) => {
        this._entityRegistryEntries = entries;
      }),
      subscribeDeviceRegistry(this.hass.connection, (entries) => {
        this._deviceRegistryEntries = entries;
      }),
      subscribeConfigFlowInProgress(this.hass, async (flowsInProgress) => {
        const translationsPromisses: Promise<void>[] = [];
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
        return configEntries;
      }
      const options: Fuse.FuseOptions<ConfigEntryExtended> = {
        keys: ["domain", "localized_domain_name", "title"],
        caseSensitive: false,
        minMatchCharLength: 2,
        threshold: 0.2,
      };
      const fuse = new Fuse(configEntries, options);
      return fuse.search(filter);
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
      filteredConfigEnties.forEach((item, index) => {
        if (item.source === "ignore") {
          ignored.push(filteredConfigEnties.splice(index, 1)[0]);
        }
      });
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
      const options: Fuse.FuseOptions<DataEntryFlowProgressExtended> = {
        keys: ["handler", "localized_title"],
        caseSensitive: false,
        minMatchCharLength: 2,
        threshold: 0.2,
      };
      const fuse = new Fuse(configEntriesInProgress, options);
      return fuse.search(filter);
    }
  );

  protected firstUpdated(changed: PropertyValues) {
    super.firstUpdated(changed);
    this._loadConfigEntries();
    this.hass.loadBackendTranslation("title", undefined, true);
  }

  protected updated(changed: PropertyValues) {
    super.updated(changed);
    if (
      this._searchParms.has("config_entry") &&
      changed.has("_configEntries") &&
      !(changed.get("_configEntries") as ConfigEntry[]).length &&
      this._configEntries.length
    ) {
      afterNextRender(() => {
        const entryId = this._searchParms.get("config_entry")!;
        const configEntry = this._configEntries.find(
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
      });
    }
  }

  protected render(): TemplateResult {
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
                  ></search-input>
                </slot>
              </div>
            `
          : ""}
        <paper-menu-button
          close-on-activate
          no-animations
          horizontal-align="right"
          horizontal-offset="-5"
          slot="toolbar-icon"
        >
          <paper-icon-button
            icon="hass:dots-vertical"
            slot="dropdown-trigger"
            alt="menu"
          ></paper-icon-button>
          <paper-listbox slot="dropdown-content" role="listbox">
            <paper-item @tap=${this._toggleShowIgnored}>
              ${this.hass.localize(
                this._showIgnored
                  ? "ui.panel.config.integrations.ignore.hide_ignored"
                  : "ui.panel.config.integrations.ignore.show_ignored"
              )}
            </paper-item>
          </paper-listbox>
        </paper-menu-button>

        ${!this.narrow
          ? html`
              <div class="search">
                <search-input
                  no-label-float
                  no-underline
                  .filter=${this._filter}
                  @value-changed=${this._handleSearchChange}
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
                  <ha-card class="ignored">
                    <div class="header">
                      ${this.hass.localize(
                        "ui.panel.config.integrations.ignore.ignored"
                      )}
                    </div>
                    <div class="card-content">
                      <div class="image">
                        <img
                          src="https://brands.home-assistant.io/${item.domain}/logo.png"
                          referrerpolicy="no-referrer"
                          class="ignored-image"
                          @error=${this._onImageError}
                          @load=${this._onImageLoad}
                        />
                      </div>
                      <h2>
                        ${item.localized_domain_name}
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
                (flow: DataEntryFlowProgressExtended) => html`
                  <ha-card class="discovered">
                    <div class="header">
                      ${this.hass.localize(
                        "ui.panel.config.integrations.discovered"
                      )}
                    </div>
                    <div class="card-content">
                      <div class="image">
                        <img
                          src="https://brands.home-assistant.io/${flow.handler}/logo.png"
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
                            "ui.panel.config.integrations.configure"
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
                `
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
                    .entityRegistryEntries=${this._entityRegistryEntries}
                    .deviceRegistryEntries=${this._deviceRegistryEntries}
                  ></ha-integration-card>`
              )
            : !this._configEntries.length
            ? html`
                <ha-card>
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
                        "ui.panel.config.integrations.add"
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
          icon="hass:plus"
          aria-label=${this.hass.localize("ui.panel.config.integrations.new")}
          title=${this.hass.localize("ui.panel.config.integrations.new")}
          @click=${this._createFlow}
          ?is-wide=${this.isWide}
          ?narrow=${this.narrow}
          ?rtl=${computeRTL(this.hass!)}
        ></ha-fab>
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

  private _handleRemoved(ev: HASSDomEvent<ConfigEntryRemovedEvent>) {
    this._configEntries = this._configEntries.filter(
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

  private _createFlow() {
    showConfigFlowDialog(this, {
      dialogClosedCallback: () => {
        this._loadConfigEntries();
        getConfigFlowInProgressCollection(this.hass.connection).refresh();
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
        this._loadConfigEntries();
        getConfigFlowInProgressCollection(this.hass.connection).refresh();
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
    await ignoreConfigFlow(this.hass, flow.flow_id);
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
        .discovered {
          border: 1px solid var(--primary-color);
        }
        .discovered .header {
          background: var(--primary-color);
          color: var(--text-primary-color);
          padding: 8px;
          text-align: center;
        }
        .ignored {
          border: 1px solid var(--light-theme-disabled-color);
        }
        .ignored-image {
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
          top: -7px;
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
        }
        ha-fab {
          position: fixed;
          bottom: 16px;
          right: 16px;
          z-index: 1;
        }
        ha-fab[is-wide] {
          bottom: 24px;
          right: 24px;
        }
        ha-fab[narrow] {
          bottom: 84px;
        }
        ha-fab[rtl] {
          right: auto;
          left: 16px;
        }
        ha-fab[is-wide].rtl {
          bottom: 24px;
          left: 24px;
          right: auto;
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
