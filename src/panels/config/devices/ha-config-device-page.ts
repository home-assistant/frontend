import {
  property,
  LitElement,
  html,
  customElement,
  css,
  CSSResult,
} from "lit-element";

import memoizeOne from "memoize-one";

import "@polymer/paper-tooltip/paper-tooltip";

import "../../../layouts/hass-tabs-subpage";
import "../../../layouts/hass-error-screen";
import "../ha-config-section";

import "./device-detail/ha-device-info-card";
import "./device-detail/ha-device-card-mqtt";
import "./device-detail/ha-device-entities-card";
import { HomeAssistant, Route } from "../../../types";
import { ConfigEntry } from "../../../data/config_entries";
import {
  EntityRegistryEntry,
  updateEntityRegistryEntry,
  findBatteryEntity,
} from "../../../data/entity_registry";
import {
  DeviceRegistryEntry,
  computeDeviceName,
  updateDeviceRegistryEntry,
} from "../../../data/device_registry";
import { AreaRegistryEntry } from "../../../data/area_registry";
import {
  loadDeviceRegistryDetailDialog,
  showDeviceRegistryDetailDialog,
} from "../../../dialogs/device-registry-detail/show-dialog-device-registry-detail";
import "../../../components/ha-icon-next";
import { compare } from "../../../common/string/compare";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { createValidEntityId } from "../../../common/entity/valid_entity_id";
import { configSections } from "../ha-panel-config";
import { RelatedResult, findRelated } from "../../../data/search";
import { SceneEntities, showSceneEditor } from "../../../data/scene";
import { navigate } from "../../../common/navigate";
import { showDeviceAutomationDialog } from "./device-detail/show-dialog-device-automation";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { ifDefined } from "lit-html/directives/if-defined";

export interface EntityRegistryStateEntry extends EntityRegistryEntry {
  stateName?: string;
}

@customElement("ha-config-device-page")
export class HaConfigDevicePage extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public devices!: DeviceRegistryEntry[];
  @property() public entries!: ConfigEntry[];
  @property() public entities!: EntityRegistryEntry[];
  @property() public areas!: AreaRegistryEntry[];
  @property() public deviceId!: string;
  @property({ type: Boolean, reflect: true }) public narrow!: boolean;
  @property() public isWide!: boolean;
  @property() public showAdvanced!: boolean;
  @property() public route!: Route;
  @property() private _related?: RelatedResult;

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

  private _batteryEntity = memoizeOne((entities: EntityRegistryEntry[]):
    | EntityRegistryEntry
    | undefined => findBatteryEntity(this.hass, entities));

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
    const batteryState = batteryEntity
      ? this.hass.states[batteryEntity.entity_id]
      : undefined;
    const areaName = this._computeAreaName(this.areas, device);

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

        <paper-icon-button
          slot="toolbar-icon"
          icon="hass:settings"
          @click=${this._showSettings}
        ></paper-icon-button>

        <div class="container">
          <div class="header fullwidth">              
            ${
              this.narrow
                ? ""
                : html`
                    <div>
                      <h1>${computeDeviceName(device, this.hass)}</h1>
                      ${areaName
                        ? this.hass.localize(
                            "ui.panel.config.integrations.config_entry.area",
                            "area",
                            areaName
                          )
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
                            <ha-state-icon
                              .hass=${this.hass!}
                              .stateObj=${batteryState}
                            ></ha-state-icon>
                          </div>
                        `
                      : ""
                  }
                  <img
                    src="https://brands.home-assistant.io/${
                      integrations[0]
                    }/logo.png"
                    srcset="
                      https://brands.home-assistant.io/${
                        integrations[0]
                      }/logo@2x.png 2x
                    "
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
              ${
                integrations.includes("mqtt")
                  ? html`
                      <ha-device-card-mqtt
                        .hass=${this.hass}
                        .device=${device}
                      ></ha-device-card-mqtt>
                    `
                  : html``
              }
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
                        <paper-icon-button
                          @click=${this._showAutomationDialog}
                          title=${this.hass.localize(
                            "ui.panel.config.devices.automation.create"
                          )}
                          icon="hass:plus-circle"
                        ></paper-icon-button>
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
                            <paper-item class="no-link"
                              >${this.hass.localize(
                                "ui.panel.config.devices.automation.no_automations"
                              )}</paper-item
                            >
                          `}
                    </ha-card>
                  `
                : ""
            }
            </div>
            <div class="column">
            ${
              isComponentLoaded(this.hass, "scene")
                ? html`
                    <ha-card>
                        <div class="card-header">
                          ${this.hass.localize(
                            "ui.panel.config.devices.scene.scenes"
                          )}
                          ${
                            entities.length
                              ? html`
                                  <paper-icon-button
                                    @click=${this._createScene}
                                    title=${this.hass.localize(
                                      "ui.panel.config.devices.scene.create"
                                    )}
                                    icon="hass:plus-circle"
                                  ></paper-icon-button>
                                `
                              : ""
                          }
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
                                <paper-item class="no-link"
                                  >${this.hass.localize(
                                    "ui.panel.config.devices.scene.no_scenes"
                                  )}</paper-item
                                >
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
                          <paper-icon-button
                            @click=${this._showScriptDialog}
                            title=${this.hass.localize(
                              "ui.panel.config.devices.script.create"
                            )}
                            icon="hass:plus-circle"
                          ></paper-icon-button>
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
                                  "ui.panel.config.devices.script.no_scripts"
                                )}</paper-item
                              >
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

  private _computeEntityName(entity) {
    if (entity.name) {
      return entity.name;
    }
    const state = this.hass.states[entity.entity_id];
    return state ? computeStateName(state) : null;
  }

  private _computeAreaName(areas, device): string | undefined {
    if (!areas || !device || !device.area_id) {
      return undefined;
    }
    return areas.find((area) => area.area_id === device.area_id).name;
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
          confirm(
            this.hass.localize(
              "ui.panel.config.devices.confirm_rename_entity_ids"
            )
          );

        const updateProms = entities.map((entity) => {
          const name = entity.name || entity.stateName;
          let newEntityId: string | null = null;
          let newName: string | null = null;

          if (name && name.includes(oldDeviceName)) {
            newName = name.replace(oldDeviceName, newDeviceName);
          }

          if (renameEntityid) {
            const oldSearch = createValidEntityId(oldDeviceName);
            if (entity.entity_id.includes(oldSearch)) {
              newEntityId = entity.entity_id.replace(
                oldSearch,
                createValidEntityId(newDeviceName)
              );
            }
          }

          if (!newName && !newEntityId) {
            return new Promise((resolve) => resolve());
          }

          return updateEntityRegistryEntry(this.hass!, entity.entity_id, {
            name: newName || name,
            disabled_by: entity.disabled_by,
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

      .card-header paper-icon-button {
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
        color: var(--primary-text-color);
      }
    `;
  }
}
