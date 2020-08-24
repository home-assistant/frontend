import "@polymer/paper-tooltip/paper-tooltip";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
  TemplateResult,
} from "lit-element";
import { ifDefined } from "lit-html/directives/if-defined";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { compare } from "../../../common/string/compare";
import "../../../components/entity/ha-battery-icon";
import "../../../components/ha-icon-next";
import { AreaRegistryEntry } from "../../../data/area_registry";
import { ConfigEntry } from "../../../data/config_entries";
import {
  computeDeviceName,
  DeviceRegistryEntry,
  updateDeviceRegistryEntry,
} from "../../../data/device_registry";
import {
  EntityRegistryEntry,
  findBatteryEntity,
  findBatteryChargingEntity,
  updateEntityRegistryEntry,
} from "../../../data/entity_registry";
import { SceneEntities, showSceneEditor } from "../../../data/scene";
import { findRelated, RelatedResult } from "../../../data/search";
import {
  loadDeviceRegistryDetailDialog,
  showDeviceRegistryDetailDialog,
} from "../../../dialogs/device-registry-detail/show-dialog-device-registry-detail";
import "../../../layouts/hass-error-screen";
import "../../../layouts/hass-tabs-subpage";
import { HomeAssistant, Route } from "../../../types";
import "../ha-config-section";
import { configSections } from "../ha-panel-config";
import "./device-detail/ha-device-entities-card";
import "./device-detail/ha-device-info-card";
import { showDeviceAutomationDialog } from "./device-detail/show-dialog-device-automation";
import { slugify } from "../../../common/string/slugify";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";

export interface EntityRegistryStateEntry extends EntityRegistryEntry {
  stateName?: string | null;
}

@customElement("ha-config-device-page")
export class HaConfigDevicePage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public devices!: DeviceRegistryEntry[];

  @property() public entries!: ConfigEntry[];

  @property() public entities!: EntityRegistryEntry[];

  @property() public areas!: AreaRegistryEntry[];

  @property() public deviceId!: string;

  @property({ type: Boolean, reflect: true }) public narrow!: boolean;

  @property() public isWide!: boolean;

  @property() public showAdvanced!: boolean;

  @property() public route!: Route;

  @internalProperty() private _related?: RelatedResult;

  private _device = memoizeOne(
    (
      deviceId: string,
      devices: DeviceRegistryEntry[]
    ): DeviceRegistryEntry | undefined =>
      devices ? devices.find((device) => device.id === deviceId) : undefined
  );

  private _integrations = memoizeOne(
    (device: DeviceRegistryEntry, entries: ConfigEntry[]): string[] =>
      entries
        .filter((entry) => device.config_entries.includes(entry.entry_id))
        .map((entry) => entry.domain)
  );

  private _entities = memoizeOne(
    (
      deviceId: string,
      entities: EntityRegistryEntry[]
    ): EntityRegistryStateEntry[] =>
      entities
        .filter((entity) => entity.device_id === deviceId)
        .map((entity) => {
          return { ...entity, stateName: this._computeEntityName(entity) };
        })
        .sort((ent1, ent2) =>
          compare(
            ent1.stateName || `zzz${ent1.entity_id}`,
            ent2.stateName || `zzz${ent2.entity_id}`
          )
        )
  );

  private _computeArea = memoizeOne((areas, device):
    | AreaRegistryEntry
    | undefined => {
    if (!areas || !device || !device.area_id) {
      return undefined;
    }
    return areas.find((area) => area.area_id === device.area_id);
  });

  private _batteryEntity = memoizeOne((entities: EntityRegistryEntry[]):
    | EntityRegistryEntry
    | undefined => findBatteryEntity(this.hass, entities));

  private _batteryChargingEntity = memoizeOne(
    (entities: EntityRegistryEntry[]): EntityRegistryEntry | undefined =>
      findBatteryChargingEntity(this.hass, entities)
  );

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    loadDeviceRegistryDetailDialog();
  }

  protected updated(changedProps) {
    super.updated(changedProps);
    if (changedProps.has("deviceId")) {
      this._findRelated();
    }
  }

  protected render() {
    const device = this._device(this.deviceId, this.devices);

    if (!device) {
      return html`
        <hass-error-screen
          error="${this.hass.localize(
            "ui.panel.config.devices.device_not_found"
          )}"
        ></hass-error-screen>
      `;
    }

    const integrations = this._integrations(device, this.entries);
    const entities = this._entities(this.deviceId, this.entities);
    const batteryEntity = this._batteryEntity(entities);
    const batteryChargingEntity = this._batteryChargingEntity(entities);
    const batteryState = batteryEntity
      ? this.hass.states[batteryEntity.entity_id]
      : undefined;
    const batteryChargingState = batteryChargingEntity
      ? this.hass.states[batteryChargingEntity.entity_id]
      : undefined;
    const area = this._computeArea(this.areas, device);

    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .tabs=${configSections.integrations}
        .route=${this.route}
      >
        ${
          this.narrow
            ? html`
                <span slot="header">
                  ${computeDeviceName(device, this.hass)}
                </span>
              `
            : ""
        }

        <ha-icon-button
          slot="toolbar-icon"
          icon="hass:cog"
          @click=${this._showSettings}
        ></ha-icon-button>

        <div class="container">
          <div class="header fullwidth">
            ${
              this.narrow
                ? ""
                : html`
                    <div>
                      <h1>${computeDeviceName(device, this.hass)}</h1>
                      ${area
                        ? html`
                            <a href="/config/areas/area/${area.area_id}"
                              >${this.hass.localize(
                                "ui.panel.config.integrations.config_entry.area",
                                "area",
                                area.name || "Unnamed Area"
                              )}</a
                            >
                          `
                        : ""}
                    </div>
                  `
            }
                <div class="header-right">
                  ${
                    batteryState
                      ? html`
                          <div class="battery">
                            ${batteryState.state}%
                            <ha-battery-icon
                              .hass=${this.hass!}
                              .batteryStateObj=${batteryState}
                              .batteryChargingStateObj=${batteryChargingState}
                            ></ha-battery-icon>
                          </div>
                        `
                      : ""
                  }
                  <img
                    src="https://brands.home-assistant.io/${
                      integrations[0]
                    }/logo.png"
                    referrerpolicy="no-referrer"
                    @load=${this._onImageLoad}
                    @error=${this._onImageError}
                  />
                </div>
          </div>
          <div class="column">
              <ha-device-info-card
                .hass=${this.hass}
                .areas=${this.areas}
                .devices=${this.devices}
                .device=${device}
              >
              ${this._renderIntegrationInfo(device, integrations)}
              </ha-device-info-card>

            ${
              entities.length
                ? html`
                    <ha-device-entities-card
                      .hass=${this.hass}
                      .entities=${entities}
                    >
                    </ha-device-entities-card>
                  `
                : html``
            }
          </div>
            <div class="column">
            ${
              isComponentLoaded(this.hass, "automation")
                ? html`
                    <ha-card>
                      <div class="card-header">
                        ${this.hass.localize(
                          "ui.panel.config.devices.automation.automations"
                        )}
                        <ha-icon-button
                          @click=${this._showAutomationDialog}
                          title=${this.hass.localize(
                            "ui.panel.config.devices.automation.create"
                          )}
                          icon="hass:plus-circle"
                        ></ha-icon-button>
                      </div>
                      ${this._related?.automation?.length
                        ? this._related.automation.map((automation) => {
                            const state = this.hass.states[automation];
                            return state
                              ? html`
                                  <div>
                                    <a
                                      href=${ifDefined(
                                        state.attributes.id
                                          ? `/config/automation/edit/${state.attributes.id}`
                                          : undefined
                                      )}
                                    >
                                      <paper-item
                                        .automation=${state}
                                        .disabled=${!state.attributes.id}
                                      >
                                        <paper-item-body>
                                          ${computeStateName(state)}
                                        </paper-item-body>
                                        <ha-icon-next></ha-icon-next>
                                      </paper-item>
                                    </a>
                                    ${!state.attributes.id
                                      ? html`
                                          <paper-tooltip
                                            >${this.hass.localize(
                                              "ui.panel.config.devices.cant_edit"
                                            )}
                                          </paper-tooltip>
                                        `
                                      : ""}
                                  </div>
                                `
                              : "";
                          })
                        : html`
                            <paper-item class="no-link">
                              ${this.hass.localize(
                                "ui.panel.config.devices.add_prompt",
                                "name",
                                this.hass.localize(
                                  "ui.panel.config.devices.automation.automations"
                                )
                              )}
                            </paper-item>
                          `}
                    </ha-card>
                  `
                : ""
            }
            </div>
            <div class="column">
            ${
              isComponentLoaded(this.hass, "scene") && entities.length
                ? html`
                    <ha-card>
                        <div class="card-header">
                          ${this.hass.localize(
                            "ui.panel.config.devices.scene.scenes"
                          )}

                                  <ha-icon-button
                                    @click=${this._createScene}
                                    title=${this.hass.localize(
                                      "ui.panel.config.devices.scene.create"
                                    )}
                                    icon="hass:plus-circle"
                                  ></ha-icon-button>
                        </div>

                        ${
                          this._related?.scene?.length
                            ? this._related.scene.map((scene) => {
                                const state = this.hass.states[scene];
                                return state
                                  ? html`
                                      <div>
                                        <a
                                          href=${ifDefined(
                                            state.attributes.id
                                              ? `/config/scene/edit/${state.attributes.id}`
                                              : undefined
                                          )}
                                        >
                                          <paper-item
                                            .scene=${state}
                                            .disabled=${!state.attributes.id}
                                          >
                                            <paper-item-body>
                                              ${computeStateName(state)}
                                            </paper-item-body>
                                            <ha-icon-next></ha-icon-next>
                                          </paper-item>
                                        </a>
                                        ${!state.attributes.id
                                          ? html`
                                              <paper-tooltip
                                                >${this.hass.localize(
                                                  "ui.panel.config.devices.cant_edit"
                                                )}
                                              </paper-tooltip>
                                            `
                                          : ""}
                                      </div>
                                    `
                                  : "";
                              })
                            : html`
                                <paper-item class="no-link">
                                  ${this.hass.localize(
                                    "ui.panel.config.devices.add_prompt",
                                    "name",
                                    this.hass.localize(
                                      "ui.panel.config.devices.scene.scenes"
                                    )
                                  )}
                                </paper-item>
                              `
                        }
                      </ha-card>
                    </ha-card>
                  `
                : ""
            }
              ${
                isComponentLoaded(this.hass, "script")
                  ? html`
                      <ha-card>
                        <div class="card-header">
                          ${this.hass.localize(
                            "ui.panel.config.devices.script.scripts"
                          )}
                          <ha-icon-button
                            @click=${this._showScriptDialog}
                            title=${this.hass.localize(
                              "ui.panel.config.devices.script.create"
                            )}
                            icon="hass:plus-circle"
                          ></ha-icon-button>
                        </div>
                        ${this._related?.script?.length
                          ? this._related.script.map((script) => {
                              const state = this.hass.states[script];
                              return state
                                ? html`
                                    <a
                                      href=${ifDefined(
                                        state.attributes.id
                                          ? `/config/script/edit/${state.attributes.id}`
                                          : undefined
                                      )}
                                    >
                                      <paper-item .script=${script}>
                                        <paper-item-body>
                                          ${computeStateName(state)}
                                        </paper-item-body>
                                        <ha-icon-next></ha-icon-next>
                                      </paper-item>
                                    </a>
                                  `
                                : "";
                            })
                          : html`
                              <paper-item class="no-link">
                                ${this.hass.localize(
                                  "ui.panel.config.devices.add_prompt",
                                  "name",
                                  this.hass.localize(
                                    "ui.panel.config.devices.script.scripts"
                                  )
                                )}
                              </paper-item>
                            `}
                      </ha-card>
                    `
                  : ""
              }
            </div>
        </div>
        </ha-config-section>
      </hass-tabs-subpage>    `;
  }

  private _computeEntityName(entity: EntityRegistryEntry) {
    if (entity.name) {
      return entity.name;
    }
    const state = this.hass.states[entity.entity_id];
    return state ? computeStateName(state) : null;
  }

  private _onImageLoad(ev) {
    ev.target.style.display = "inline-block";
  }

  private _onImageError(ev) {
    ev.target.style.display = "none";
  }

  private async _findRelated() {
    this._related = await findRelated(this.hass, "device", this.deviceId);
  }

  private _createScene() {
    const entities: SceneEntities = {};
    this._entities(this.deviceId, this.entities).forEach((entity) => {
      entities[entity.entity_id] = "";
    });
    showSceneEditor(this, {
      entities,
    });
  }

  private _showScriptDialog() {
    showDeviceAutomationDialog(this, { deviceId: this.deviceId, script: true });
  }

  private _showAutomationDialog() {
    showDeviceAutomationDialog(this, {
      deviceId: this.deviceId,
      script: false,
    });
  }

  private _renderIntegrationInfo(
    device,
    integrations: string[]
  ): TemplateResult[] {
    const templates: TemplateResult[] = [];
    if (integrations.includes("mqtt")) {
      import(
        "./device-detail/integration-elements/mqtt/ha-device-actions-mqtt"
      );
      templates.push(html`
        <div class="card-actions" slot="actions">
          <ha-device-actions-mqtt
            .hass=${this.hass}
            .device=${device}
          ></ha-device-actions-mqtt>
        </div>
      `);
    }
    if (integrations.includes("ozw")) {
      import("./device-detail/integration-elements/ozw/ha-device-info-ozw");
      templates.push(html`
        <ha-device-info-ozw
          .hass=${this.hass}
          .device=${device}
        ></ha-device-info-ozw>
      `);
    }
    if (integrations.includes("zha")) {
      import("./device-detail/integration-elements/zha/ha-device-actions-zha");
      import("./device-detail/integration-elements/zha/ha-device-info-zha");
      templates.push(html`
        <ha-device-info-zha
          .hass=${this.hass}
          .device=${device}
        ></ha-device-info-zha>
        <div class="card-actions" slot="actions">
          <ha-device-actions-zha
            .hass=${this.hass}
            .device=${device}
          ></ha-device-actions-zha>
        </div>
      `);
    }
    return templates;
  }

  private async _showSettings() {
    const device = this._device(this.deviceId, this.devices)!;
    showDeviceRegistryDetailDialog(this, {
      device,
      updateEntry: async (updates) => {
        const oldDeviceName = device.name_by_user || device.name;
        const newDeviceName = updates.name_by_user;
        await updateDeviceRegistryEntry(this.hass, this.deviceId, updates);

        if (
          !oldDeviceName ||
          !newDeviceName ||
          oldDeviceName === newDeviceName
        ) {
          return;
        }
        const entities = this._entities(this.deviceId, this.entities);

        const renameEntityid =
          this.showAdvanced &&
          (await showConfirmationDialog(this, {
            title: this.hass.localize(
              "ui.panel.config.devices.confirm_rename_entity_ids"
            ),
            text: this.hass.localize(
              "ui.panel.config.devices.confirm_rename_entity_ids_warning"
            ),
          }));

        const updateProms = entities.map((entity) => {
          const name = entity.name || entity.stateName;
          let newEntityId: string | null = null;
          let newName: string | null = null;

          if (name && name.includes(oldDeviceName)) {
            newName = name.replace(oldDeviceName, newDeviceName);
          }

          if (renameEntityid) {
            const oldSearch = slugify(oldDeviceName);
            if (entity.entity_id.includes(oldSearch)) {
              newEntityId = entity.entity_id.replace(
                oldSearch,
                slugify(newDeviceName)
              );
            }
          }

          if (!newName && !newEntityId) {
            return new Promise((resolve) => resolve());
          }

          return updateEntityRegistryEntry(this.hass!, entity.entity_id, {
            name: newName || name,
            new_entity_id: newEntityId || entity.entity_id,
          });
        });
        await Promise.all(updateProms);
      },
    });
  }

  static get styles(): CSSResult {
    return css`
      .container {
        display: flex;
        flex-wrap: wrap;
        margin: auto;
        max-width: 1000px;
        margin-top: 32px;
        margin-bottom: 32px;
      }

      .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .card-header ha-icon-button {
        margin-right: -8px;
        color: var(--primary-color);
        height: auto;
      }

      .device-info {
        padding: 16px;
      }

      .show-more {
      }

      h1 {
        margin: 0;
        font-family: var(--paper-font-headline_-_font-family);
        -webkit-font-smoothing: var(
          --paper-font-headline_-_-webkit-font-smoothing
        );
        font-size: var(--paper-font-headline_-_font-size);
        font-weight: var(--paper-font-headline_-_font-weight);
        letter-spacing: var(--paper-font-headline_-_letter-spacing);
        line-height: var(--paper-font-headline_-_line-height);
        opacity: var(--dark-primary-opacity);
      }

      .header {
        display: flex;
        justify-content: space-between;
      }

      .column,
      .fullwidth {
        padding: 8px;
        box-sizing: border-box;
      }
      .column {
        width: 33%;
        flex-grow: 1;
      }
      .fullwidth {
        width: 100%;
        flex-grow: 1;
      }

      .header-right {
        align-self: center;
      }

      .header-right img {
        height: 30px;
      }

      .header-right {
        display: flex;
      }

      .header-right:first-child {
        width: 100%;
        justify-content: flex-end;
      }

      .header-right > *:not(:first-child) {
        margin-left: 16px;
      }

      .battery {
        align-self: center;
        align-items: center;
        display: flex;
      }

      .column > *:not(:first-child) {
        margin-top: 16px;
      }

      :host([narrow]) .column {
        width: 100%;
      }

      :host([narrow]) .container {
        margin-top: 0;
      }

      paper-item {
        cursor: pointer;
      }

      paper-item.no-link {
        cursor: default;
      }

      a {
        text-decoration: none;
        color: var(--primary-color);
      }

      ha-card {
        padding-bottom: 8px;
      }

      ha-card a {
        color: var(--primary-text-color);
      }
    `;
  }
}
