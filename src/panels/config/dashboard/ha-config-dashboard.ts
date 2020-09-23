import { memoize } from "@fullcalendar/core";
import "@material/mwc-list/mwc-list";
import "@material/mwc-list/mwc-list-item";
import { mdiChevronRight } from "@mdi/js";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import { HassEntities } from "home-assistant-js-websocket";
import {
  css,
  CSSResultArray,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import memoizeOne from "memoize-one";
import { formatDateTime } from "../../../common/datetime/format_date_time";
import { listenMediaQuery } from "../../../common/dom/media_query";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import {
  caseInsensitiveCompare,
  compare,
} from "../../../common/string/compare";
import "../../../components/ha-card";
import "../../../components/ha-icon-next";
import "../../../components/ha-menu-button";
import "../../../components/user/ha-person-badge";
import { AutomationEntity } from "../../../data/automation";
import {
  CloudStatus,
  CloudStatusLoggedIn,
  fetchCloudStatus,
  fetchCloudSubscriptionInfo,
  SubscriptionInfo,
} from "../../../data/cloud";
import { ConfigEntry, getConfigEntries } from "../../../data/config_entries";
import {
  DeviceRegistryEntry,
  subscribeDeviceRegistry,
} from "../../../data/device_registry";
import {
  EntityRegistryEntry,
  subscribeEntityRegistry,
} from "../../../data/entity_registry";
import { domainToName } from "../../../data/integration";
import {
  fetchDashboards,
  LovelaceDashboard,
  LovelacePanelConfig,
} from "../../../data/lovelace";
import { fetchPersons, Person } from "../../../data/person";
import { fetchTags, Tag } from "../../../data/tag";
import { fetchWebhooks, Webhook } from "../../../data/webhook";
import "../../../layouts/ha-app-layout";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import "../ha-config-section";
import { HELPER_DOMAINS } from "../helpers/const";
import { ConfigEntryExtended } from "../integrations/ha-config-integrations";
import "./ha-config-navigation";

@customElement("ha-config-dashboard")
class HaConfigDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true })
  public narrow!: boolean;

  @property({ type: Boolean }) public isWide!: boolean;

  @property({ attribute: false }) public cloudStatus?: CloudStatus;

  @property({ type: Boolean }) public showAdvanced!: boolean;

  @internalProperty() private _persons?: Person[];

  @internalProperty() private _configEntries?: ConfigEntryExtended[];

  @internalProperty()
  private _entityRegistryEntries: EntityRegistryEntry[] = [];

  @internalProperty()
  private _deviceRegistryEntries: DeviceRegistryEntry[] = [];

  @internalProperty() private _tags: Tag[] = [];

  @internalProperty() private _dashboards: LovelaceDashboard[] = [];

  @internalProperty() private _veryWide = false;

  @internalProperty() private _cloudStatus?: CloudStatus;

  @internalProperty() private _subscription?: SubscriptionInfo;

  @internalProperty() private _localHooks?: Webhook[];

  private _listeners: Array<() => void> = [];

  public connectedCallback() {
    super.connectedCallback();
    this._listeners.push(
      listenMediaQuery("(min-width: 1525px)", (matches) => {
        this._veryWide = matches;
      })
    );
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    while (this._listeners.length) {
      this._listeners.pop()!();
    }
  }

  protected render(): TemplateResult {
    const integrationsToShow = this._veryWide ? 6 : this.narrow ? 2 : 4;
    return html`
      <ha-app-layout>
        <app-header fixed slot="header">
          <app-toolbar>
            <ha-menu-button
              .hass=${this.hass}
              .narrow=${this.narrow}
            ></ha-menu-button>
            <div main-title>Hey Zack, Welcome Home!</div>
          </app-toolbar>
        </app-header>
        <div class="content">
          <div class="left">
            <ha-card outlined id="PersonCard">
              <mwc-list>
                ${this._persons?.map(
                  (person) => html`
                    <mwc-list-item graphic="avatar" twoline hasMeta>
                      <ha-person-badge
                        slot="graphic"
                        .person=${person}
                      ></ha-person-badge>
                      <span>${person.name}</span>
                      <span slot="secondary">${person.id}</span>
                    </mwc-list-item>
                  `
                )}
              </mwc-list>
              <div class="footer">
                <a class="config-link" href="/config/person">
                  <mwc-button>Manage Persons, Users & Zones</mwc-button>
                </a>
              </div>
            </ha-card>
            <ha-card outlined id="CloudCard">
              <div class="card-header">
                <div class="header">Cloud</div>
                ${this._cloudStatus && "email" in this._cloudStatus
                  ? html`
                      <div class="secondary">
                        ${this._cloudStatus.email}
                      </div>
                    `
                  : ""}
              </div>
              <mwc-list>
                <mwc-list-item twoline hasMeta>
                  <span>Remote UI</span>
                  <span slot="secondary"
                    >${this._cloudStatus &&
                    "remote_connected" in this._cloudStatus
                      ? this._cloudStatus?.remote_connected
                        ? this.hass.localize(
                            "ui.panel.config.cloud.account.connected"
                          )
                        : this.hass.localize(
                            "ui.panel.config.cloud.account.not_connected"
                          )
                      : ""}</span
                  >
                  <ha-svg-icon
                    class="meta-icon"
                    slot="meta"
                    .path=${mdiChevronRight}
                  ></ha-svg-icon>
                </mwc-list-item>
                <mwc-list-item twoline hasMeta>
                  <span>Google Assistant</span>
                  <span slot="secondary"
                    >${this._cloudStatus &&
                    (this._cloudStatus as CloudStatusLoggedIn).prefs
                      .google_enabled
                      ? this.hass.localize("ui.panel.config.cloud.enabled")
                      : this.hass.localize(
                          "ui.panel.config.cloud.disabled"
                        )}</span
                  >
                  <ha-svg-icon
                    class="meta-icon"
                    slot="meta"
                    .path=${mdiChevronRight}
                  ></ha-svg-icon>
                </mwc-list-item>
                <mwc-list-item twoline hasMeta>
                  <span>Amazon Alexa</span>
                  <span slot="secondary"
                    >${this._cloudStatus &&
                    (this._cloudStatus as CloudStatusLoggedIn).prefs
                      .alexa_enabled
                      ? this.hass.localize("ui.panel.config.cloud.enabled")
                      : this.hass.localize(
                          "ui.panel.config.cloud.disabled"
                        )}</span
                  >
                  <ha-svg-icon
                    class="meta-icon"
                    slot="meta"
                    .path=${mdiChevronRight}
                  ></ha-svg-icon>
                </mwc-list-item>
                <mwc-list-item twoline hasMeta>
                  <span>Webhooks</span>
                  <span slot="secondary"
                    >${this._localHooks?.length} active</span
                  >
                  <ha-svg-icon
                    class="meta-icon"
                    slot="meta"
                    .path=${mdiChevronRight}
                  ></ha-svg-icon>
                </mwc-list-item>
              </mwc-list>
              <div class="footer">
                <a class="config-link" href="/config/cloud">
                  <mwc-button>Manage Cloud Services</mwc-button></a
                >
              </div>
            </ha-card>
            <ha-card outlined id="ServerCard" .header=${"Server"}>
              <mwc-list>
                <a class="config-link" href="/config/core">
                  <mwc-list-item twoline hasMeta>
                    <span>Location Settings</span>
                    <span slot="secondary">Unit system, timezone, etc</span>
                    <ha-svg-icon
                      class="meta-icon"
                      slot="meta"
                      .path=${mdiChevronRight}
                    ></ha-svg-icon>
                  </mwc-list-item>
                </a>
                <a class="config-link" href="/config/server_control">
                  <mwc-list-item twoline hasMeta>
                    <span>Server Control</span>
                    <span slot="secondary">Stop and Start Home Assistant</span>
                    <ha-svg-icon
                      class="meta-icon"
                      slot="meta"
                      .path=${mdiChevronRight}
                    ></ha-svg-icon>
                  </mwc-list-item>
                </a>
                <a class="config-link" href="/config/logs">
                  <mwc-list-item twoline hasMeta>
                    <span>Logs</span>
                    <span slot="secondary">Server Logs</span>
                    <ha-svg-icon
                      class="meta-icon"
                      slot="meta"
                      .path=${mdiChevronRight}
                    ></ha-svg-icon>
                  </mwc-list-item>
                </a>

                <a class="config-link" href="/config/customize">
                  <mwc-list-item twoline hasMeta>
                    <span>Customizations</span>
                    <span slot="secondary">Manage Customizations</span>
                    <ha-svg-icon
                      class="meta-icon"
                      slot="meta"
                      .path=${mdiChevronRight}
                    ></ha-svg-icon>
                  </mwc-list-item>
                </a>
                <a class="config-link" href="/config/info">
                  <mwc-list-item twoline hasMeta>
                    <span>About</span>
                    <span slot="secondary">Info about the server</span>
                    <ha-svg-icon
                      class="meta-icon"
                      slot="meta"
                      .path=${mdiChevronRight}
                    ></ha-svg-icon>
                  </mwc-list-item>
                </a>
              </mwc-list>
              <div class="footer">
                <a class="config-link" href="/config/core">
                  <mwc-button>Manage Server</mwc-button>
                </a>
              </div>
            </ha-card>
          </div>
          <div class="main">
            <ha-card outlined id="IntegrationCard">
              <div class="integrations">
                ${this._configEntries
                  ?.slice(0, integrationsToShow)
                  .map((entry) => {
                    const devices = this._getDevices(entry);
                    const services = this._getServices(entry);
                    const entities = this._getEntities(entry);

                    return html`
                      <div class="card-content">
                        <div class="image">
                          <img
                            src="https://brands.home-assistant.io/${entry.domain}/logo.png"
                            referrerpolicy="no-referrer"
                          />
                        </div>
                        <h2>
                          ${entry.localized_domain_name}
                        </h2>
                        <h3>
                          ${entry.localized_domain_name === entry.title
                            ? ""
                            : entry.title}
                        </h3>
                        ${devices.length || services.length || entities.length
                          ? html`
                              <div class="secondary">
                                ${devices.length
                                  ? html`${this.hass.localize(
                                      "ui.panel.config.integrations.config_entry.devices",
                                      "count",
                                      devices.length
                                    )}${services.length ? "," : ""}`
                                  : ""}
                                ${services.length
                                  ? html`${this.hass.localize(
                                      "ui.panel.config.integrations.config_entry.services",
                                      "count",
                                      services.length
                                    )}`
                                  : ""}
                                ${(devices.length || services.length) &&
                                entities.length
                                  ? this.hass.localize("ui.common.and")
                                  : ""}
                                ${entities.length
                                  ? html`${this.hass.localize(
                                      "ui.panel.config.integrations.config_entry.entities",
                                      "count",
                                      entities.length
                                    )}`
                                  : ""}
                              </div>
                            `
                          : ""}
                      </div>
                    `;
                  })}
              </div>
              <div class="footer">
                <a class="config-link" href="/config/integrations">
                  <mwc-button>Manage integrations</mwc-button>
                </a>
              </div>
            </ha-card>
            <ha-card outlined id="AutomationCard" .header=${"Automations"}>
              <mwc-list>
                ${this._getAutomations(this.hass.states).map(
                  (automation) => html`
                    <a
                      class="config-link"
                      href=${`/config/automation/edit/${automation.attributes.id}`}
                    >
                      <mwc-list-item twoline hasMeta>
                        <span>${automation.attributes.friendly_name}</span>
                        <span slot="secondary"
                          >${this.hass.localize(
                            "ui.card.automation.last_triggered"
                          )}:
                          ${automation.attributes.last_triggered
                            ? formatDateTime(
                                new Date(automation.attributes.last_triggered),
                                this.hass.language
                              )
                            : this.hass.localize(
                                "ui.components.relative_time.never"
                              )}
                        </span>
                        <ha-svg-icon
                          class="meta-icon"
                          slot="meta"
                          .path=${mdiChevronRight}
                        ></ha-svg-icon>
                      </mwc-list-item>
                    </a>
                  `
                )}
              </mwc-list>
              <div class="footer">
                <a class="config-link" href="/config/automation">
                  <mwc-button>Manage Automations</mwc-button>
                </a>
              </div>
            </ha-card>
            <ha-card outlined id="ScriptCard" .header=${"Scripts"}>
              <mwc-list>
                ${this._getScripts(this.hass.states).map(
                  (script) => html`
                    <a
                      class="config-link"
                      href=${`/config/script/edit/${script.entity_id}`}
                    >
                      <mwc-list-item twoline hasMeta>
                        <span>${script.attributes.friendly_name}</span>
                        <span slot="secondary"
                          >${this.hass.localize(
                            "ui.card.automation.last_triggered"
                          )}:
                          ${script.attributes.last_triggered
                            ? formatDateTime(
                                new Date(script.attributes.last_triggered),
                                this.hass.language
                              )
                            : this.hass.localize(
                                "ui.components.relative_time.never"
                              )}
                        </span>
                        <ha-svg-icon
                          class="meta-icon"
                          slot="meta"
                          .path=${mdiChevronRight}
                        ></ha-svg-icon>
                      </mwc-list-item>
                    </a>
                  `
                )}
              </mwc-list>
              <div class="footer">
                <a class="config-link" href="/config/script">
                  <mwc-button>Manage Scripts</mwc-button>
                </a>
              </div>
            </ha-card>
            <ha-card outlined id="SceneCard" .header=${"Scenes"}>
              <mwc-list>
                ${this._getScenes(this.hass.states).map(
                  (scene) => html`
                    <a
                      class="config-link"
                      href=${`/config/scene/edit/${scene.attributes.id}`}
                    >
                      <mwc-list-item twoline hasMeta>
                        <span>${scene.attributes.friendly_name}</span>
                        <span slot="secondary"
                          >${this.hass.localize(
                            "ui.card.automation.last_triggered"
                          )}:
                          ${scene.attributes.last_triggered
                            ? formatDateTime(
                                new Date(scene.attributes.last_triggered),
                                this.hass.language
                              )
                            : this.hass.localize(
                                "ui.components.relative_time.never"
                              )}
                        </span>
                        <ha-svg-icon
                          class="meta-icon"
                          slot="meta"
                          .path=${mdiChevronRight}
                        ></ha-svg-icon>
                      </mwc-list-item>
                    </a>
                  `
                )}
              </mwc-list>
              <div class="footer">
                <a class="config-link" href="/config/scene">
                  <mwc-button>Manage Scenes</mwc-button>
                </a>
              </div>
            </ha-card>
            <ha-card outlined id="HelperCard" .header=${"Helpers"}>
              <mwc-list>
                ${this._getHelpers(this.hass.states).map(
                  (helper) => html`
                    <mwc-list-item twoline hasMeta>
                      <span>${helper.attributes.friendly_name}</span>
                      <span slot="secondary"
                        >${this.hass.localize(
                          "ui.card.automation.last_triggered"
                        )}:
                        ${helper.attributes.last_triggered
                          ? formatDateTime(
                              new Date(helper.attributes.last_triggered),
                              this.hass.language
                            )
                          : this.hass.localize(
                              "ui.components.relative_time.never"
                            )}
                      </span>
                      <ha-svg-icon
                        class="meta-icon"
                        slot="meta"
                        .path=${mdiChevronRight}
                      ></ha-svg-icon>
                    </mwc-list-item>
                  `
                )}
              </mwc-list>
              <div class="footer">
                <a class="config-link" href="/config/helpers">
                  <mwc-button>Manage Helpers</mwc-button>
                </a>
              </div>
            </ha-card>
            <ha-card outlined id="TagsCard" .header=${"Tags"}>
              <mwc-list>
                ${this._tags.map(
                  (tag) => html`
                    <mwc-list-item twoline hasMeta>
                      <span>${tag.name}</span>
                      <span slot="secondary"
                        >${this.hass.localize(
                          "ui.panel.config.tags.headers.last_scanned"
                        )}:
                        ${tag.last_scanned
                          ? html`
                              <ha-relative-time
                                .hass=${this.hass}
                                .datetimeObj=${tag.last_scanned
                                  ? new Date(tag.last_scanned)
                                  : null}
                              ></ha-relative-time>
                            `
                          : this.hass.localize(
                              "ui.panel.config.tags.never_scanned"
                            )}
                      </span>
                      <ha-svg-icon
                        class="meta-icon"
                        slot="meta"
                        .path=${mdiChevronRight}
                      ></ha-svg-icon>
                    </mwc-list-item>
                  `
                )}
              </mwc-list>
              <div class="footer">
                <a class="config-link" href="/config/tags">
                  <mwc-button>Manage Tags</mwc-button>
                </a>
              </div>
            </ha-card>
            <ha-card
              outlined
              id="LovelaceCard"
              .header=${"Lovelace Dashboards"}
            >
              <mwc-list>
                ${this._getDasboards(this._dashboards).map(
                  (dashboard) => html`
                    <mwc-list-item graphic="avatar" twoline hasMeta>
                      <ha-icon slot="graphic" .icon=${dashboard.icon}></ha-icon>
                      <span>${dashboard.title}</span>
                      <span slot="secondary">
                        ${this.hass.localize(
                          `ui.panel.config.lovelace.dashboards.conf_mode.${dashboard.mode}`
                        )}${dashboard.filename
                          ? html` - ${dashboard.filename} `
                          : ""}
                      </span>
                      <ha-svg-icon
                        class="meta-icon"
                        slot="meta"
                        .path=${mdiChevronRight}
                      ></ha-svg-icon>
                    </mwc-list-item>
                  `
                )}
              </mwc-list>
              <div class="footer">
                <a class="config-link" href="/config/lovelace">
                  <mwc-button
                    >Manage Lovelace Dashboards & Resources</mwc-button
                  >
                </a>
              </div>
            </ha-card>
          </div>
        </div>
      </ha-app-layout>
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this._fetchPersonData();
    this._fetchIntegrationData();
    this._fetchTags();
    this._fetchDasboards();
    this._fetchSubscriptionInfo();
    this._updateCloudStatus();
    this._fetchWebhooks();
    subscribeEntityRegistry(this.hass.connection, (entries) => {
      this._entityRegistryEntries = entries;
    });
    subscribeDeviceRegistry(this.hass.connection, (entries) => {
      this._deviceRegistryEntries = entries;
    });
  }

  private async _fetchSubscriptionInfo() {
    this._subscription = await fetchCloudSubscriptionInfo(this.hass);
    if (
      this._subscription.provider &&
      this.cloudStatus &&
      this.cloudStatus.cloud !== "connected"
    ) {
      this._updateCloudStatus();
    }
  }

  private async _updateCloudStatus() {
    this._cloudStatus = await fetchCloudStatus(this.hass);

    if (this._cloudStatus.cloud === "connecting") {
      setTimeout(() => this._updateCloudStatus(), 5000);
    }
  }

  private async _fetchWebhooks() {
    this._localHooks = this.hass!.config.components.includes("webhook")
      ? await fetchWebhooks(this.hass!)
      : [];
  }

  private async _fetchPersonData() {
    const personData = await fetchPersons(this.hass!);

    const personDataStorage = personData.storage.sort((ent1, ent2) =>
      compare(ent1.name, ent2.name)
    );
    const personDataConfig = personData.config.sort((ent1, ent2) =>
      compare(ent1.name, ent2.name)
    );

    this._persons = [...personDataStorage, ...personDataConfig];
  }

  private async _fetchIntegrationData() {
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
    return this._deviceRegistryEntries.filter(
      (device) =>
        device.config_entries.includes(configEntry.entry_id) &&
        device.entry_type !== "service"
    );
  }

  private _getServices(configEntry: ConfigEntry): DeviceRegistryEntry[] {
    if (!this._deviceRegistryEntries) {
      return [];
    }
    return this._deviceRegistryEntries.filter(
      (device) =>
        device.config_entries.includes(configEntry.entry_id) &&
        device.entry_type === "service"
    );
  }

  private _getAutomations = memoizeOne(
    (states: HassEntities): AutomationEntity[] => {
      return Object.values(states)
        .filter((entity) => computeStateDomain(entity) === "automation")
        .slice(0, 2) as AutomationEntity[];
    }
  );

  private _getScripts = memoizeOne(
    (states: HassEntities): AutomationEntity[] => {
      return Object.values(states)
        .filter((entity) => computeStateDomain(entity) === "script")
        .slice(0, 2) as AutomationEntity[];
    }
  );

  private _getScenes = memoizeOne(
    (states: HassEntities): AutomationEntity[] => {
      return Object.values(states)
        .filter((entity) => computeStateDomain(entity) === "scene")
        .slice(0, 2) as AutomationEntity[];
    }
  );

  private _getHelpers = memoizeOne(
    (states: HassEntities): AutomationEntity[] => {
      return Object.values(states)
        .filter((entity) => HELPER_DOMAINS.includes(computeStateDomain(entity)))
        .slice(0, 2) as AutomationEntity[];
    }
  );

  private async _fetchTags() {
    this._tags = await fetchTags(this.hass);
  }

  private async _fetchDasboards() {
    this._dashboards = await fetchDashboards(this.hass);
  }

  private _getDasboards = memoize((dashboards: LovelaceDashboard[]) => {
    const defaultMode = (this.hass.panels?.lovelace
      ?.config as LovelacePanelConfig).mode;
    const defaultUrlPath = this.hass.defaultPanel;
    const isDefault = defaultUrlPath === "lovelace";
    return [
      {
        icon: "hass:view-dashboard",
        title: this.hass.localize("panel.states"),
        default: isDefault,
        sidebar: isDefault,
        require_admin: false,
        url_path: "lovelace",
        mode: defaultMode,
        filename: defaultMode === "yaml" ? "ui-lovelace.yaml" : "",
      },
      ...dashboards.map((dashboard) => {
        return {
          filename: "",
          ...dashboard,
          default: defaultUrlPath === dashboard.url_path,
        };
      }),
    ].slice(0, 2);
  });

  static get styles(): CSSResultArray {
    return [
      haStyle,
      css`
        :host {
          --mdc-theme-text-secondary-on-background: var(--secondary-text-color);
        }

        app-header {
          --app-header-background-color: var(--primary-background-color);
        }

        .content {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr;
          grid-template-rows: 0.8fr;
          grid-template-areas: "Left Main Main Main";
          gap: 18px 18px;
          padding: 18px;
        }

        .main {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          grid-auto-rows: minmax(min-content, max-content);
          gap: 18px 18px;
          grid-template-areas:
            "Integration Integration Integration"
            "Integration Integration Integration"
            "Automation Script Scene"
            "Helper Tag Dashboard";
          grid-area: Main;
        }

        .left {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          grid-auto-rows: minmax(min-content, max-content);
          gap: 18px 18px;
          grid-template-areas:
            "Person Person Person"
            "Cloud Cloud Cloud"
            "Server Server Server";
          grid-area: Left;
        }

        #PersonCard {
          --mdc-list-item-graphic-size: 56px;
          --person-picture-size: 56px;
          grid-area: Person;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        #CloudCard {
          grid-area: Cloud;
        }

        #ServerCard {
          grid-area: Server;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        #IntegrationCard {
          grid-area: Integration;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .integrations {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          grid-template-rows: 1fr 1fr;
          gap: 1px 1px;
        }

        .card-content {
          padding: 16px;
          text-align: center;
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
          max-height: 100%;
          max-width: 90%;
        }

        #AutomationCard {
          grid-area: Automation;
        }

        #ScriptCard {
          grid-area: Script;
        }

        #SceneCard {
          grid-area: Scene;
        }

        #HelperCard {
          display: flex;
          flex-direction: column;
          grid-area: Helper;
        }

        #TagsCard {
          display: flex;
          flex-direction: column;
          grid-area: Tag;
        }

        #LovelaceCard {
          display: flex;
          flex-direction: column;
          grid-area: Dashboard;
        }

        .footer {
          width: 100%;
          min-height: 35px;
          border-top: 1px solid var(--divider-color);
          align-self: flex-end;
        }

        .secondary {
          font-size: 14px;
          line-height: 1.2;
        }

        .config-link {
          text-decoration: none;
        }

        .meta-icon {
          color: var(--secondary-text-color);
        }

        @media (max-width: 1525px) {
          .content {
            grid-template-columns: 1fr 1fr 1fr 1fr;
            grid-template-rows: 0.8fr;
            grid-template-areas: "Left Main Main Main";
          }

          .main {
            grid-template-columns: 1fr 1fr;
            grid-auto-rows: minmax(min-content, max-content);
            grid-template-areas:
              "Integration Integration"
              "Integration Integration"
              "Automation Script"
              "Scene Helper"
              "Tag Dashboard";
          }

          .left {
            grid-template-columns: 1fr 1fr 1fr;
            grid-auto-rows: minmax(min-content, max-content);
            grid-template-areas:
              "Person Person Person"
              "Cloud Cloud Cloud"
              "Server Server Server";
          }

          .integrations {
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-template-rows: 1fr 1fr;
            gap: 1px 1px;
          }
        }

        @media (max-width: 1250px) {
          .content {
            grid-template-columns: 1fr;
            grid-template-areas: "Left" "Main";
          }

          .left {
            grid-template-columns: 1fr 1fr;
            grid-template-areas:
              "Person Person"
              "Cloud Server";
          }
        }

        @media (max-width: 925px) {
        }

        :host([narrow]) .content {
          grid-template-columns: 1fr;
          grid-template-areas: "Left" "Main";
        }

        :host([narrow]) .left {
          grid-template-columns: 1fr 1fr;
          grid-template-areas:
            "Person Person"
            "Cloud Server";
        }

        :host([narrow]) .integrations {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-around;
        }

        @media (max-width: 675px) {
          .left {
            display: flex;
            flex-direction: column;
          }

          .main {
            grid-template-columns: 1fr;
            grid-auto-rows: minmax(min-content, max-content);
            grid-template-areas:
              "Integration"
              "Integration"
              "Automation" "Script"
              "Scene" "Helper"
              "Tag" "Dashboard";
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-dashboard": HaConfigDashboard;
  }
}
