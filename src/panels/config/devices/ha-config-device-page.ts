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

import "./device-detail/ha-device-card";
import "./device-detail/ha-device-entities-card";
import { HomeAssistant, Route } from "../../../types";
import { ConfigEntry } from "../../../data/config_entries";
import {
  EntityRegistryEntry,
  updateEntityRegistryEntry,
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

    const entities = this._entities(this.deviceId, this.entities);

    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .tabs=${configSections.integrations}
        .route=${this.route}
      >
        <paper-icon-button
          slot="toolbar-icon"
          icon="hass:settings"
          @click=${this._showSettings}
        ></paper-icon-button>

        <div class="container">
          <div class="left">
            <div class="device-info">
              <h1>${computeDeviceName(device, this.hass)}</h1>
              <ha-device-card
                .hass=${this.hass}
                .areas=${this.areas}
                .devices=${this.devices}
                .device=${device}
              ></ha-device-card>
            </div>

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
          <div class="right">
            <div class="column">
            ${
              isComponentLoaded(this.hass, "automation")
                ? html`
                    <ha-card
                      .header=${this.hass.localize(
                        "ui.panel.config.devices.automation.automations"
                      )}
                      >${this._related?.automation?.length
                        ? this._related.automation.map((automation) => {
                            const state = this.hass.states[automation];
                            return state
                              ? html`
                                  <div>
                                    <paper-item
                                      .automation=${state}
                                      @click=${this._openAutomation}
                                      .disabled=${!state.attributes.id}
                                    >
                                      <paper-item-body>
                                        ${state.attributes.friendly_name ||
                                          automation}
                                      </paper-item-body>
                                      <ha-icon-next></ha-icon-next>
                                    </paper-item>
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
                      <div class="card-actions">
                        <mwc-button @click=${this._showAutomationDialog}>
                          ${this.hass.localize(
                            "ui.panel.config.devices.automation.create"
                          )}
                        </mwc-button>
                      </div>
                    </ha-card>
                  `
                : ""
            }
            </div>
            <div class="column">
            ${
              isComponentLoaded(this.hass, "scene")
                ? html`
                    <ha-card
                      .header=${this.hass.localize(
                        "ui.panel.config.devices.scene.scenes"
                      )}
                      >${this._related?.scene?.length
                        ? this._related.scene.map((scene) => {
                            const state = this.hass.states[scene];
                            return state
                              ? html`
                                  <div>
                                    <paper-item
                                      .scene=${state}
                                      @click=${this._openScene}
                                      .disabled=${!state.attributes.id}
                                    >
                                      <paper-item-body>
                                        ${state.attributes.friendly_name ||
                                          scene}
                                      </paper-item-body>
                                      <ha-icon-next></ha-icon-next>
                                    </paper-item>
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
                          `}
                      ${entities.length
                        ? html`
                            <div class="card-actions">
                              <mwc-button @click=${this._createScene}>
                                ${this.hass.localize(
                                  "ui.panel.config.devices.scene.create"
                                )}
                              </mwc-button>
                            </div>
                          `
                        : ""}
                    </ha-card>
                  `
                : ""
            }
              ${
                isComponentLoaded(this.hass, "script")
                  ? html`
                      <ha-card
                        .header=${this.hass.localize(
                          "ui.panel.config.devices.script.scripts"
                        )}
                        >${this._related?.script?.length
                          ? this._related.script.map((script) => {
                              const state = this.hass.states[script];
                              return state
                                ? html`
                                    <paper-item
                                      .script=${script}
                                      @click=${this._openScript}
                                    >
                                      <paper-item-body>
                                        ${state.attributes.friendly_name ||
                                          script}
                                      </paper-item-body>
                                      <ha-icon-next></ha-icon-next>
                                    </paper-item>
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
                        <div class="card-actions">
                          <mwc-button @click=${this._showScriptDialog}>
                            ${this.hass.localize(
                              "ui.panel.config.devices.script.create"
                            )}
                          </mwc-button>
                        </div>
                      </ha-card>
                    `
                  : ""
              }
            </div>
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

  private _openScene(ev: Event) {
    const state = (ev.currentTarget as any).scene;
    if (state.attributes.id) {
      navigate(this, `/config/scene/edit/${state.attributes.id}`);
    }
  }

  private _openScript(ev: Event) {
    const script = (ev.currentTarget as any).script;
    navigate(this, `/config/script/edit/${script}`);
  }

  private _openAutomation(ev: Event) {
    const state = (ev.currentTarget as any).automation;
    if (state.attributes.id) {
      navigate(this, `/config/automation/edit/${state.attributes.id}`);
    }
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

      .device-info {
        padding: 16px;
      }

      .show-more {
      }

      h1 {
        margin-top: 0;
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

      .left,
      .column,
      .fullwidth {
        padding: 8px;
        box-sizing: border-box;
      }

      .left {
        width: 33.33%;
        padding-bottom: 0;
      }

      .right {
        width: 66.66%;
        display: flex;
        flex-wrap: wrap;
      }

      .fullwidth {
        width: 100%;
      }

      .column {
        width: 50%;
      }

      .column > *:not(:first-child) {
        margin-top: 16px;
      }

      :host([narrow]) .left,
      :host([narrow]) .right,
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
    `;
  }
}
