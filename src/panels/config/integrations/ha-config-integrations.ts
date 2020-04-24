import "@polymer/app-route/app-route";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  customElement,
  property,
  PropertyValues,
  LitElement,
  TemplateResult,
  html,
  CSSResult,
  css,
} from "lit-element";
import { compare } from "../../../common/string/compare";
import { computeRTL } from "../../../common/util/compute_rtl";
import "../../../components/entity/ha-state-icon";
import "../../../components/ha-card";
import "../../../components/ha-fab";
import {
  ConfigEntry,
  deleteConfigEntry,
  getConfigEntries,
  updateConfigEntry,
} from "../../../data/config_entries";
import {
  DISCOVERY_SOURCES,
  getConfigFlowInProgressCollection,
  ignoreConfigFlow,
  localizeConfigFlowTitle,
  subscribeConfigFlowInProgress,
} from "../../../data/config_flow";
import { DataEntryFlowProgress } from "../../../data/data_entry_flow";
import {
  DeviceRegistryEntry,
  subscribeDeviceRegistry,
} from "../../../data/device_registry";
import {
  EntityRegistryEntry,
  subscribeEntityRegistry,
} from "../../../data/entity_registry";
import { showConfigEntrySystemOptionsDialog } from "../../../dialogs/config-entry-system-options/show-dialog-config-entry-system-options";
import { showConfigFlowDialog } from "../../../dialogs/config-flow/show-dialog-config-flow";
import { showOptionsFlowDialog } from "../../../dialogs/config-flow/show-dialog-options-flow";
import {
  showAlertDialog,
  showConfirmationDialog,
  showPromptDialog,
} from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-tabs-subpage";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { HomeAssistant, Route } from "../../../types";
import { configSections } from "../ha-panel-config";
import { domainToName } from "../../../data/integration";
import { haStyle } from "../../../resources/styles";
import { afterNextRender } from "../../../common/util/render-status";

@customElement("ha-config-integrations")
class HaConfigIntegrations extends SubscribeMixin(LitElement) {
  @property() public hass!: HomeAssistant;

  @property() public narrow!: boolean;

  @property() public isWide!: boolean;

  @property() public showAdvanced!: boolean;

  @property() public route!: Route;

  @property() private _configEntries: ConfigEntry[] = [];

  @property() private _configEntriesInProgress: DataEntryFlowProgress[] = [];

  @property() private _entityRegistryEntries: EntityRegistryEntry[] = [];

  @property() private _deviceRegistryEntries: DeviceRegistryEntry[] = [];

  @property() private _showIgnored = false;

  @property() private _searchParms = new URLSearchParams(
    window.location.hash.substring(1)
  );

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeEntityRegistry(this.hass.connection, (entries) => {
        this._entityRegistryEntries = entries;
      }),
      subscribeDeviceRegistry(this.hass.connection, (entries) => {
        this._deviceRegistryEntries = entries;
      }),
      subscribeConfigFlowInProgress(this.hass, (flowsInProgress) => {
        this._configEntriesInProgress = flowsInProgress;
        for (const flow of flowsInProgress) {
          // To render title placeholders
          if (flow.context.title_placeholders) {
            this.hass.loadBackendTranslation("config", flow.handler);
          }
        }
      }),
    ];
  }

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
        const card = this.shadowRoot!.getElementById(
          this._searchParms.get("config_entry")!
        );
        if (card) {
          card.scrollIntoView();
          card.classList.add("highlight");
        }
      });
    }
  }

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config"
        .route=${this.route}
        .tabs=${configSections.integrations}
      >
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
          <paper-listbox
            slot="dropdown-content"
            role="listbox"
            selected="{{selectedItem}}"
          >
            <paper-item @tap=${this._toggleShowIgnored}>
              ${this.hass.localize(
                this._showIgnored
                  ? "ui.panel.config.integrations.ignore.hide_ignored"
                  : "ui.panel.config.integrations.ignore.show_ignored"
              )}
            </paper-item>
          </paper-listbox>
        </paper-menu-button>

        <div class="container">
          ${this._showIgnored
            ? this._configEntries
                .filter((item) => item.source === "ignore")
                .map(
                  (item: ConfigEntry) => html`
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
                            @error=${this._onImageError}
                            @load=${this._onImageLoad}
                          />
                        </div>
                        <h2>
                          ${domainToName(this.hass.localize, item.domain)}
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
          ${this._configEntriesInProgress.length
            ? this._configEntriesInProgress.map(
                (flow) => html`
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
                        ${localizeConfigFlowTitle(this.hass.localize, flow)}
                      </h2>
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
                  </ha-card>
                `
              )
            : ""}
          ${this._configEntries.length
            ? this._configEntries.map((item: any) => {
                const devices = this._getDevices(item);
                const entities = this._getEntities(item);
                const integrationName = domainToName(
                  this.hass.localize,
                  item.domain
                );
                return item.source === "ignore"
                  ? ""
                  : html`
                      <ha-card
                        class="integration"
                        .configEntry=${item}
                        .id=${item.entry_id}
                      >
                        <div class="card-content">
                          <div class="image">
                            <img
                              src="https://brands.home-assistant.io/${item.domain}/logo.png"
                              referrerpolicy="no-referrer"
                              @error=${this._onImageError}
                              @load=${this._onImageLoad}
                            />
                          </div>
                          <h1>
                            ${integrationName}
                          </h1>
                          <h2>
                            ${integrationName === item.title
                              ? html`&nbsp;`
                              : item.title}
                          </h2>
                          ${devices.length || entities.length
                            ? html`
                                <div>
                                  ${devices.length
                                    ? html`
                                        <a
                                          href=${`/config/devices/dashboard?historyBack=1&config_entry=${item.entry_id}`}
                                          >${this.hass.localize(
                                            "ui.panel.config.integrations.config_entry.devices",
                                            "count",
                                            devices.length
                                          )}</a
                                        >
                                      `
                                    : ""}
                                  ${devices.length && entities.length
                                    ? "and"
                                    : ""}
                                  ${entities.length
                                    ? html`
                                        <a
                                          href=${`/config/entities?historyBack=1&config_entry=${item.entry_id}`}
                                          >${this.hass.localize(
                                            "ui.panel.config.integrations.config_entry.entities",
                                            "count",
                                            entities.length
                                          )}</a
                                        >
                                      `
                                    : ""}
                                </div>
                              `
                            : ""}
                        </div>
                        <div class="card-actions">
                          <div>
                            <mwc-button @click=${this._editEntryName}
                              >${this.hass.localize(
                                "ui.panel.config.integrations.config_entry.rename"
                              )}</mwc-button
                            >
                            ${item.supports_options
                              ? html`
                                  <mwc-button @click=${this._showOptions}
                                    >${this.hass.localize(
                                      "ui.panel.config.integrations.config_entry.options"
                                    )}</mwc-button
                                  >
                                `
                              : ""}
                          </div>
                          <paper-menu-button
                            horizontal-align="right"
                            vertical-align="top"
                            vertical-offset="40"
                            close-on-activate
                          >
                            <paper-icon-button
                              icon="hass:dots-vertical"
                              slot="dropdown-trigger"
                              aria-label=${this.hass!.localize(
                                "ui.panel.lovelace.editor.edit_card.options"
                              )}
                            ></paper-icon-button>
                            <paper-listbox slot="dropdown-content">
                              <paper-item @tap=${this._showSystemOptions}>
                                ${this.hass.localize(
                                  "ui.panel.config.integrations.config_entry.system_options"
                                )}</paper-item
                              >
                              <paper-item
                                class="warning"
                                @tap=${this._removeIntegration}
                              >
                                ${this.hass.localize(
                                  "ui.panel.config.integrations.config_entry.delete"
                                )}</paper-item
                              >
                            </paper-listbox>
                          </paper-menu-button>
                        </div>
                      </ha-card>
                    `;
              })
            : html`
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
              `}
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
      this._configEntries = configEntries.sort((conf1, conf2) =>
        compare(conf1.domain + conf1.title, conf2.domain + conf2.title)
      );
    });
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

  private _ignoreFlow(ev: Event) {
    const flow = (ev.target! as any).flow;
    showConfirmationDialog(this, {
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
      confirm: () => {
        ignoreConfigFlow(this.hass, flow.flow_id);
        getConfigFlowInProgressCollection(this.hass.connection).refresh();
      },
    });
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
        this.hass.localize(`component.${entry.domain}.config.title`)
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

  private _getEntities(configEntry: ConfigEntry): EntityRegistryEntry[] {
    if (!this._entityRegistryEntries) {
      return [];
    }
    return this._entityRegistryEntries.filter(
      (entity) => entity.config_entry_id === configEntry.entry_id
    );
  }

  private _getDevices(configEntry: ConfigEntry): DeviceRegistryEntry[] {
    if (!this._deviceRegistryEntries) {
      return [];
    }
    return this._deviceRegistryEntries.filter((device) =>
      device.config_entries.includes(configEntry.entry_id)
    );
  }

  private _onImageLoad(ev) {
    ev.target.style.visibility = "initial";
  }

  private _onImageError(ev) {
    ev.target.style.visibility = "hidden";
  }

  private _showOptions(ev) {
    showOptionsFlowDialog(this, ev.target.closest("ha-card").configEntry);
  }

  private _showSystemOptions(ev) {
    showConfigEntrySystemOptionsDialog(this, {
      entry: ev.target.closest("ha-card").configEntry,
    });
  }

  private async _editEntryName(ev) {
    const configEntry = ev.target.closest("ha-card").configEntry;
    const newName = await showPromptDialog(this, {
      title: this.hass.localize("ui.panel.config.integrations.rename_dialog"),
      defaultValue: configEntry.title,
      inputLabel: this.hass.localize(
        "ui.panel.config.integrations.rename_input_label"
      ),
    });
    if (newName === null) {
      return;
    }
    const newEntry = await updateConfigEntry(this.hass, configEntry.entry_id, {
      title: newName,
    });
    this._configEntries = this._configEntries!.map((entry) =>
      entry.entry_id === newEntry.entry_id ? newEntry : entry
    );
  }

  private async _removeIntegration(ev) {
    const entryId = ev.target.closest("ha-card").configEntry.entry_id;

    const confirmed = await showConfirmationDialog(this, {
      text: this.hass.localize(
        "ui.panel.config.integrations.config_entry.delete_confirm"
      ),
    });

    if (!confirmed) {
      return;
    }

    deleteConfigEntry(this.hass, entryId).then((result) => {
      this._configEntries = this._configEntries.filter(
        (entry) => entry.entry_id !== entryId
      );

      if (result.require_restart) {
        showAlertDialog(this, {
          text: this.hass.localize(
            "ui.panel.config.integrations.config_entry.restart_confirm"
          ),
        });
      }
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
          padding: 16px;
          margin-bottom: 64px;
        }
        ha-card {
          max-width: 500px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        ha-card.highlight {
          border: 1px solid var(--accent-color);
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
        .ignored .header {
          background: var(--light-theme-disabled-color);
          color: var(--text-primary-color);
          padding: 8px;
          text-align: center;
        }
        .card-content {
          padding: 16px;
          text-align: center;
        }
        ha-card.integration .card-content {
          padding-bottom: 3px;
        }
        .card-actions {
          border-top: none;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-right: 5px;
        }
        .helper {
          display: inline-block;
          height: 100%;
          vertical-align: middle;
        }
        .image {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 60px;
          margin-bottom: 16px;
          vertical-align: middle;
        }
        img {
          max-height: 60px;
          max-width: 90%;
        }
        a {
          color: var(--primary-color);
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
        paper-menu-button {
          color: var(--secondary-text-color);
          padding: 0;
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
