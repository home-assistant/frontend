import { ActionDetail } from "@material/mwc-list/mwc-list-foundation";
import "@material/mwc-list/mwc-list-item";
import {
  mdiContentDuplicate,
  mdiContentSave,
  mdiDelete,
  mdiDotsVertical,
} from "@mdi/js";
import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import { HassEvent } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { navigate } from "../../../common/navigate";
import { computeRTL } from "../../../common/util/compute_rtl";
import "../../../components/device/ha-device-picker";
import "../../../components/entity/ha-entities-picker";
import "../../../components/ha-card";
import "../../../components/ha-fab";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon-input";
import "../../../components/ha-svg-icon";
import {
  computeDeviceName,
  DeviceRegistryEntry,
  subscribeDeviceRegistry,
} from "../../../data/device_registry";
import {
  EntityRegistryEntry,
  subscribeEntityRegistry,
} from "../../../data/entity_registry";
import {
  activateScene,
  applyScene,
  deleteScene,
  getSceneConfig,
  getSceneEditorInitData,
  saveScene,
  SceneConfig,
  SceneEntities,
  SceneEntity,
  SCENE_IGNORED_DOMAINS,
  showSceneEditor,
} from "../../../data/scene";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import { KeyboardShortcutMixin } from "../../../mixins/keyboard-shortcut-mixin";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route } from "../../../types";
import { showToast } from "../../../util/toast";
import "../ha-config-section";
import { configSections } from "../ha-panel-config";

interface DeviceEntities {
  id: string;
  name: string;
  entities: string[];
}

interface DeviceEntitiesLookup {
  [deviceId: string]: string[];
}

@customElement("ha-scene-editor")
export class HaSceneEditor extends SubscribeMixin(
  KeyboardShortcutMixin(LitElement)
) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow!: boolean;

  @property() public isWide!: boolean;

  @property() public route!: Route;

  @property() public sceneId: string | null = null;

  @property() public scenes!: SceneEntity[];

  @property() public showAdvanced!: boolean;

  @state() private _dirty = false;

  @state() private _errors?: string;

  @state() private _config?: SceneConfig;

  @state() private _entities: string[] = [];

  @state() private _devices: string[] = [];

  @state()
  private _deviceRegistryEntries: DeviceRegistryEntry[] = [];

  @state()
  private _entityRegistryEntries: EntityRegistryEntry[] = [];

  @state() private _scene?: SceneEntity;

  private _storedStates: SceneEntities = {};

  private _unsubscribeEvents?: () => void;

  @state() private _deviceEntityLookup: DeviceEntitiesLookup = {};

  private _activateContextId?: string;

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
            name: computeDeviceName(
              device,
              this.hass,
              this._deviceEntityLookup[device.id]
            ),
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

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }
    const { devices, entities } = this._getEntitiesDevices(
      this._entities,
      this._devices,
      this._deviceEntityLookup,
      this._deviceRegistryEntries
    );
    const name = this._scene
      ? computeStateName(this._scene)
      : this.hass.localize("ui.panel.config.scene.editor.default_name");

    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .backCallback=${() => this._backTapped()}
        .tabs=${configSections.automation}
      >
        <ha-button-menu
          corner="BOTTOM_START"
          slot="toolbar-icon"
          @action=${this._handleMenuAction}
          activatable
        >
          <mwc-icon-button
            slot="trigger"
            .title=${this.hass.localize("ui.common.menu")}
            .label=${this.hass.localize("ui.common.overflow_menu")}
            ><ha-svg-icon path=${mdiDotsVertical}></ha-svg-icon>
          </mwc-icon-button>

          <mwc-list-item
            .disabled=${!this.sceneId}
            aria-label=${this.hass.localize(
              "ui.panel.config.scene.picker.duplicate_scene"
            )}
            graphic="icon"
          >
            ${this.hass.localize(
              "ui.panel.config.scene.picker.duplicate_scene"
            )}
            <ha-svg-icon
              slot="graphic"
              .path=${mdiContentDuplicate}
            ></ha-svg-icon>
          </mwc-list-item>

          <mwc-list-item
            .disabled=${!this.sceneId}
            aria-label=${this.hass.localize(
              "ui.panel.config.scene.picker.delete_scene"
            )}
            class=${classMap({ warning: Boolean(this.sceneId) })}
            graphic="icon"
          >
            ${this.hass.localize("ui.panel.config.scene.picker.delete_scene")}
            <ha-svg-icon
              class=${classMap({ warning: Boolean(this.sceneId) })}
              slot="graphic"
              .path=${mdiDelete}
            >
            </ha-svg-icon>
          </mwc-list-item>
        </ha-button-menu>
        ${this._errors ? html` <div class="errors">${this._errors}</div> ` : ""}
        ${this.narrow ? html` <span slot="header">${name}</span> ` : ""}
        <div
          id="root"
          class=${classMap({
            rtl: computeRTL(this.hass),
          })}
        >
          ${this._config
            ? html`
                <ha-config-section vertical .isWide=${this.isWide}>
                  ${!this.narrow
                    ? html` <span slot="header">${name}</span> `
                    : ""}
                  <div slot="introduction">
                    ${this.hass.localize(
                      "ui.panel.config.scene.editor.introduction"
                    )}
                  </div>
                  <ha-card>
                    <div class="card-content">
                      <paper-input
                        .value=${this._config.name}
                        .name=${"name"}
                        @value-changed=${this._valueChanged}
                        label=${this.hass.localize(
                          "ui.panel.config.scene.editor.name"
                        )}
                      ></paper-input>
                      <ha-icon-input
                        .label=${this.hass.localize(
                          "ui.panel.config.scene.editor.icon"
                        )}
                        .name=${"icon"}
                        .value=${this._config.icon}
                        @value-changed=${this._valueChanged}
                      >
                      </ha-icon-input>
                    </div>
                  </ha-card>
                </ha-config-section>

                <ha-config-section vertical .isWide=${this.isWide}>
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
                          <h1 class="card-header">
                            ${device.name}
                            <ha-icon-button
                              icon="hass:delete"
                              title=${this.hass.localize(
                                "ui.panel.config.scene.editor.devices.delete"
                              )}
                              .device=${device.id}
                              @click=${this._deleteDevice}
                            ></ha-icon-button>
                          </h1>
                          ${device.entities.map((entityId) => {
                            const entityStateObj = this.hass.states[entityId];
                            if (!entityStateObj) {
                              return html``;
                            }
                            return html`
                              <paper-icon-item
                                .entityId=${entityId}
                                @click=${this._showMoreInfo}
                                class="device-entity"
                              >
                                <state-badge
                                  .stateObj=${entityStateObj}
                                  slot="item-icon"
                                ></state-badge>
                                <paper-item-body>
                                  ${computeStateName(entityStateObj)}
                                </paper-item-body>
                              </paper-icon-item>
                            `;
                          })}
                        </ha-card>
                      `
                  )}

                  <ha-card
                    .header=${this.hass.localize(
                      "ui.panel.config.scene.editor.devices.add"
                    )}
                  >
                    <div class="card-content">
                      <ha-device-picker
                        @value-changed=${this._devicePicked}
                        .hass=${this.hass}
                        .label=${this.hass.localize(
                          "ui.panel.config.scene.editor.devices.add"
                        )}
                      ></ha-device-picker>
                    </div>
                  </ha-card>
                </ha-config-section>

                ${this.showAdvanced
                  ? html`
                      <ha-config-section vertical .isWide=${this.isWide}>
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
                                .header=${this.hass.localize(
                                  "ui.panel.config.scene.editor.entities.without_device"
                                )}
                              >
                                ${entities.map((entityId) => {
                                  const entityStateObj =
                                    this.hass.states[entityId];
                                  if (!entityStateObj) {
                                    return html``;
                                  }
                                  return html`
                                    <paper-icon-item
                                      .entityId=${entityId}
                                      @click=${this._showMoreInfo}
                                      class="device-entity"
                                    >
                                      <state-badge
                                        .stateObj=${entityStateObj}
                                        slot="item-icon"
                                      ></state-badge>
                                      <paper-item-body>
                                        ${computeStateName(entityStateObj)}
                                      </paper-item-body>
                                      <ha-icon-button
                                        icon="hass:delete"
                                        .entityId=${entityId}
                                        .title=${this.hass.localize(
                                          "ui.panel.config.scene.editor.entities.delete"
                                        )}
                                        @click=${this._deleteEntity}
                                      ></ha-icon-button>
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
                              .excludeDomains=${SCENE_IGNORED_DOMAINS}
                              .hass=${this.hass}
                              label=${this.hass.localize(
                                "ui.panel.config.scene.editor.entities.add"
                              )}
                            ></ha-entity-picker>
                          </div>
                        </ha-card>
                      </ha-config-section>
                    `
                  : ""}
              `
            : ""}
        </div>
        <ha-fab
          slot="fab"
          .label=${this.hass.localize("ui.panel.config.scene.editor.save")}
          extended
          @click=${this._saveScene}
          class=${classMap({ dirty: this._dirty })}
        >
          <ha-svg-icon slot="icon" .path=${mdiContentSave}></ha-svg-icon>
        </ha-fab>
      </hass-tabs-subpage>
    `;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    const oldscene = changedProps.get("sceneId");

    if (
      changedProps.has("sceneId") &&
      this.sceneId &&
      this.hass &&
      // Only refresh config if we picked a new scene. If same ID, don't fetch it.
      (!oldscene || oldscene !== this.sceneId)
    ) {
      this._loadConfig();
    }

    if (changedProps.has("sceneId") && !this.sceneId && this.hass) {
      this._dirty = false;
      const initData = getSceneEditorInitData();
      this._config = {
        name: this.hass.localize("ui.panel.config.scene.editor.default_name"),
        entities: {},
        ...initData,
      };
      this._initEntities(this._config);
      if (initData) {
        this._dirty = true;
      }
    }

    if (changedProps.has("_entityRegistryEntries")) {
      for (const entity of this._entityRegistryEntries) {
        if (
          !entity.device_id ||
          SCENE_IGNORED_DOMAINS.includes(computeDomain(entity.entity_id))
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
        if (
          this._entities.includes(entity.entity_id) &&
          !this._devices.includes(entity.device_id)
        ) {
          this._devices = [...this._devices, entity.device_id];
        }
      }
    }
    if (
      changedProps.has("scenes") &&
      this.sceneId &&
      this._config &&
      !this._scene
    ) {
      this._setScene();
    }
  }

  private async _handleMenuAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        this._duplicate();
        break;
      case 1:
        this._deleteTapped();
        break;
    }
  }

  private async _setScene() {
    const scene = this.scenes.find(
      (entity: SceneEntity) => entity.attributes.id === this.sceneId
    );
    if (!scene) {
      return;
    }
    this._scene = scene;
    const { context } = await activateScene(this.hass, this._scene.entity_id);
    this._activateContextId = context.id;
    this._unsubscribeEvents =
      await this.hass!.connection.subscribeEvents<HassEvent>(
        (event) => this._stateChanged(event),
        "state_changed"
      );
  }

  private _showMoreInfo(ev: Event) {
    const entityId = (ev.currentTarget as any).entityId;
    fireEvent(this, "hass-more-info", { entityId });
  }

  private async _loadConfig() {
    let config: SceneConfig;
    try {
      config = await getSceneConfig(this.hass, this.sceneId!);
    } catch (err: any) {
      showAlertDialog(this, {
        text:
          err.status_code === 404
            ? this.hass.localize(
                "ui.panel.config.scene.editor.load_error_not_editable"
              )
            : this.hass.localize(
                "ui.panel.config.scene.editor.load_error_unknown",
                "err_no",
                err.status_code
              ),
      }).then(() => history.back());
      return;
    }

    if (!config.entities) {
      config.entities = {};
    }

    this._initEntities(config);

    this._setScene();

    this._dirty = false;
    this._config = config;
  }

  private _initEntities(config: SceneConfig) {
    this._entities = Object.keys(config.entities);
    this._entities.forEach((entity) => this._storeState(entity));

    const filteredEntityReg = this._entityRegistryEntries.filter((entityReg) =>
      this._entities.includes(entityReg.entity_id)
    );
    this._devices = [];

    for (const entityReg of filteredEntityReg) {
      if (!entityReg.device_id) {
        continue;
      }
      if (!this._devices.includes(entityReg.device_id)) {
        this._devices = [...this._devices, entityReg.device_id];
      }
    }
  }

  private _entityPicked(ev: CustomEvent) {
    const entityId = ev.detail.value;
    (ev.target as any).value = "";
    if (this._entities.includes(entityId)) {
      return;
    }
    const entityRegistry = this._entityRegistryEntries.find(
      (entityReg) => entityReg.entity_id === entityId
    );
    if (
      entityRegistry?.device_id &&
      !this._devices.includes(entityRegistry.device_id)
    ) {
      this._pickDevice(entityRegistry.device_id);
    } else {
      this._entities = [...this._entities, entityId];
      this._storeState(entityId);
    }
    this._dirty = true;
  }

  private _deleteEntity(ev: Event) {
    ev.stopPropagation();
    const deleteEntityId = (ev.target as any).entityId;
    this._entities = this._entities.filter(
      (entityId) => entityId !== deleteEntityId
    );
    this._dirty = true;
  }

  private _pickDevice(device_id: string) {
    if (this._devices.includes(device_id)) {
      return;
    }
    this._devices = [...this._devices, device_id];
    const deviceEntities = this._deviceEntityLookup[device_id];
    if (!deviceEntities) {
      return;
    }
    this._entities = [...this._entities, ...deviceEntities];
    deviceEntities.forEach((entityId) => {
      this._storeState(entityId);
    });
    this._dirty = true;
  }

  private _devicePicked(ev: CustomEvent) {
    const device = ev.detail.value;
    (ev.target as any).value = "";
    this._pickDevice(device);
  }

  private _deleteDevice(ev: Event) {
    const deviceId = (ev.target as any).device;
    this._devices = this._devices.filter((device) => device !== deviceId);
    const deviceEntities = this._deviceEntityLookup[deviceId];
    if (!deviceEntities) {
      return;
    }
    this._entities = this._entities.filter(
      (entityId) => !deviceEntities.includes(entityId)
    );
    this._dirty = true;
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const target = ev.target as any;
    const name = target.name;
    if (!name) {
      return;
    }
    let newVal = ev.detail.value;
    if (target.type === "number") {
      newVal = Number(newVal);
    }
    if ((this._config![name] || "") === newVal) {
      return;
    }
    if (!newVal) {
      delete this._config![name];
      this._config = { ...this._config! };
    } else {
      this._config = { ...this._config!, [name]: newVal };
    }
    this._dirty = true;
  }

  private _stateChanged(event: HassEvent) {
    if (
      event.context.id !== this._activateContextId &&
      this._entities.includes(event.data.entity_id)
    ) {
      this._dirty = true;
    }
  }

  private _backTapped(): void {
    if (this._dirty) {
      showConfirmationDialog(this, {
        text: this.hass!.localize(
          "ui.panel.config.scene.editor.unsaved_confirm"
        ),
        confirmText: this.hass!.localize("ui.common.leave"),
        dismissText: this.hass!.localize("ui.common.stay"),
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
      confirmText: this.hass!.localize("ui.common.delete"),
      dismissText: this.hass!.localize("ui.common.cancel"),
      confirm: () => this._delete(),
    });
  }

  private async _delete(): Promise<void> {
    await deleteScene(this.hass, this.sceneId!);
    applyScene(this.hass, this._storedStates);
    history.back();
  }

  private async _duplicate() {
    if (this._dirty) {
      if (
        !(await showConfirmationDialog(this, {
          text: this.hass!.localize(
            "ui.panel.config.scene.editor.unsaved_confirm"
          ),
          confirmText: this.hass!.localize("ui.common.leave"),
          dismissText: this.hass!.localize("ui.common.stay"),
        }))
      ) {
        return;
      }
      // Wait for dialog to complete closing
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    showSceneEditor({
      ...this._config,
      id: undefined,
      name: `${this._config?.name} (${this.hass.localize(
        "ui.panel.config.scene.picker.duplicate"
      )})`,
    });
  }

  private _calculateStates(): SceneEntities {
    const output: SceneEntities = {};
    this._entities.forEach((entityId) => {
      const entityState = this._getCurrentState(entityId);
      if (entityState) {
        output[entityId] = entityState;
      }
    });
    return output;
  }

  private _storeState(entityId: string): void {
    if (entityId in this._storedStates) {
      return;
    }
    const entityState = this._getCurrentState(entityId);
    if (!entityState) {
      return;
    }
    this._storedStates[entityId] = entityState;
  }

  private _getCurrentState(entityId: string) {
    const stateObj = this.hass.states[entityId];
    if (!stateObj) {
      return undefined;
    }
    return { ...stateObj.attributes, state: stateObj.state };
  }

  private async _saveScene(): Promise<void> {
    const id = !this.sceneId ? "" + Date.now() : this.sceneId!;
    this._config = { ...this._config!, entities: this._calculateStates() };
    try {
      await saveScene(this.hass, id, this._config);
      this._dirty = false;

      if (!this.sceneId) {
        navigate(`/config/scene/edit/${id}`, { replace: true });
      }
    } catch (err: any) {
      this._errors = err.body.message || err.message;
      showToast(this, {
        message: err.body.message || err.message,
      });
      throw err;
    }
  }

  protected handleKeyboardSave() {
    this._saveScene();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-card {
          overflow: hidden;
        }
        .errors {
          padding: 20px;
          font-weight: bold;
          color: var(--error-color);
        }
        ha-config-section:last-child {
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
        ha-card ha-icon-button {
          color: var(--secondary-text-color);
        }
        .card-header > ha-icon-button {
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
          position: relative;
          bottom: calc(-80px - env(safe-area-inset-bottom));
          transition: bottom 0.3s;
        }
        ha-fab.dirty {
          bottom: 0;
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
