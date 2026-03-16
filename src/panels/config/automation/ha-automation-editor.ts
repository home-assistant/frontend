import "@home-assistant/webawesome/dist/components/divider/divider";
import { consume } from "@lit/context";
import {
  mdiAppleKeyboardCommand,
  mdiCog,
  mdiContentSave,
  mdiDebugStepOver,
  mdiDelete,
  mdiDotsVertical,
  mdiFileEdit,
  mdiInformationOutline,
  mdiPlay,
  mdiPlayCircleOutline,
  mdiPlaylistEdit,
  mdiPlusCircleMultipleOutline,
  mdiRedo,
  mdiRenameBox,
  mdiRobotConfused,
  mdiStopCircleOutline,
  mdiTag,
  mdiTransitConnection,
  mdiUndo,
} from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { UndoRedoController } from "../../../common/controllers/undo-redo-controller";
import { fireEvent } from "../../../common/dom/fire_event";
import { goBack, navigate } from "../../../common/navigate";
import { promiseTimeout } from "../../../common/util/promise-timeout";
import "../../../components/ha-button";
import "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import "../../../components/ha-fab";
import "../../../components/ha-icon";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import "../../../components/ha-yaml-editor";
import type {
  AutomationConfig,
  AutomationEntity,
  BlueprintAutomationConfig,
  Condition,
  Trigger,
} from "../../../data/automation";
import {
  deleteAutomation,
  fetchAutomationFileConfig,
  getAutomationEditorInitData,
  getAutomationStateConfig,
  normalizeAutomationConfig,
  saveAutomationConfig,
  showAutomationEditor,
  triggerAutomationActions,
} from "../../../data/automation";
import { substituteBlueprint } from "../../../data/blueprint";
import { validateConfig } from "../../../data/config";
import { fullEntitiesContext } from "../../../data/context";
import { UNAVAILABLE } from "../../../data/entity/entity";
import {
  type EntityRegistryEntry,
  updateEntityRegistryEntry,
} from "../../../data/entity/entity_registry";
import type { Action } from "../../../data/script";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-subpage";
import { KeyboardShortcutMixin } from "../../../mixins/keyboard-shortcut-mixin";
import { PreventUnsavedMixin } from "../../../mixins/prevent-unsaved-mixin";
import { haStyle } from "../../../resources/styles";
import type { Entries, ValueChangedEvent } from "../../../types";
import { isMac } from "../../../util/is_mac";
import { showToast } from "../../../util/toast";
import { showAssignCategoryDialog } from "../category/show-dialog-assign-category";
import { showAutomationModeDialog } from "./automation-mode-dialog/show-dialog-automation-mode";
import { showAutomationSaveDialog } from "./automation-save-dialog/show-dialog-automation-save";
import { showAutomationSaveTimeoutDialog } from "./automation-save-timeout-dialog/show-dialog-automation-save-timeout";
import "./blueprint-automation-editor";
import {
  AutomationScriptEditorMixin,
  automationScriptEditorStyles,
} from "./ha-automation-script-editor-mixin";
import "./manual-automation-editor";
import type { HaManualAutomationEditor } from "./manual-automation-editor";
import type { HaDropdownSelectEvent } from "../../../components/ha-dropdown";

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-editor": HaAutomationEditor;
  }
  // for fire event
  interface HASSDomEvents {
    "subscribe-automation-config": {
      callback: (config: AutomationConfig) => void;
      unsub?: UnsubscribeFunc;
    };
    "ui-mode-not-available": Error;
    "move-down": undefined;
    "move-up": undefined;
    duplicate: undefined;
    "insert-after": {
      value: Trigger | Condition | Action | Trigger[] | Condition[] | Action[];
    };
    "save-automation": undefined;
  }
}

@customElement("ha-automation-editor")
export class HaAutomationEditor extends AutomationScriptEditorMixin<AutomationConfig>(
  PreventUnsavedMixin(KeyboardShortcutMixin(LitElement))
) {
  @property({ attribute: false }) public automationId: string | null = null;

  @property({ attribute: false }) public automations!: AutomationEntity[];

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  _entityRegistry!: EntityRegistryEntry[];

  @query("manual-automation-editor")
  private _manualEditor?: HaManualAutomationEditor;

  private _configSubscriptions: Record<
    string,
    (config?: AutomationConfig) => void
  > = {};

  private _configSubscriptionsId = 1;

  private _newAutomationId?: string;

  private _undoRedoController = new UndoRedoController<AutomationConfig>(this, {
    apply: (config) => this._applyUndoRedo(config),
    currentConfig: () => this.config!,
  });

  protected willUpdate(changedProps) {
    super.willUpdate(changedProps);

    if (
      this.entityRegCreated &&
      this._newAutomationId &&
      changedProps.has("_entityRegistry")
    ) {
      const automation = this._entityRegistry.find(
        (entity: EntityRegistryEntry) =>
          entity.platform === "automation" &&
          entity.unique_id === this._newAutomationId
      );
      if (automation) {
        this.entityRegCreated(automation);
        this.entityRegCreated = undefined;
      }
    }
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this.config) {
      return this.renderLoading();
    }

    const stateObj = this.currentEntityId
      ? this.hass.states[this.currentEntityId]
      : undefined;

    const useBlueprint = "use_blueprint" in this.config;
    const shortcutIcon = isMac
      ? html`<ha-svg-icon .path=${mdiAppleKeyboardCommand}></ha-svg-icon>`
      : this.hass.localize("ui.panel.config.automation.editor.ctrl");

    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .backCallback=${this.backTapped}
        .header=${this.config.alias ||
        this.hass.localize("ui.panel.config.automation.editor.default_name")}
      >
        ${this.mode === "gui" && !this.narrow
          ? html`<ha-icon-button
                slot="toolbar-icon"
                .label=${this.hass.localize("ui.common.undo")}
                .path=${mdiUndo}
                @click=${this._undo}
                .disabled=${!this._undoRedoController.canUndo}
                id="button-undo"
              >
              </ha-icon-button>
              <ha-tooltip placement="bottom" for="button-undo">
                ${this.hass.localize("ui.common.undo")}
                <span class="shortcut"
                  >(
                  <span>${shortcutIcon}</span>
                  <span>+</span>
                  <span>Z</span>)
                </span>
              </ha-tooltip>
              <ha-icon-button
                slot="toolbar-icon"
                .label=${this.hass.localize("ui.common.redo")}
                .path=${mdiRedo}
                @click=${this._redo}
                .disabled=${!this._undoRedoController.canRedo}
                id="button-redo"
              >
              </ha-icon-button>
              <ha-tooltip placement="bottom" for="button-redo">
                ${this.hass.localize("ui.common.redo")}
                <span class="shortcut">
                  (
                  ${isMac
                    ? html`<span>${shortcutIcon}</span>
                        <span>+</span>
                        <span>Shift</span>
                        <span>+</span>
                        <span>Z</span>`
                    : html`<span>${shortcutIcon}</span>
                        <span>+</span>
                        <span>Y</span>`})
                </span>
              </ha-tooltip>`
          : nothing}
        ${this.config?.id && !this.narrow
          ? html`
              <ha-button
                appearance="plain"
                size="small"
                @click=${this._showTrace}
                slot="toolbar-icon"
              >
                ${this.hass.localize(
                  "ui.panel.config.automation.editor.show_trace"
                )}
              </ha-button>
            `
          : ""}
        <ha-dropdown
          slot="toolbar-icon"
          @wa-select=${this._handleDropdownSelect}
        >
          <ha-icon-button
            slot="trigger"
            .label=${this.hass.localize("ui.common.menu")}
            .path=${mdiDotsVertical}
          ></ha-icon-button>

          ${this.mode === "gui" && this.narrow
            ? html`<ha-dropdown-item
                  value="undo"
                  .disabled=${!this._undoRedoController.canUndo}
                >
                  ${this.hass.localize("ui.common.undo")}
                  <ha-svg-icon slot="icon" .path=${mdiUndo}></ha-svg-icon>
                </ha-dropdown-item>
                <ha-dropdown-item
                  value="redo"
                  .disabled=${!this._undoRedoController.canRedo}
                >
                  ${this.hass.localize("ui.common.redo")}
                  <ha-svg-icon slot="icon" .path=${mdiRedo}></ha-svg-icon>
                </ha-dropdown-item>`
            : nothing}

          <ha-dropdown-item .disabled=${!stateObj} value="info">
            ${this.hass.localize("ui.panel.config.automation.editor.show_info")}
            <ha-svg-icon
              slot="icon"
              .path=${mdiInformationOutline}
            ></ha-svg-icon>
          </ha-dropdown-item>

          <ha-dropdown-item .disabled=${!stateObj} value="settings">
            ${this.hass.localize(
              "ui.panel.config.automation.picker.show_settings"
            )}
            <ha-svg-icon slot="icon" .path=${mdiCog}></ha-svg-icon>
          </ha-dropdown-item>

          <ha-dropdown-item .disabled=${!stateObj} value="category">
            ${this.hass.localize(
              `ui.panel.config.scene.picker.${this.registryEntry?.categories?.automation ? "edit_category" : "assign_category"}`
            )}
            <ha-svg-icon slot="icon" .path=${mdiTag}></ha-svg-icon>
          </ha-dropdown-item>

          <ha-dropdown-item .disabled=${!stateObj} value="run">
            ${this.hass.localize("ui.panel.config.automation.editor.run")}
            <ha-svg-icon slot="icon" .path=${mdiPlay}></ha-svg-icon>
          </ha-dropdown-item>

          ${stateObj && this.narrow
            ? html`<ha-dropdown-item value="trace">
                ${this.hass.localize(
                  "ui.panel.config.automation.editor.show_trace"
                )}
                <ha-svg-icon
                  slot="icon"
                  .path=${mdiTransitConnection}
                ></ha-svg-icon>
              </ha-dropdown-item>`
            : nothing}

          <ha-dropdown-item
            value="rename"
            .disabled=${this.readOnly ||
            !this.automationId ||
            this.mode === "yaml"}
          >
            ${this.hass.localize("ui.panel.config.automation.editor.rename")}
            <ha-svg-icon slot="icon" .path=${mdiRenameBox}></ha-svg-icon>
          </ha-dropdown-item>
          ${!useBlueprint
            ? html`
                <ha-dropdown-item
                  @click=${this._promptAutomationMode}
                  .disabled=${this.readOnly || this.mode === "yaml"}
                >
                  ${this.hass.localize(
                    "ui.panel.config.automation.editor.change_mode"
                  )}
                  <ha-svg-icon
                    slot="icon"
                    .path=${mdiDebugStepOver}
                  ></ha-svg-icon>
                </ha-dropdown-item>
              `
            : nothing}

          <ha-dropdown-item
            .disabled=${!!this.blueprintConfig ||
            (!this.readOnly && !this.automationId)}
            value="duplicate"
          >
            ${this.hass.localize(
              this.readOnly
                ? "ui.panel.config.automation.editor.migrate"
                : "ui.panel.config.automation.editor.duplicate"
            )}
            <ha-svg-icon
              slot="icon"
              .path=${mdiPlusCircleMultipleOutline}
            ></ha-svg-icon>
          </ha-dropdown-item>

          ${useBlueprint
            ? html`
                <ha-dropdown-item
                  value="take_control"
                  .disabled=${this.readOnly}
                >
                  ${this.hass.localize(
                    "ui.panel.config.automation.editor.take_control"
                  )}
                  <ha-svg-icon slot="icon" .path=${mdiFileEdit}></ha-svg-icon>
                </ha-dropdown-item>
              `
            : nothing}

          <ha-dropdown-item value="toggle_yaml_mode">
            ${this.hass.localize(
              `ui.panel.config.automation.editor.edit_${this.mode === "gui" ? "yaml" : "ui"}`
            )}
            <ha-svg-icon slot="icon" .path=${mdiPlaylistEdit}></ha-svg-icon>
          </ha-dropdown-item>

          <wa-divider></wa-divider>

          <ha-dropdown-item .disabled=${!stateObj} value="disable">
            ${stateObj?.state === "off"
              ? this.hass.localize("ui.panel.config.automation.editor.enable")
              : this.hass.localize("ui.panel.config.automation.editor.disable")}
            <ha-svg-icon
              slot="icon"
              .path=${stateObj?.state === "off"
                ? mdiPlayCircleOutline
                : mdiStopCircleOutline}
            ></ha-svg-icon>
          </ha-dropdown-item>

          <ha-dropdown-item
            .disabled=${!this.automationId}
            .variant=${this.automationId ? "danger" : "default"}
            value="delete"
          >
            ${this.hass.localize("ui.panel.config.automation.picker.delete")}
            <ha-svg-icon
              class=${classMap({ warning: Boolean(this.automationId) })}
              slot="icon"
              .path=${mdiDelete}
            >
            </ha-svg-icon>
          </ha-dropdown-item>
        </ha-dropdown>
        <div
          class=${this.mode === "yaml" ? "yaml-mode" : ""}
          @subscribe-automation-config=${this._subscribeAutomationConfig}
        >
          ${this.mode === "gui"
            ? html`
                <div>
                  ${useBlueprint
                    ? html`
                        <blueprint-automation-editor
                          .hass=${this.hass}
                          .narrow=${this.narrow}
                          .isWide=${this.isWide}
                          .stateObj=${stateObj}
                          .config=${this.config}
                          .disabled=${this.readOnly}
                          .saving=${this.saving}
                          .dirty=${this.dirty}
                          @value-changed=${this._valueChanged}
                          @save-automation=${this._handleSaveAutomation}
                        ></blueprint-automation-editor>
                      `
                    : html`
                        <manual-automation-editor
                          .hass=${this.hass}
                          .narrow=${this.narrow}
                          .isWide=${this.isWide}
                          .stateObj=${stateObj}
                          .config=${this.config}
                          .disabled=${this.readOnly}
                          .dirty=${this.dirty}
                          .saving=${this.saving}
                          @value-changed=${this._valueChanged}
                          @save-automation=${this._handleSaveAutomation}
                          @editor-save=${this._handleSaveAutomation}
                        >
                          <div class="alert-wrapper" slot="alerts">
                            ${this.errors || stateObj?.state === UNAVAILABLE
                              ? html`<ha-alert
                                  alert-type="error"
                                  .title=${stateObj?.state === UNAVAILABLE
                                    ? this.hass.localize(
                                        "ui.panel.config.automation.editor.unavailable"
                                      )
                                    : undefined}
                                >
                                  ${this.errors || this.validationErrors}
                                  ${stateObj?.state === UNAVAILABLE
                                    ? html`<ha-svg-icon
                                        slot="icon"
                                        .path=${mdiRobotConfused}
                                      ></ha-svg-icon>`
                                    : nothing}
                                </ha-alert>`
                              : nothing}
                            ${this.blueprintConfig
                              ? html`<ha-alert alert-type="info">
                                  ${this.hass.localize(
                                    "ui.panel.config.automation.editor.confirm_take_control"
                                  )}
                                  <div slot="action" style="display: flex;">
                                    <ha-button
                                      appearance="plain"
                                      @click=${this.takeControlSave}
                                      >${this.hass.localize(
                                        "ui.common.yes"
                                      )}</ha-button
                                    >
                                    <ha-button
                                      appearance="plain"
                                      @click=${this.revertBlueprint}
                                      >${this.hass.localize(
                                        "ui.common.no"
                                      )}</ha-button
                                    >
                                  </div>
                                </ha-alert>`
                              : this.readOnly
                                ? html`<ha-alert
                                    alert-type="warning"
                                    dismissable
                                    >${this.hass.localize(
                                      "ui.panel.config.automation.editor.read_only"
                                    )}
                                    <ha-button
                                      appearance="filled"
                                      size="small"
                                      variant="warning"
                                      slot="action"
                                      @click=${this._duplicate}
                                    >
                                      ${this.hass.localize(
                                        "ui.panel.config.automation.editor.migrate"
                                      )}
                                    </ha-button>
                                  </ha-alert>`
                                : nothing}
                            ${stateObj?.state === "off"
                              ? html`
                                  <ha-alert alert-type="info">
                                    ${this.hass.localize(
                                      "ui.panel.config.automation.editor.disabled"
                                    )}
                                    <ha-button
                                      size="small"
                                      slot="action"
                                      @click=${this._toggle}
                                    >
                                      ${this.hass.localize(
                                        "ui.panel.config.automation.editor.enable"
                                      )}
                                    </ha-button>
                                  </ha-alert>
                                `
                              : nothing}
                          </div>
                        </manual-automation-editor>
                      `}
                </div>
              `
            : this.mode === "yaml"
              ? html`${stateObj?.state === "off"
                    ? html`
                        <ha-alert alert-type="info">
                          ${this.hass.localize(
                            "ui.panel.config.automation.editor.disabled"
                          )}
                          <ha-button
                            appearance="filled"
                            size="small"
                            slot="action"
                            @click=${this._toggle}
                          >
                            ${this.hass.localize(
                              "ui.panel.config.automation.editor.enable"
                            )}
                          </ha-button>
                        </ha-alert>
                      `
                    : nothing}
                  <ha-yaml-editor
                    .hass=${this.hass}
                    .defaultValue=${this._preprocessYaml()}
                    .readOnly=${this.readOnly}
                    @value-changed=${this._yamlChanged}
                    @editor-save=${this._handleSaveAutomation}
                    .showErrors=${false}
                    disable-fullscreen
                  ></ha-yaml-editor>
                  <ha-fab
                    slot="fab"
                    class=${this.dirty ? "dirty" : ""}
                    .label=${this.hass.localize("ui.common.save")}
                    .disabled=${this.saving}
                    extended
                    @click=${this._handleSaveAutomation}
                  >
                    <ha-svg-icon
                      slot="icon"
                      .path=${mdiContentSave}
                    ></ha-svg-icon>
                  </ha-fab>`
              : nothing}
        </div>
      </hass-subpage>
    `;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    const oldAutomationId = changedProps.get("automationId");
    if (
      changedProps.has("automationId") &&
      this.automationId &&
      this.hass &&
      // Only refresh config if we picked a new automation. If same ID, don't fetch it.
      oldAutomationId !== this.automationId
    ) {
      this._setEntityId();
      this._loadConfig();
    }

    if (
      changedProps.has("automationId") &&
      !this.automationId &&
      !this.entityId &&
      this.hass
    ) {
      const initData = getAutomationEditorInitData();
      this.dirty = !!initData;
      let baseConfig: Partial<AutomationConfig> = { description: "" };
      if (!initData || !("use_blueprint" in initData)) {
        baseConfig = {
          ...baseConfig,
          mode: "single",
          triggers: [],
          conditions: [],
          actions: [],
        };
      }
      this.config = {
        ...baseConfig,
        ...(initData ? normalizeAutomationConfig(initData) : initData),
      } as AutomationConfig;
      this.currentEntityId = undefined;
      this.readOnly = false;
    }

    if (changedProps.has("entityId") && this.entityId) {
      getAutomationStateConfig(this.hass, this.entityId).then((c) => {
        this.config = normalizeAutomationConfig(c.config);
        this._checkValidation();
      });
      this.currentEntityId = this.entityId;
      this.dirty = false;
      this.readOnly = true;
    }

    if (
      changedProps.has("automations") &&
      this.automationId &&
      !this.currentEntityId
    ) {
      this._setEntityId();
    }

    if (changedProps.has("config")) {
      Object.values(this._configSubscriptions).forEach((sub) =>
        sub(this.config)
      );
    }
  }

  private _setEntityId() {
    const automation = this.automations.find(
      (entity: AutomationEntity) => entity.attributes.id === this.automationId
    );
    this.currentEntityId = automation?.entity_id;
  }

  private async _checkValidation() {
    this.validationErrors = undefined;
    if (!this.currentEntityId || !this.config) {
      return;
    }
    const stateObj = this.hass.states[this.currentEntityId];
    if (stateObj?.state !== UNAVAILABLE) {
      return;
    }
    const validation = await validateConfig(this.hass, {
      triggers: this.config.triggers,
      conditions: this.config.conditions,
      actions: this.config.actions,
    });
    this.validationErrors = (
      Object.entries(validation) as Entries<typeof validation>
    ).map(([key, value]) =>
      value.valid
        ? ""
        : html`${this.hass.localize(
              `ui.panel.config.automation.editor.${key}.name`
            )}:
            ${value.error}<br />`
    );
  }

  private async _loadConfig() {
    try {
      const config = await fetchAutomationFileConfig(
        this.hass,
        this.automationId as string
      );
      this.dirty = false;
      this.readOnly = false;
      this.config = normalizeAutomationConfig(config);
      this._checkValidation();
    } catch (err: any) {
      if (err.status_code !== 404) {
        await showAlertDialog(this, {
          title: this.hass.localize(
            "ui.panel.config.automation.editor.load_error_unknown",
            { err_no: err.status_code ?? "unknown" }
          ),
          text: html`<pre>${err.body?.message || err.error || err.body || "Unknown error"}</pre>`,
        });
        goBack("/config");
        return;
      }
      const entity = this._entityRegistry.find(
        (ent) =>
          ent.platform === "automation" && ent.unique_id === this.automationId
      );
      if (entity) {
        navigate(`/config/automation/show/${entity.entity_id}`, {
          replace: true,
        });
        return;
      }
      await showAlertDialog(this, {
        text: this.hass.localize(
          "ui.panel.config.automation.editor.load_error_not_editable"
        ),
      });
      goBack("/config");
    }
  }

  private _valueChanged(ev: ValueChangedEvent<AutomationConfig>) {
    ev.stopPropagation();

    if (this.config) {
      this._undoRedoController.commit(this.config);
    }

    this.config = ev.detail.value;
    if (this.readOnly) {
      return;
    }
    this.dirty = true;
    this.errors = undefined;
  }

  private _showInfo() {
    if (!this.hass || !this.currentEntityId) {
      return;
    }
    fireEvent(this, "hass-more-info", { entityId: this.currentEntityId });
  }

  private _editCategory() {
    if (!this.registryEntry) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.scene.picker.no_category_support"
        ),
        text: this.hass.localize(
          "ui.panel.config.scene.picker.no_category_entity_reg"
        ),
      });
      return;
    }
    showAssignCategoryDialog(this, {
      scope: "automation",
      entityReg: this.registryEntry,
    });
  }

  private async _showTrace() {
    if (this.config?.id) {
      const result = await this.confirmUnsavedChanged();
      if (result) {
        navigate(
          `/config/automation/trace/${encodeURIComponent(this.config.id)}`
        );
      }
    }
  }

  private _runActions() {
    if (!this.hass || !this.currentEntityId) {
      return;
    }
    triggerAutomationActions(
      this.hass,
      this.hass.states[this.currentEntityId].entity_id
    );
  }

  private async _toggle(): Promise<void> {
    if (!this.hass || !this.currentEntityId) {
      return;
    }
    const stateObj = this.hass.states[this.currentEntityId];
    const service = stateObj.state === "off" ? "turn_on" : "turn_off";
    await this.hass.callService("automation", service, {
      entity_id: stateObj.entity_id,
    });
  }

  private _preprocessYaml() {
    if (!this.config) {
      return {};
    }
    const cleanConfig: AutomationConfig = { ...this.config };
    delete cleanConfig.id;
    return cleanConfig;
  }

  private _yamlChanged(ev: CustomEvent) {
    ev.stopPropagation();
    this.dirty = true;
    if (!ev.detail.isValid) {
      this.yamlErrors = ev.detail.errorMsg;
      return;
    }
    this.yamlErrors = undefined;
    this.config = {
      id: this.config?.id,
      ...normalizeAutomationConfig(ev.detail.value),
    };
    this.errors = undefined;
  }

  protected async confirmUnsavedChanged(): Promise<boolean> {
    if (!this.dirty) {
      return true;
    }

    return new Promise<boolean>((resolve) => {
      showAutomationSaveDialog(this, {
        config: this.config!,
        domain: "automation",
        updateConfig: async (config, entityRegistryUpdate) => {
          this.config = config;
          this.entityRegistryUpdate = entityRegistryUpdate;
          this.dirty = true;
          this.requestUpdate();

          const id = this.automationId || String(Date.now());
          try {
            await this._saveAutomation(id);
          } catch (_err: any) {
            this.requestUpdate();
            resolve(false);
            return;
          }

          resolve(true);
        },
        onClose: () => resolve(false),
        onDiscard: () => resolve(true),
        entityRegistryUpdate: this.entityRegistryUpdate,
        entityRegistryEntry: this.registryEntry,
        title: this.hass.localize(
          this.automationId
            ? "ui.panel.config.automation.editor.leave.unsaved_confirm_title"
            : "ui.panel.config.automation.editor.leave.unsaved_new_title"
        ),
        description: this.hass.localize(
          this.automationId
            ? "ui.panel.config.automation.editor.leave.unsaved_confirm_text"
            : "ui.panel.config.automation.editor.leave.unsaved_new_text"
        ),
        hideInputs: this.automationId !== null,
      });
    });
  }

  private async _takeControl() {
    const config = this.config as BlueprintAutomationConfig;

    try {
      const result = await substituteBlueprint(
        this.hass,
        "automation",
        config.use_blueprint.path,
        config.use_blueprint.input || {}
      );

      const newConfig = {
        ...normalizeAutomationConfig(result.substituted_config),
        id: config.id,
        alias: config.alias,
        description: config.description,
      };

      this.blueprintConfig = config;
      this.config = newConfig;
      if (this.mode === "yaml") {
        this.renderRoot.querySelector("ha-yaml-editor")?.setValue(this.config);
      }
      this.readOnly = true;
      this.errors = undefined;
    } catch (err: any) {
      this.errors = err.message;
    }
  }

  private async _duplicate() {
    const result = this.readOnly
      ? await showConfirmationDialog(this, {
          title: this.hass.localize(
            "ui.panel.config.automation.picker.migrate_automation"
          ),
          text: this.hass.localize(
            "ui.panel.config.automation.picker.migrate_automation_description"
          ),
        })
      : await this.confirmUnsavedChanged();
    if (result) {
      showAutomationEditor({
        ...this.config,
        id: undefined,
        alias: this.readOnly ? this.config?.alias : undefined,
      });
    }
  }

  private async _deleteConfirm() {
    showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.automation.picker.delete_confirm_title"
      ),
      text: this.hass.localize(
        "ui.panel.config.automation.picker.delete_confirm_text",
        { name: this.config?.alias }
      ),
      confirmText: this.hass!.localize("ui.common.delete"),
      destructive: true,
      dismissText: this.hass!.localize("ui.common.cancel"),
      confirm: () => this._delete(),
    });
  }

  private async _delete() {
    if (this.automationId) {
      await deleteAutomation(this.hass, this.automationId);
      goBack("/config");
    }
  }

  private async _promptAutomationAlias(): Promise<boolean> {
    return new Promise((resolve) => {
      showAutomationSaveDialog(this, {
        config: this.config!,
        domain: "automation",
        updateConfig: async (config, entityRegistryUpdate) => {
          this.config = config;
          this.entityRegistryUpdate = entityRegistryUpdate;
          this.dirty = true;
          this.requestUpdate();
          resolve(true);
        },
        onClose: () => resolve(false),
        entityRegistryUpdate: this.entityRegistryUpdate,
        entityRegistryEntry: this.registryEntry,
      });
    });
  }

  private async _promptAutomationMode(): Promise<void> {
    return new Promise((resolve) => {
      showAutomationModeDialog(this, {
        config: this.config!,
        updateConfig: (config) => {
          this.config = config;
          this.dirty = true;
          this.requestUpdate();
          resolve();
        },
        onClose: () => resolve(),
      });
    });
  }

  private async _handleSaveAutomation(): Promise<void> {
    if (this.yamlErrors) {
      showToast(this, {
        message: this.yamlErrors,
      });
      return;
    }

    this._manualEditor?.resetPastedConfig();

    const id = this.automationId || String(Date.now());
    if (!this.automationId) {
      const saved = await this._promptAutomationAlias();
      if (!saved) {
        return;
      }
    }

    await this._saveAutomation(id);
    if (!this.automationId) {
      navigate(`/config/automation/edit/${id}`, { replace: true });
    }
  }

  private async _saveAutomation(id): Promise<void> {
    this.saving = true;
    this.validationErrors = undefined;

    let entityRegPromise: Promise<EntityRegistryEntry> | undefined;
    if (this.entityRegistryUpdate !== undefined && !this.currentEntityId) {
      this._newAutomationId = id;
      entityRegPromise = new Promise<EntityRegistryEntry>((resolve) => {
        this.entityRegCreated = resolve;
      });
    }

    try {
      await saveAutomationConfig(this.hass, id, this.config!);

      if (this.entityRegistryUpdate !== undefined) {
        let entityId = this.currentEntityId;

        // wait for automation to appear in entity registry when creating a new automation
        if (entityRegPromise) {
          try {
            const automation = await promiseTimeout(5000, entityRegPromise);
            entityId = automation.entity_id;
          } catch (e) {
            if (e instanceof Error && e.name === "TimeoutError") {
              // Show the dialog and give user a chance to wait for the registry
              // to respond.
              await showAutomationSaveTimeoutDialog(this, {
                savedPromise: entityRegPromise,
                type: "automation",
              });
              try {
                // We already gave the user a chance to wait once, so if they skipped
                // the dialog and it's still not there just immediately timeout.
                const automation = await promiseTimeout(0, entityRegPromise);
                entityId = automation.entity_id;
              } catch (e2) {
                if (!(e2 instanceof Error && e2.name === "TimeoutError")) {
                  throw e2;
                }
              }
            } else {
              throw e;
            }
          }
        }

        if (entityId) {
          await updateEntityRegistryEntry(this.hass, entityId, {
            categories: {
              automation: this.entityRegistryUpdate.category || null,
            },
            labels: this.entityRegistryUpdate.labels || [],
            area_id: this.entityRegistryUpdate.area || null,
          });
        }
      }

      this.dirty = false;
    } catch (errors: any) {
      this.errors = errors.body?.message || errors.error || errors.body;
      showToast(this, {
        message: errors.body?.message || errors.error || errors.body,
      });
      throw errors;
    } finally {
      this.saving = false;
    }
  }

  private _subscribeAutomationConfig(ev) {
    const id = this._configSubscriptionsId++;
    this._configSubscriptions[id] = ev.detail.callback;
    ev.detail.unsub = () => {
      delete this._configSubscriptions[id];
    };
    ev.detail.callback(this.config);
  }

  protected supportedShortcuts(): SupportedShortcuts {
    return {
      s: () => this._handleSaveAutomation(),
      c: () => this._copySelectedRow(),
      x: () => this._cutSelectedRow(),
      Delete: () => this._deleteSelectedRow(),
      Backspace: () => this._deleteSelectedRow(),
      z: () => this._undo(),
      Z: () => this._redo(),
      y: () => this._redo(),
    };
  }

  // @ts-ignore
  private _collapseAll() {
    this._manualEditor?.collapseAll();
  }

  // @ts-ignore
  private _expandAll() {
    this._manualEditor?.expandAll();
  }

  private _copySelectedRow() {
    this._manualEditor?.copySelectedRow();
  }

  private _cutSelectedRow() {
    this._manualEditor?.cutSelectedRow();
  }

  private _deleteSelectedRow() {
    this._manualEditor?.deleteSelectedRow();
  }

  private _applyUndoRedo(config: AutomationConfig) {
    this._manualEditor?.triggerCloseSidebar();
    this.config = config;
    this.dirty = true;
  }

  private _undo() {
    this._undoRedoController.undo();
  }

  private _redo() {
    this._undoRedoController.redo();
  }

  private _handleDropdownSelect(ev: HaDropdownSelectEvent) {
    const action = ev.detail?.item?.value;

    if (!action) {
      return;
    }

    switch (action) {
      case "undo":
        this._undo();
        break;
      case "redo":
        this._redo();
        break;
      case "info":
        this._showInfo();
        break;
      case "settings":
        this.showSettings();
        break;
      case "category":
        this._editCategory();
        break;
      case "run":
        this._runActions();
        break;
      case "rename":
        this._promptAutomationAlias();
        break;
      case "change_mode":
        this._promptAutomationMode();
        break;
      case "duplicate":
        this._duplicate();
        break;
      case "take_control":
        this._takeControl();
        break;
      case "toggle_yaml_mode":
        if (this.mode === "gui") {
          this.switchYamlMode();
          break;
        }
        this.switchUiMode();
        break;
      case "disable":
        this._toggle();
        break;
      case "delete":
        this._deleteConfirm();
        break;
      case "trace":
        this._showTrace();
        break;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      automationScriptEditorStyles,
      css`
        manual-automation-editor,
        blueprint-automation-editor {
          margin: 0 auto;
          max-width: 1040px;
          padding: 28px 20px 0;
          display: block;
        }

        manual-automation-editor {
          max-width: var(--ha-automation-editor-max-width);
          padding: 0 12px;
        }

        ha-entity-toggle {
          margin-right: 8px;
          margin-inline-end: 8px;
          margin-inline-start: initial;
        }
        h1 {
          margin: 0;
        }
        .header-name {
          display: flex;
          align-items: center;
          margin: 0 auto;
          max-width: 1040px;
          padding: 28px 20px 0;
        }
      `,
    ];
  }
}
