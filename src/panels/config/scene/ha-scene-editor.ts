import {
  LitElement,
  TemplateResult,
  html,
  CSSResult,
  css,
  PropertyValues,
  property,
  customElement,
} from "lit-element";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-item/paper-item-body";

import { classMap } from "lit-html/directives/class-map";

import "../../../components/ha-fab";
import "../../../components/device/ha-device-picker";
import "../../../components/entity/ha-entities-picker";
import "../../../components/ha-paper-icon-button-arrow-prev";
import "../../../layouts/ha-app-layout";

import { computeStateName } from "../../../common/entity/compute_state_name";

import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { navigate } from "../../../common/navigate";
import { computeRTL } from "../../../common/util/compute_rtl";
import {
  SceneEntity,
  SceneConfig,
  getSceneConfig,
  deleteScene,
  saveScene,
  IGNORED_DOMAINS,
  EntityStates,
  SAVED_ATTRIBUTES,
  applyScene,
  activateScene,
} from "../../../data/scene";
import { fireEvent } from "../../../common/dom/fire_event";
import {
  DeviceRegistryEntry,
  subscribeDeviceRegistry,
} from "../../../data/device_registry";
import {
  EntityRegistryEntry,
  subscribeEntityRegistry,
} from "../../../data/entity_registry";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import memoizeOne from "memoize-one";
import { computeDomain } from "../../../common/entity/compute_domain";
import { HassEvent } from "home-assistant-js-websocket";
import { showConfirmationDialog } from "../../../dialogs/confirmation/show-dialog-confirmation";

interface DeviceEntities {
  id: string;
  name: string;
  entities: string[];
}

interface DeviceEntitiesLookup {
  [deviceId: string]: string[];
}

@customElement("ha-scene-editor")
export class HaSceneEditor extends SubscribeMixin(LitElement) {
  @property() public hass!: HomeAssistant;
  @property() public narrow?: boolean;
  @property() public scene?: SceneEntity;
  @property() public creatingNew?: boolean;
  @property() public showAdvanced!: boolean;
  @property() private _dirty?: boolean;
  @property() private _errors?: string;
  @property() private _config!: SceneConfig;
  @property() private _entities: string[] = [];
  @property() private _devices: string[] = [];
  @property() private _deviceRegistryEntries: DeviceRegistryEntry[] = [];
  @property() private _entityRegistryEntries: EntityRegistryEntry[] = [];
  private _storedStates: EntityStates = {};
  private _unsubscribeEvents?: () => void;
  private _deviceEntityLookup: DeviceEntitiesLookup = {};

  private _getEntitiesDevices = memoizeOne(
    (
      entities: string[],
      devices: string[],
      deviceEntityLookup: DeviceEntitiesLookup,
      deviceRegs: DeviceRegistryEntry[]
    ) => {
      const outputDevices: DeviceEntities[] = [];

      if (devices.length) {
        const deviceLookup: { [deviceId: string]: DeviceRegistryEntry } = {};
        for (const device of deviceRegs) {
          deviceLookup[device.id] = device;
        }

        devices.forEach((deviceId) => {
          const device = deviceLookup[deviceId];
          const deviceEntities: string[] = deviceEntityLookup[deviceId] || [];
          outputDevices.push({
            name: device.name_by_user || device.name || "<No name>",
            id: device.id,
            entities: deviceEntities,
          });
        });
      }

      const outputEntities: string[] = [];

      entities.forEach((entity) => {
        if (!outputDevices.find((device) => device.entities.includes(entity))) {
          outputEntities.push(entity);
        }
      });

      return { devices: outputDevices, entities: outputEntities };
    }
  );

  public disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsubscribeEvents) {
      this._unsubscribeEvents();
      this._unsubscribeEvents = undefined;
    }
  }

  public hassSubscribe() {
    return [
      subscribeEntityRegistry(this.hass.connection, (entries) => {
        this._entityRegistryEntries = entries;
      }),
      subscribeDeviceRegistry(this.hass.connection, (entries) => {
        this._deviceRegistryEntries = entries;
      }),
    ];
  }

  protected render(): TemplateResult | void {
    if (!this.hass) {
      return;
    }
    const { devices, entities } = this._getEntitiesDevices(
      this._entities,
      this._devices,
      this._deviceEntityLookup,
      this._deviceRegistryEntries
    );
    return html`
      <ha-app-layout has-scrolling-region>
        <app-header slot="header" fixed>
          <app-toolbar>
            <ha-paper-icon-button-arrow-prev
              @click=${this._backTapped}
            ></ha-paper-icon-button-arrow-prev>
            <div main-title>
              ${this.scene
                ? computeStateName(this.scene)
                : this.hass.localize(
                    "ui.panel.config.scene.editor.default_name"
                  )}
            </div>
            ${this.creatingNew
              ? ""
              : html`
                  <paper-icon-button
                    title="${this.hass.localize(
                      "ui.panel.config.scene.picker.delete_scene"
                    )}"
                    icon="hass:delete"
                    @click=${this._deleteTapped}
                  ></paper-icon-button>
                `}
          </app-toolbar>
        </app-header>

        <div class="content">
          ${this._errors
            ? html`
                <div class="errors">${this._errors}</div>
              `
            : ""}
          <div
            id="root"
            class="${classMap({
              rtl: computeRTL(this.hass),
            })}"
          >
            <ha-config-section .isWide=${!this.narrow}>
              <div slot="header">
                ${this.scene
                  ? computeStateName(this.scene)
                  : this.hass.localize(
                      "ui.panel.config.scene.editor.default_name"
                    )}
              </div>
              <div slot="introduction">
                ${this.hass.localize(
                  "ui.panel.config.scene.editor.introduction"
                )}
              </div>
              <ha-card>
                <div class="card-content">
                  <paper-input
                    .value=${this.scene ? computeStateName(this.scene) : ""}
                    @value-changed=${this._nameChanged}
                    label=${this.hass.localize(
                      "ui.panel.config.scene.editor.name"
                    )}
                  ></paper-input>
                </div>
              </ha-card>
            </ha-config-section>

            <ha-config-section .isWide=${!this.narrow}>
              <div slot="header">
                ${this.hass.localize(
                  "ui.panel.config.scene.editor.devices.header"
                )}
              </div>
              <div slot="introduction">
                ${this.hass.localize(
                  "ui.panel.config.scene.editor.devices.introduction"
                )}
              </div>

              ${devices.map(
                (device) =>
                  html`
                    <ha-card>
                      <div class="card-header">
                        ${device.name}
                        <paper-icon-button
                          icon="hass:delete"
                          title="${this.hass.localize(
                            "ui.panel.config.scene.editor.devices.delete"
                          )}"
                          .device=${device.id}
                          @click=${this._deleteDevice}
                        ></paper-icon-button>
                      </div>
                      ${device.entities.map((entity) => {
                        const stateObj = this.hass.states[entity];
                        if (!stateObj) {
                          return html``;
                        }
                        return html`
                          <paper-icon-item
                            .entity=${stateObj.entity_id}
                            @click=${this._showMoreInfo}
                            class="device-entity"
                          >
                            <state-badge
                              .stateObj=${stateObj}
                              slot="item-icon"
                            ></state-badge>
                            <paper-item-body>
                              ${computeStateName(stateObj)}
                            </paper-item-body>
                          </paper-icon-item>
                        `;
                      })}
                    </ha-card>
                  `
              )}

              <ha-card
                header=${this.hass.localize(
                  "ui.panel.config.scene.editor.devices.add"
                )}
              >
                <div class="card-content">
                  <ha-device-picker
                    @value-changed=${this._devicePicked}
                    .hass=${this.hass}
                    label=${this.hass.localize(
                      "ui.panel.config.scene.editor.devices.add"
                    )}
                  />
                </div>
              </ha-card>
            </ha-config-section>

            ${this.showAdvanced
              ? html`
                  <ha-config-section .isWide=${!this.narrow}>
                    <div slot="header">
                      ${this.hass.localize(
                        "ui.panel.config.scene.editor.entities.header"
                      )}
                    </div>
                    <div slot="introduction">
                      ${this.hass.localize(
                        "ui.panel.config.scene.editor.entities.introduction"
                      )}
                    </div>
                    ${entities.length
                      ? html`
                          <ha-card
                            class="entities"
                            header=${this.hass.localize(
                              "ui.panel.config.scene.editor.entities.without_device"
                            )}
                          >
                            ${entities.map((entity) => {
                              const stateObj = this.hass.states[entity];
                              if (!stateObj) {
                                return html``;
                              }
                              return html`
                                <paper-icon-item
                                  .entity=${stateObj.entity_id}
                                  @click=${this._showMoreInfo}
                                  class="device-entity"
                                >
                                  <state-badge
                                    .stateObj=${stateObj}
                                    slot="item-icon"
                                  ></state-badge>
                                  <paper-item-body>
                                    ${computeStateName(stateObj)}
                                  </paper-item-body>
                                  <paper-icon-button
                                    icon="hass:delete"
                                    .entity=${entity}
                                    title="${this.hass.localize(
                                      "ui.panel.config.scene.editor.entities.delete"
                                    )}"
                                    @click=${this._deleteEntity}
                                  ></paper-icon-button>
                                </paper-icon-item>
                              `;
                            })}
                          </ha-card>
                        `
                      : ""}

                    <ha-card
                      header=${this.hass.localize(
                        "ui.panel.config.scene.editor.entities.add"
                      )}
                    >
                      <div class="card-content">
                        ${this.hass.localize(
                          "ui.panel.config.scene.editor.entities.device_entities"
                        )}
                        <ha-entity-picker
                          @value-changed=${this._entityPicked}
                          .excludeDomains=${IGNORED_DOMAINS}
                          .hass=${this.hass}
                          label=${this.hass.localize(
                            "ui.panel.config.scene.editor.entities.add"
                          )}
                        />
                      </div>
                    </ha-card>
                  </ha-config-section>
                `
              : ""}
          </div>
        </div>
        <ha-fab
          slot="fab"
          ?is-wide="${!this.narrow}"
          ?dirty="${this._dirty}"
          icon="hass:content-save"
          .title="${this.hass.localize("ui.panel.config.scene.editor.save")}"
          @click=${this._saveScene}
          class="${classMap({
            rtl: computeRTL(this.hass),
          })}"
        ></ha-fab>
      </ha-app-layout>
    `;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    const oldscene = changedProps.get("scene") as SceneEntity;
    if (
      changedProps.has("scene") &&
      this.scene &&
      this.hass &&
      // Only refresh config if we picked a new scene. If same ID, don't fetch it.
      (!oldscene || oldscene.attributes.id !== this.scene.attributes.id)
    ) {
      this._loadConfig();
    }

    if (changedProps.has("creatingNew") && this.creatingNew && this.hass) {
      this._dirty = false;
      this._config = {
        name: this.hass.localize("ui.panel.config.scene.editor.default_name"),
        entities: [],
      };
    }

    if (changedProps.has("_entityRegistryEntries")) {
      for (const entity of this._entityRegistryEntries) {
        if (
          !entity.device_id ||
          IGNORED_DOMAINS.includes(computeDomain(entity.entity_id))
        ) {
          continue;
        }
        if (!(entity.device_id in this._deviceEntityLookup)) {
          this._deviceEntityLookup[entity.device_id] = [];
        }
        if (
          !this._deviceEntityLookup[entity.device_id].includes(entity.entity_id)
        ) {
          this._deviceEntityLookup[entity.device_id].push(entity.entity_id);
        }
      }
    }
  }

  private _showMoreInfo(ev: Event) {
    const entityId = (ev.currentTarget as any).entity;
    fireEvent(this, "hass-more-info", { entityId });
  }

  private async _loadConfig() {
    try {
      const config = await getSceneConfig(
        this.hass,
        this.scene!.attributes.id!
      );

      if (!config.entities) {
        config.entities = {};
      }

      this._entities = Object.keys(config.entities);

      this._entities.forEach((entity) => {
        this._storeState(entity);
      });

      const filteredEntityReg = this._entityRegistryEntries.filter(
        (entityReg) => this._entities.includes(entityReg.entity_id)
      );

      for (const entityReg of filteredEntityReg) {
        if (!entityReg.device_id) {
          continue;
        }
        if (!this._devices.includes(entityReg.device_id)) {
          this._devices = [...this._devices, entityReg.device_id];
        }
      }

      activateScene(this.hass, this.scene!.entity_id);

      // we want to check if states changed after the initial scene was activated, when is that done?
      setTimeout(async () => {
        this._unsubscribeEvents = await this.hass!.connection.subscribeEvents<
          HassEvent
        >((event) => this._stateChanged(event), "state_changed");
      }, 500);

      this._dirty = false;
      this._config = config;
    } catch (err) {
      alert(
        err.status_code === 404
          ? this.hass.localize(
              "ui.panel.config.scene.editor.load_error_not_editable"
            )
          : this.hass.localize(
              "ui.panel.config.scene.editor.load_error_unknown",
              "err_no",
              err.status_code
            )
      );
      history.back();
    }
  }

  private _entityPicked(ev: CustomEvent) {
    const entity = ev.detail.value;
    (ev.target as any).value = "";
    if (this._entities.includes(entity)) {
      return;
    }
    this._entities = [...this._entities, entity];
    this._storeState(entity);
    this._dirty = true;
  }

  private _deleteEntity(ev: Event) {
    ev.stopPropagation();
    const entityId = (ev.target as any).entity;
    this._entities = this._entities.filter((entity) => entity !== entityId);
  }

  private _devicePicked(ev: CustomEvent) {
    const device = ev.detail.value;
    (ev.target as any).value = "";
    if (this._devices.includes(device)) {
      return;
    }
    this._devices = [...this._devices, device];
    this._deviceEntityLookup[device].forEach((entity) => {
      this._storeState(entity);
    });
    this._dirty = true;
  }

  private _deleteDevice(ev: Event) {
    const deviceId = (ev.target as any).device;
    this._devices = this._devices.filter((device) => device !== deviceId);
    const deviceEntities = this._deviceEntityLookup[deviceId];
    this._entities = this._entities.filter(
      (entity) => !deviceEntities.includes(entity)
    );
  }

  private _nameChanged(ev: CustomEvent) {
    if (!this._config || this._config.name === ev.detail.value) {
      return;
    }
    this._config.name = ev.detail.value;
    this._dirty = true;
  }

  private _stateChanged(event: HassEvent) {
    if (this._entities.includes(event.data.entity_id)) {
      this._dirty = true;
    }
  }

  private _backTapped(): void {
    if (this._dirty) {
      showConfirmationDialog(this, {
        text: this.hass!.localize(
          "ui.panel.config.scene.editor.unsaved_confirm"
        ),
        confirmBtnText: this.hass!.localize("ui.common.yes"),
        cancelBtnText: this.hass!.localize("ui.common.no"),
        confirm: () => this._goBack(),
      });
    } else {
      this._goBack();
    }
  }

  private _goBack(): void {
    applyScene(this.hass, this._storedStates);
    history.back();
  }

  private _deleteTapped(): void {
    showConfirmationDialog(this, {
      text: this.hass!.localize("ui.panel.config.scene.picker.delete_confirm"),
      confirmBtnText: this.hass!.localize("ui.common.yes"),
      cancelBtnText: this.hass!.localize("ui.common.no"),
      confirm: () => this._delete(),
    });
  }

  private async _delete(): Promise<void> {
    await deleteScene(this.hass, this.scene!.attributes.id!);
    applyScene(this.hass, this._storedStates);
    history.back();
  }

  private _calculateStates(): EntityStates {
    const { devices, entities } = this._getEntitiesDevices(
      this._entities,
      this._devices,
      this._deviceEntityLookup,
      this._deviceRegistryEntries
    );
    const output: EntityStates = {};
    let allEntites = entities;
    devices.forEach(
      (device) => (allEntites = allEntites.concat(device.entities))
    );
    allEntites.forEach((entity) => {
      const state = this._getCurrentState(entity);
      if (state) {
        output[entity] = state;
      }
    });
    return output;
  }

  private _storeState(entity: string): void {
    if (entity in this._storedStates) {
      return;
    }
    const state = this._getCurrentState(entity);
    if (!state) {
      return;
    }
    this._storedStates[entity] = state;
  }

  private _getCurrentState(entity: string) {
    const stateObj = this.hass.states[entity];
    if (!stateObj) {
      return;
    }
    const domain = computeDomain(entity);
    const attributes = {};
    for (const attribute in stateObj.attributes) {
      if (
        SAVED_ATTRIBUTES[domain] &&
        SAVED_ATTRIBUTES[domain].includes(attribute)
      ) {
        attributes[attribute] = stateObj.attributes[attribute];
      }
    }
    return { state: stateObj.state, ...attributes };
  }

  private async _saveScene(): Promise<void> {
    const id = this.creatingNew ? "" + Date.now() : this.scene!.attributes.id!;
    this._config = { ...this._config, entities: this._calculateStates() };
    try {
      await saveScene(this.hass, id, this._config);
      this._dirty = false;

      if (this.creatingNew) {
        navigate(this, `/config/scene/edit/${id}`, true);
      }
    } catch (err) {
      this._errors = err.body.message || err.message;
      throw err;
    }
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        ha-card {
          overflow: hidden;
        }
        .errors {
          padding: 20px;
          font-weight: bold;
          color: var(--google-red-500);
        }
        .content {
          padding-bottom: 20px;
        }
        .triggers,
        .script {
          margin-top: -16px;
        }
        .triggers ha-card,
        .script ha-card {
          margin-top: 16px;
        }
        .add-card mwc-button {
          display: block;
          text-align: center;
        }
        .card-menu {
          position: absolute;
          top: 0;
          right: 0;
          z-index: 1;
          color: var(--primary-text-color);
        }
        .rtl .card-menu {
          right: auto;
          left: 0;
        }
        .card-menu paper-item {
          cursor: pointer;
        }
        paper-icon-item {
          padding: 8px 16px;
        }
        ha-card paper-icon-button {
          color: var(--secondary-text-color);
        }
        .card-header > paper-icon-button {
          float: right;
          position: relative;
          top: -8px;
        }
        .device-entity {
          cursor: pointer;
        }
        span[slot="introduction"] a {
          color: var(--primary-color);
        }
        ha-fab {
          position: fixed;
          bottom: 16px;
          right: 16px;
          z-index: 1;
          margin-bottom: -80px;
          transition: margin-bottom 0.3s;
        }

        ha-fab[is-wide] {
          bottom: 24px;
          right: 24px;
        }

        ha-fab[dirty] {
          margin-bottom: 0;
        }

        ha-fab.rtl {
          right: auto;
          left: 16px;
        }

        ha-fab[is-wide].rtl {
          bottom: 24px;
          right: auto;
          left: 24px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-scene-editor": HaSceneEditor;
  }
}
