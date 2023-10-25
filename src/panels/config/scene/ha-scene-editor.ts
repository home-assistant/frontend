import { ActionDetail } from "@material/mwc-list/mwc-list-foundation";
import "@material/mwc-list/mwc-list";
import {
  mdiContentDuplicate,
  mdiContentSave,
  mdiDelete,
  mdiDotsVertical,
} from "@mdi/js";
import { HassEvent } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { navigate } from "../../../common/navigate";
import { computeRTL } from "../../../common/util/compute_rtl";
import { afterNextRender } from "../../../common/util/render-status";
import "../../../components/device/ha-device-picker";
import "../../../components/entity/ha-entities-picker";
import "../../../components/ha-area-picker";
import "../../../components/ha-button-menu";
import "../../../components/ha-card";
import "../../../components/ha-fab";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon-picker";
import "../../../components/ha-list-item";
import "../../../components/ha-svg-icon";
import "../../../components/ha-textfield";
import {
  computeDeviceName,
  DeviceRegistryEntry,
  subscribeDeviceRegistry,
} from "../../../data/device_registry";
import {
  EntityRegistryEntry,
  subscribeEntityRegistry,
  updateEntityRegistryEntry,
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
  SceneMetaData,
  SCENE_IGNORED_DOMAINS,
  showSceneEditor,
} from "../../../data/scene";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-subpage";
import { KeyboardShortcutMixin } from "../../../mixins/keyboard-shortcut-mixin";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route } from "../../../types";
import { showToast } from "../../../util/toast";
import "../ha-config-section";

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

  private _single_entities: string[] = [];

  @state() private _devices: string[] = [];

  @state()
  private _deviceRegistryEntries: DeviceRegistryEntry[] = [];

  @state()
  private _entityRegistryEntries: EntityRegistryEntry[] = [];

  @state() private _scene?: SceneEntity;

  private _storedStates: SceneEntities = {};

  private _unsubscribeEvents?: () => void;

  private _deviceEntityLookup: DeviceEntitiesLookup = {};

  private _activateContextId?: string;

  @state() private _saving = false;

  // undefined means not set in this session
  // null means picked nothing.
  @state() private _updatedAreaId?: string | null;

  // Callback to be called when scene is set.
  private _scenesSet?: () => void;

  private _getRegistryAreaId = memoizeOne(
    (entries: EntityRegistryEntry[], entity_id: string) => {
      const entry = entries.find((ent) => ent.entity_id === entity_id);
      return entry ? entry.area_id : null;
    }
  );

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

  protected render() {
    if (!this.hass) {
      return nothing;
    }
    const { devices, entities } = this._getEntitiesDevices(
      this._entities,
      this._devices,
      this._deviceEntityLookup,
      this._deviceRegistryEntries
    );

    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .backCallback=${this._backTapped}
        .header=${this._scene
          ? computeStateName(this._scene)
          : this.hass.localize("ui.panel.config.scene.editor.default_name")}
      >
        <ha-button-menu
          slot="toolbar-icon"
          @action=${this._handleMenuAction}
          activatable
        >
          <ha-icon-button
            slot="trigger"
            .label=${this.hass.localize("ui.common.menu")}
            .path=${mdiDotsVertical}
          ></ha-icon-button>

          <ha-list-item .disabled=${!this.sceneId} graphic="icon">
            ${this.hass.localize(
              "ui.panel.config.scene.picker.duplicate_scene"
            )}
            <ha-svg-icon
              slot="graphic"
              .path=${mdiContentDuplicate}
            ></ha-svg-icon>
          </ha-list-item>

          <ha-list-item
            .disabled=${!this.sceneId}
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
          </ha-list-item>
        </ha-button-menu>
        ${this._errors ? html` <div class="errors">${this._errors}</div> ` : ""}
        <div
          id="root"
          class=${classMap({
            rtl: computeRTL(this.hass),
          })}
        >
          ${this._config
            ? html`
                <div
                  class=${classMap({
                    container: true,
                    narrow: !this.isWide,
                  })}
                >
                  <ha-card outlined>
                    <div class="card-content">
                      <ha-textfield
                        .value=${this._config.name}
                        .name=${"name"}
                        @change=${this._valueChanged}
                        .label=${this.hass.localize(
                          "ui.panel.config.scene.editor.name"
                        )}
                      ></ha-textfield>
                      <ha-icon-picker
                        .hass=${this.hass}
                        .label=${this.hass.localize(
                          "ui.panel.config.scene.editor.icon"
                        )}
                        .name=${"icon"}
                        .value=${this._config.icon}
                        @value-changed=${this._valueChanged}
                      >
                      </ha-icon-picker>
                      <ha-area-picker
                        .hass=${this.hass}
                        .label=${this.hass.localize(
                          "ui.panel.config.scene.editor.area"
                        )}
                        .name=${"area"}
                        .value=${this._sceneAreaIdWithUpdates || ""}
                        @value-changed=${this._areaChanged}
                      >
                      </ha-area-picker>
                    </div>
                  </ha-card>
                </div>

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
                    (device) => html`
                      <ha-card outlined>
                        <h1 class="card-header">
                          ${device.name}
                          <ha-icon-button
                            .path=${mdiDelete}
                            .label=${this.hass.localize(
                              "ui.panel.config.scene.editor.devices.delete"
                            )}
                            .device=${device.id}
                            @click=${this._deleteDevice}
                          ></ha-icon-button>
                        </h1>
                        <mwc-list>
                          ${device.entities.map((entityId) => {
                            const entityStateObj = this.hass.states[entityId];
                            if (!entityStateObj) {
                              return nothing;
                            }
                            return html`
                              <ha-list-item
                                hasMeta
                                graphic="icon"
                                .entityId=${entityId}
                                @click=${this._showMoreInfo}
                              >
                                <state-badge
                                  .stateObj=${entityStateObj}
                                  slot="graphic"
                                ></state-badge>
                                ${computeStateName(entityStateObj)}
                              </ha-list-item>
                            `;
                          })}
                        </mwc-list>
                      </ha-card>
                    `
                  )}

                  <ha-card
                    outlined
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
                                outlined
                                class="entities"
                                .header=${this.hass.localize(
                                  "ui.panel.config.scene.editor.entities.without_device"
                                )}
                              >
                                <mwc-list>
                                  ${entities.map((entityId) => {
                                    const entityStateObj =
                                      this.hass.states[entityId];
                                    if (!entityStateObj) {
                                      return nothing;
                                    }
                                    return html`
                                      <ha-list-item
                                        hasMeta
                                        graphic="icon"
                                        .entityId=${entityId}
                                        @click=${this._showMoreInfo}
                                      >
                                        <state-badge
                                          .stateObj=${entityStateObj}
                                          slot="graphic"
                                        ></state-badge>
                                        ${computeStateName(entityStateObj)}
                                        <div slot="meta">
                                          <ha-icon-button
                                            .path=${mdiDelete}
                                            .entityId=${entityId}
                                            .label=${this.hass.localize(
                                              "ui.panel.config.scene.editor.entities.delete"
                                            )}
                                            @click=${this._deleteEntity}
                                          ></ha-icon-button>
                                        </div>
                                      </ha-list-item>
                                    `;
                                  })}
                                </mwc-list>
                              </ha-card>
                            `
                          : ""}

                        <ha-card
                          outlined
                          header=${this.hass.localize(
                            "ui.panel.config.scene.editor.entities.add"
                          )}
                        >
                          <div class="card-content">
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
          .disabled=${this._saving}
          @click=${this._saveScene}
          class=${classMap({ dirty: this._dirty, saving: this._saving })}
        >
          <ha-svg-icon slot="icon" .path=${mdiContentSave}></ha-svg-icon>
        </ha-fab>
      </hass-subpage>
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
        ...initData?.config,
      };
      this._initEntities(this._config);
      if (initData?.areaId) {
        this._updatedAreaId = initData.areaId;
      }
      this._dirty =
        initData !== undefined &&
        (initData.areaId !== undefined || initData.config !== undefined);
    }

    if (changedProps.has("_entityRegistryEntries")) {
      this._deviceEntityLookup = {};
      for (const entity of this._entityRegistryEntries) {
        if (
          !entity.device_id ||
          entity.entity_category ||
          SCENE_IGNORED_DOMAINS.includes(computeDomain(entity.entity_id))
        ) {
          continue;
        }
        if (!(entity.device_id in this._deviceEntityLookup)) {
          this._deviceEntityLookup[entity.device_id] = [];
        }
        this._deviceEntityLookup[entity.device_id].push(entity.entity_id);
        if (
          this._entities.includes(entity.entity_id) &&
          !this._single_entities.includes(entity.device_id) &&
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
    if (this._scenesSet && changedProps.has("scenes")) {
      this._scenesSet();
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
      await showAlertDialog(this, {
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
      });
      history.back();
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
    this._single_entities = [];

    const filteredEntityReg = this._entityRegistryEntries.filter((entityReg) =>
      this._entities.includes(entityReg.entity_id)
    );
    const newDevices: string[] = [];

    if (config.metadata) {
      Object.keys(config.entities).forEach((entity) => {
        if (
          !this._single_entities.includes(entity) &&
          config.metadata![entity]?.entity_only
        ) {
          this._single_entities.push(entity);
        }
      });
    }

    for (const entityReg of filteredEntityReg) {
      if (!entityReg.device_id) {
        continue;
      }
      const entityMetaData = config.metadata?.[entityReg.entity_id];
      if (
        !newDevices.includes(entityReg.device_id) &&
        !entityMetaData?.entity_only
      ) {
        newDevices.push(entityReg.device_id);
      }
    }

    this._devices = newDevices;
  }

  private _entityPicked(ev: CustomEvent) {
    const entityId = ev.detail.value;
    (ev.target as any).value = "";
    if (this._entities.includes(entityId)) {
      return;
    }
    this._entities = [...this._entities, entityId];
    this._single_entities.push(entityId);
    this._storeState(entityId);
    this._dirty = true;
  }

  private _deleteEntity(ev: Event) {
    ev.stopPropagation();
    const deleteEntityId = (ev.target as any).entityId;
    this._entities = this._entities.filter(
      (entityId) => entityId !== deleteEntityId
    );
    this._single_entities = this._single_entities.filter(
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

  private _valueChanged(ev: Event) {
    ev.stopPropagation();
    const target = ev.target as any;
    const name = target.name;
    if (!name) {
      return;
    }
    let newVal = (ev as CustomEvent).detail?.value ?? target.value;
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

  private _areaChanged(ev: CustomEvent) {
    const newValue = ev.detail.value === "" ? null : ev.detail.value;

    if (newValue === (this._sceneAreaIdWithUpdates || "")) {
      return;
    }

    if (newValue === this._sceneAreaIdCurrent) {
      this._updatedAreaId = undefined;
    } else {
      this._updatedAreaId = newValue;
      this._dirty = true;
    }
  }

  private _stateChanged(event: HassEvent) {
    if (
      event.context.id !== this._activateContextId &&
      this._entities.includes(event.data.entity_id)
    ) {
      this._dirty = true;
    }
  }

  private _backTapped = async (): Promise<void> => {
    const result = await this.confirmUnsavedChanged();
    if (result) {
      this._goBack();
    }
  };

  private _goBack(): void {
    applyScene(this.hass, this._storedStates);
    afterNextRender(() => history.back());
  }

  private _deleteTapped(): void {
    showConfirmationDialog(this, {
      title: this.hass!.localize(
        "ui.panel.config.scene.picker.delete_confirm_title"
      ),
      text: this.hass!.localize(
        "ui.panel.config.scene.picker.delete_confirm_text",
        { name: this._config?.name }
      ),
      confirmText: this.hass!.localize("ui.common.delete"),
      dismissText: this.hass!.localize("ui.common.cancel"),
      confirm: () => this._delete(),
      destructive: true,
    });
  }

  private async _delete(): Promise<void> {
    await deleteScene(this.hass, this.sceneId!);
    applyScene(this.hass, this._storedStates);
    history.back();
  }

  private async confirmUnsavedChanged(): Promise<boolean> {
    if (this._dirty) {
      return showConfirmationDialog(this, {
        title: this.hass!.localize(
          "ui.panel.config.scene.editor.unsaved_confirm_title"
        ),
        text: this.hass!.localize(
          "ui.panel.config.scene.editor.unsaved_confirm_text"
        ),
        confirmText: this.hass!.localize("ui.common.leave"),
        dismissText: this.hass!.localize("ui.common.stay"),
        destructive: true,
      });
    }
    return true;
  }

  private async _duplicate() {
    const result = await this.confirmUnsavedChanged();
    if (result) {
      showSceneEditor(
        {
          ...this._config,
          id: undefined,
          name: `${this._config?.name} (${this.hass.localize(
            "ui.panel.config.scene.picker.duplicate"
          )})`,
        },
        this._sceneAreaIdCurrent || undefined
      );
    }
  }

  private _calculateMetaData(): SceneMetaData {
    const output: SceneMetaData = {};

    for (const entityId of this._single_entities) {
      const entityState = this._getCurrentState(entityId);

      if (!entityState) {
        continue;
      }

      output[entityId] = {
        entity_only: true,
      };
    }

    return output;
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
    this._config = {
      ...this._config!,
      entities: this._calculateStates(),
      metadata: this._calculateMetaData(),
    };
    try {
      this._saving = true;
      await saveScene(this.hass, id, this._config);

      if (this._updatedAreaId !== undefined) {
        let scene =
          this._scene ||
          this.scenes.find(
            (entity: SceneEntity) => entity.attributes.id === id
          );

        if (!scene) {
          try {
            await new Promise<void>((resolve, reject) => {
              setTimeout(reject, 3000);
              this._scenesSet = resolve;
            });
            scene = this.scenes.find(
              (entity: SceneEntity) => entity.attributes.id === id
            );
          } catch (err) {
            // We do nothing.
          } finally {
            this._scenesSet = undefined;
          }
        }

        if (scene) {
          await updateEntityRegistryEntry(this.hass, scene.entity_id, {
            area_id: this._updatedAreaId,
          });
        }

        this._updatedAreaId = undefined;
      }

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
    } finally {
      this._saving = false;
    }
  }

  protected handleKeyboardSave() {
    this._saveScene();
  }

  private get _sceneAreaIdWithUpdates(): string | undefined | null {
    return this._updatedAreaId !== undefined
      ? this._updatedAreaId
      : this._sceneAreaIdCurrent;
  }

  private get _sceneAreaIdCurrent(): string | undefined | null {
    return this._scene
      ? this._getRegistryAreaId(
          this._entityRegistryEntries,
          this._scene.entity_id
        )
      : undefined;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-card {
          overflow: hidden;
        }
        .container {
          padding: 28px 20px 0;
          max-width: 1040px;
          margin: 0 auto;
        }
        .narrow.container {
          max-width: 640px;
        }
        .errors {
          padding: 20px;
          font-weight: bold;
          color: var(--error-color);
        }
        ha-config-section:last-child {
          padding-bottom: 20px;
        }
        ha-card ha-icon-button {
          color: var(--secondary-text-color);
        }
        .card-header > ha-icon-button {
          float: right;
          position: relative;
          top: -8px;
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
        ha-fab.saving {
          opacity: var(--light-disabled-opacity);
        }
        ha-icon-picker,
        ha-area-picker,
        ha-entity-picker {
          display: block;
          margin-top: 8px;
        }
        ha-textfield {
          display: block;
        }
        div[slot="meta"] {
          display: flex;
          justify-content: center;
          align-items: center;
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
