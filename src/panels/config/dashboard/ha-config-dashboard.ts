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
import { CloudStatus } from "../../../data/cloud";
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
import { fetchPersons, Person } from "../../../data/person";
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

  @property() public isWide!: boolean;

  @property() public cloudStatus?: CloudStatus;

  @property() public showAdvanced!: boolean;

  @internalProperty() private _persons?: Person[];

  @internalProperty() private _configEntries?: ConfigEntryExtended[];

  @internalProperty()
  private _entityRegistryEntries: EntityRegistryEntry[] = [];

  @internalProperty()
  private _deviceRegistryEntries: DeviceRegistryEntry[] = [];

  protected render(): TemplateResult {
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
                <mwc-button>Manage Persons, Users & Zones</mwc-button>
              </div>
            </ha-card>
            <ha-card outlined id="CloudCard">
              <div class="card-header">
                <div class="header">Cloud</div>
                <div class="secondary">zackbarett@hey.com</div>
              </div>
              <mwc-list>
                <mwc-list-item twoline hasMeta>
                  <span>Remote UI</span>
                  <span slot="secondary">Connected</span>
                  <ha-svg-icon
                    slot="meta"
                    .path=${mdiChevronRight}
                  ></ha-svg-icon>
                </mwc-list-item>
                <mwc-list-item twoline hasMeta>
                  <span>Google Assistant</span>
                  <span slot="secondary">Enabled</span>
                  <ha-svg-icon
                    slot="meta"
                    .path=${mdiChevronRight}
                  ></ha-svg-icon>
                </mwc-list-item>
                <mwc-list-item twoline hasMeta>
                  <span>Amazon Alexa</span>
                  <span slot="secondary">Disabled</span>
                  <ha-svg-icon
                    slot="meta"
                    .path=${mdiChevronRight}
                  ></ha-svg-icon>
                </mwc-list-item>
                <mwc-list-item twoline hasMeta>
                  <span>Webhooks</span>
                  <span slot="secondary">3 active</span>
                  <ha-svg-icon
                    slot="meta"
                    .path=${mdiChevronRight}
                  ></ha-svg-icon>
                </mwc-list-item>
              </mwc-list>
              <div class="footer">
                <mwc-button>Manage Cloud Services</mwc-button>
              </div>
            </ha-card>
            <ha-card outlined id="ServerCard" .header=${"Server"}>
              <mwc-list>
                <mwc-list-item twoline hasMeta>
                  <span>Location Settings</span>
                  <span slot="secondary">Unit system, timezone, etc</span>
                  <ha-svg-icon
                    slot="meta"
                    .path=${mdiChevronRight}
                  ></ha-svg-icon>
                </mwc-list-item>
                <mwc-list-item twoline hasMeta>
                  <span>Server Control</span>
                  <span slot="secondary">Stop and Start Home Assistant</span>
                  <ha-svg-icon
                    slot="meta"
                    .path=${mdiChevronRight}
                  ></ha-svg-icon>
                </mwc-list-item>
                <mwc-list-item twoline hasMeta>
                  <span>Logs</span>
                  <span slot="secondary">Server Logs</span>
                  <ha-svg-icon
                    slot="meta"
                    .path=${mdiChevronRight}
                  ></ha-svg-icon>
                </mwc-list-item>
                <mwc-list-item twoline hasMeta>
                  <span>Add-ons</span>
                  <span slot="secondary">Manage Addons</span>
                  <ha-svg-icon
                    slot="meta"
                    .path=${mdiChevronRight}
                  ></ha-svg-icon>
                </mwc-list-item>
                <mwc-list-item twoline hasMeta>
                  <span>About</span>
                  <span slot="secondary">Info about the server</span>
                  <ha-svg-icon
                    slot="meta"
                    .path=${mdiChevronRight}
                  ></ha-svg-icon>
                </mwc-list-item>
              </mwc-list>
              <div class="footer">
                <mwc-button>Manage Server</mwc-button>
              </div>
            </ha-card>
          </div>
          <div class="main">
            <ha-card outlined id="IntegrationCard">
              <div class="integrations">
                ${this._configEntries?.map((entry) => {
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
                <mwc-button>Manage integrations</mwc-button>
              </div>
            </ha-card>
            <ha-card outlined id="AutomationCard" .header=${"Automations"}>
              <mwc-list>
                ${this._getAutomations(this.hass.states).map(
                  (automation) => html`
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
                    </mwc-list-item>
                    <ha-svg-icon
                      slot="meta"
                      .path=${mdiChevronRight}
                    ></ha-svg-icon>
                  `
                )}
              </mwc-list>
              <div class="footer">
                <mwc-button>Manage Automations</mwc-button>
              </div>
            </ha-card>
            <ha-card outlined id="ScriptCard" .header=${"Scripts"}>
              <mwc-list>
                ${this._getScripts(this.hass.states).map(
                  (automation) => html`
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
                    </mwc-list-item>
                    <ha-svg-icon
                      slot="meta"
                      .path=${mdiChevronRight}
                    ></ha-svg-icon>
                  `
                )}
              </mwc-list>
              <div class="footer">
                <mwc-button>Manage Scripts</mwc-button>
              </div>
            </ha-card>
            <ha-card outlined id="SceneCard" .header=${"Scenes"}>
              <mwc-list>
                ${this._getScenes(this.hass.states).map(
                  (automation) => html`
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
                    </mwc-list-item>
                    <ha-svg-icon
                      slot="meta"
                      .path=${mdiChevronRight}
                    ></ha-svg-icon>
                  `
                )}
              </mwc-list>
              <div class="footer">
                <mwc-button>Manage Scenes</mwc-button>
              </div>
            </ha-card>
            <ha-card outlined id="HelperCard" .header=${"Helpers"}>
              <mwc-list>
                ${this._getHelpers(this.hass.states).map(
                  (automation) => html`
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
                    </mwc-list-item>
                    <ha-svg-icon
                      slot="meta"
                      .path=${mdiChevronRight}
                    ></ha-svg-icon>
                  `
                )}
              </mwc-list>
              <div class="footer">
                <mwc-button>Manage Helpers</mwc-button>
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
    subscribeEntityRegistry(this.hass.connection, (entries) => {
      this._entityRegistryEntries = entries;
    });
    subscribeDeviceRegistry(this.hass.connection, (entries) => {
      this._deviceRegistryEntries = entries;
    });
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
        .slice(0, 6)
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
            "Automation Script Scene";
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-dashboard": HaConfigDashboard;
  }
}
