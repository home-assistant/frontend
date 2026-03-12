import "@home-assistant/webawesome/dist/components/divider/divider";
import {
  mdiAppleKeyboardCommand,
  mdiCog,
  mdiContentSave,
  mdiDebugStepOver,
  mdiDelete,
  mdiDotsVertical,
  mdiFileEdit,
  mdiFormTextbox,
  mdiInformationOutline,
  mdiPlay,
  mdiPlaylistEdit,
  mdiPlusCircleMultipleOutline,
  mdiRedo,
  mdiRenameBox,
  mdiRobotConfused,
  mdiTag,
  mdiTransitConnection,
  mdiUndo,
} from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { UndoRedoController } from "../../../common/controllers/undo-redo-controller";
import { fireEvent } from "../../../common/dom/fire_event";
import { goBack, navigate } from "../../../common/navigate";
import { slugify } from "../../../common/string/slugify";
import { promiseTimeout } from "../../../common/util/promise-timeout";
import "../../../components/ha-button";
import "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import "../../../components/ha-fab";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import "../../../components/ha-yaml-editor";
import { substituteBlueprint } from "../../../data/blueprint";
import { validateConfig } from "../../../data/config";
import { UNAVAILABLE } from "../../../data/entity/entity";
import {
  type EntityRegistryEntry,
  updateEntityRegistryEntry,
} from "../../../data/entity/entity_registry";
import type { BlueprintScriptConfig, ScriptConfig } from "../../../data/script";
import {
  deleteScript,
  fetchScriptFileConfig,
  getScriptEditorInitData,
  getScriptStateConfig,
  hasScriptFields,
  normalizeScriptConfig,
  showScriptEditor,
  triggerScript,
} from "../../../data/script";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import { showMoreInfoDialog } from "../../../dialogs/more-info/show-ha-more-info-dialog";
import "../../../layouts/hass-subpage";
import { KeyboardShortcutMixin } from "../../../mixins/keyboard-shortcut-mixin";
import { PreventUnsavedMixin } from "../../../mixins/prevent-unsaved-mixin";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { haStyle } from "../../../resources/styles";
import type { Entries } from "../../../types";
import { isMac } from "../../../util/is_mac";
import { showToast } from "../../../util/toast";
import { showAutomationModeDialog } from "../automation/automation-mode-dialog/show-dialog-automation-mode";
import { showAutomationSaveDialog } from "../automation/automation-save-dialog/show-dialog-automation-save";
import { showAutomationSaveTimeoutDialog } from "../automation/automation-save-timeout-dialog/show-dialog-automation-save-timeout";
import { showAssignCategoryDialog } from "../category/show-dialog-assign-category";
import "./blueprint-script-editor";
import {
  AutomationScriptEditorMixin,
  automationScriptEditorStyles,
} from "../automation/ha-automation-script-editor-mixin";
import "./manual-script-editor";
import type { HaManualScriptEditor } from "./manual-script-editor";
import type { HaDropdownSelectEvent } from "../../../components/ha-dropdown";

@customElement("ha-script-editor")
export class HaScriptEditor extends SubscribeMixin(
  AutomationScriptEditorMixin<ScriptConfig>(
    PreventUnsavedMixin(KeyboardShortcutMixin(LitElement))
  )
) {
  @property({ attribute: false }) public scriptId: string | null = null;

  @property({ attribute: false }) public entityRegistry!: EntityRegistryEntry[];

  @query("manual-script-editor")
  private _manualEditor?: HaManualScriptEditor;

  private _newScriptId?: string;

  private _undoRedoController = new UndoRedoController<ScriptConfig>(this, {
    apply: (config) => this._applyUndoRedo(config),
    currentConfig: () => this.config!,
  });

  protected willUpdate(changedProps) {
    super.willUpdate(changedProps);

    if (
      this.entityRegCreated &&
      this._newScriptId &&
      changedProps.has("entityRegistry")
    ) {
      const script = this.entityRegistry.find(
        (entity: EntityRegistryEntry) =>
          entity.platform === "script" && entity.unique_id === this._newScriptId
      );
      if (script) {
        this.entityRegCreated(script);
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
        this.hass.localize("ui.panel.config.script.editor.default_name")}
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
                <span class="shortcut">
                  (<span>${shortcutIcon}</span>
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
                <span class="shortcut"
                  >(
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
        ${this.scriptId && !this.narrow
          ? html`
              <ha-button
                appearance="plain"
                @click=${this._showTrace}
                slot="toolbar-icon"
              >
                ${this.hass.localize(
                  "ui.panel.config.script.editor.show_trace"
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

          <ha-dropdown-item .disabled=${!this.scriptId} value="info">
            ${this.hass.localize("ui.panel.config.script.editor.show_info")}
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
              `ui.panel.config.scene.picker.${this.registryEntry?.categories?.script ? "edit_category" : "assign_category"}`
            )}
            <ha-svg-icon slot="icon" .path=${mdiTag}></ha-svg-icon>
          </ha-dropdown-item>

          <ha-dropdown-item .disabled=${!this.scriptId} value="run">
            ${this.hass.localize("ui.panel.config.script.picker.run_script")}
            <ha-svg-icon slot="icon" .path=${mdiPlay}></ha-svg-icon>
          </ha-dropdown-item>

          ${this.scriptId && this.narrow
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
          ${!useBlueprint && !("fields" in this.config)
            ? html`
                <ha-dropdown-item
                  .disabled=${this.readOnly || this.mode === "yaml"}
                  value="add_fields"
                >
                  ${this.hass.localize(
                    "ui.panel.config.script.editor.field.add_fields"
                  )}
                  <ha-svg-icon
                    slot="icon"
                    .path=${mdiFormTextbox}
                  ></ha-svg-icon>
                </ha-dropdown-item>
              `
            : nothing}

          <ha-dropdown-item
            value="rename"
            .disabled=${!this.scriptId || this.readOnly || this.mode === "yaml"}
          >
            ${this.hass.localize("ui.panel.config.script.editor.rename")}
            <ha-svg-icon slot="icon" .path=${mdiRenameBox}></ha-svg-icon>
          </ha-dropdown-item>
          ${!useBlueprint
            ? html`
                <ha-dropdown-item
                  value="change_mode"
                  .disabled=${this.readOnly || this.mode === "yaml"}
                >
                  ${this.hass.localize(
                    "ui.panel.config.script.editor.change_mode"
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
            (!this.readOnly && !this.scriptId)}
            value="duplicate"
          >
            ${this.hass.localize(
              this.readOnly
                ? "ui.panel.config.script.editor.migrate"
                : "ui.panel.config.script.editor.duplicate"
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
                    "ui.panel.config.script.editor.take_control"
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

          <ha-dropdown-item
            .disabled=${this.readOnly || !this.scriptId}
            value="delete"
            .variant=${this.scriptId ? "danger" : "default"}
          >
            ${this.hass.localize("ui.panel.config.script.picker.delete")}
            <ha-svg-icon
              class=${classMap({ warning: Boolean(this.scriptId) })}
              slot="icon"
              .path=${mdiDelete}
            >
            </ha-svg-icon>
          </ha-dropdown-item>
        </ha-dropdown>
        <div class=${this.mode === "yaml" ? "yaml-mode" : ""}>
          ${this.mode === "gui"
            ? html`
                <div>
                  ${useBlueprint
                    ? html`
                        <blueprint-script-editor
                          .hass=${this.hass}
                          .narrow=${this.narrow}
                          .isWide=${this.isWide}
                          .config=${this.config}
                          .disabled=${this.readOnly}
                          .saving=${this.saving}
                          .dirty=${this.dirty}
                          @value-changed=${this._valueChanged}
                          @save-script=${this._handleSaveScript}
                        ></blueprint-script-editor>
                      `
                    : html`
                        <manual-script-editor
                          .hass=${this.hass}
                          .narrow=${this.narrow}
                          .isWide=${this.isWide}
                          .config=${this.config}
                          .disabled=${this.readOnly}
                          .dirty=${this.dirty}
                          .saving=${this.saving}
                          @value-changed=${this._valueChanged}
                          @editor-save=${this._handleSaveScript}
                          @save-script=${this._handleSaveScript}
                        >
                          <div class="alert-wrapper" slot="alerts">
                            ${this.errors || stateObj?.state === UNAVAILABLE
                              ? html`<ha-alert
                                  alert-type="error"
                                  .title=${stateObj?.state === UNAVAILABLE
                                    ? this.hass.localize(
                                        "ui.panel.config.script.editor.unavailable"
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
                                    "ui.panel.config.script.editor.confirm_take_control"
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
                                      "ui.panel.config.script.editor.read_only"
                                    )}
                                    <ha-button
                                      appearance="plain"
                                      slot="action"
                                      @click=${this._duplicate}
                                    >
                                      ${this.hass.localize(
                                        "ui.panel.config.script.editor.migrate"
                                      )}
                                    </ha-button>
                                  </ha-alert>`
                                : nothing}
                          </div>
                        </manual-script-editor>
                      `}
                </div>
              `
            : this.mode === "yaml"
              ? html`<ha-yaml-editor
                    .hass=${this.hass}
                    .defaultValue=${this._preprocessYaml()}
                    .readOnly=${this.readOnly}
                    disable-fullscreen
                    @value-changed=${this._yamlChanged}
                    @editor-save=${this._handleSaveScript}
                    .showErrors=${false}
                  ></ha-yaml-editor>
                  <ha-fab
                    slot="fab"
                    class=${!this.readOnly && this.dirty ? "dirty" : ""}
                    .label=${this.hass.localize("ui.common.save")}
                    .disabled=${this.saving}
                    extended
                    @click=${this._handleSaveScript}
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

    const oldScript = changedProps.get("scriptId");
    if (
      changedProps.has("scriptId") &&
      this.scriptId &&
      !this.entityId &&
      this.hass &&
      // Only refresh config if we picked a new script. If same ID, don't fetch it.
      (!oldScript || oldScript !== this.scriptId)
    ) {
      this._loadConfig();
    }

    if (
      (changedProps.has("scriptId") || changedProps.has("entityRegistry")) &&
      this.scriptId &&
      this.entityRegistry
    ) {
      // find entity for when script entity id changed
      const entity = this.entityRegistry.find(
        (ent) => ent.platform === "script" && ent.unique_id === this.scriptId
      );
      this.currentEntityId = entity?.entity_id;
    }

    if (changedProps.has("scriptId") && !this.scriptId && this.hass) {
      const initData = getScriptEditorInitData();
      this.dirty = !!initData;
      const baseConfig: Partial<ScriptConfig> = {};
      if (!initData || !("use_blueprint" in initData)) {
        baseConfig.sequence = [];
      }
      this.config = {
        ...baseConfig,
        ...initData,
      } as ScriptConfig;
      this.readOnly = false;
    }

    if (changedProps.has("entityId") && this.entityId) {
      getScriptStateConfig(this.hass, this.entityId).then((c) => {
        this.config = normalizeScriptConfig(c.config);
        this._checkValidation();
      });
      const regEntry = this.entityRegistry.find(
        (ent) => ent.entity_id === this.entityId
      );
      if (regEntry?.unique_id) {
        this.scriptId = regEntry.unique_id;
      }
      this.currentEntityId = this.entityId;
      this.dirty = false;
      this.readOnly = true;
    }
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
      actions: this.config.sequence,
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
    fetchScriptFileConfig(this.hass, this.scriptId!).then(
      (config) => {
        this.dirty = false;
        this.readOnly = false;
        this.config = normalizeScriptConfig(config);
        const entity = this.entityRegistry.find(
          (ent) => ent.platform === "script" && ent.unique_id === this.scriptId
        );
        this.currentEntityId = entity?.entity_id;
        this._checkValidation();
      },
      (resp) => {
        const entity = this.entityRegistry.find(
          (ent) => ent.platform === "script" && ent.unique_id === this.scriptId
        );
        if (entity) {
          navigate(`/config/script/show/${entity.entity_id}`, {
            replace: true,
          });
          return;
        }
        alert(
          resp.status_code === 404
            ? this.hass.localize(
                "ui.panel.config.script.editor.load_error_not_editable"
              )
            : this.hass.localize(
                "ui.panel.config.script.editor.load_error_unknown",
                { err_no: resp.status_code || resp.code }
              )
        );
        goBack("/config");
      }
    );
  }

  private _valueChanged(ev) {
    if (this.config) {
      this._undoRedoController.commit(this.config);
    }

    this.config = ev.detail.value;
    this.errors = undefined;
    this.dirty = true;
  }

  private async _runScript() {
    if (hasScriptFields(this.hass, this.currentEntityId!)) {
      showMoreInfoDialog(this, {
        entityId: this.currentEntityId!,
      });
      return;
    }

    await triggerScript(this.hass, this.scriptId!);
    showToast(this, {
      message: this.hass.localize("ui.notification_toast.triggered", {
        name: this.config!.alias,
      }),
    });
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
      scope: "script",
      entityReg: this.registryEntry,
    });
  }

  private _computeEntityIdFromAlias(alias: string) {
    const aliasSlugify = slugify(alias);
    let id = aliasSlugify;
    let i = 2;
    while (this._idIsUsed(id)) {
      id = `${aliasSlugify}_${i}`;
      i++;
    }
    return id;
  }

  private _idIsUsed(id: string): boolean {
    return (
      `script.${id}` in this.hass.states ||
      this.entityRegistry.some((ent) => ent.unique_id === id)
    );
  }

  private async _showInfo() {
    if (!this.scriptId) {
      return;
    }
    const entity = this.entityRegistry.find(
      (entry) => entry.unique_id === this.scriptId
    );
    if (!entity) {
      return;
    }
    fireEvent(this, "hass-more-info", { entityId: entity.entity_id });
  }

  private async _showTrace() {
    if (this.scriptId) {
      const result = await this.confirmUnsavedChanged();
      if (result) {
        navigate(`/config/script/trace/${this.scriptId}`);
      }
    }
  }

  private _addFields() {
    if ("fields" in this.config!) {
      return;
    }

    if (this.config) {
      this._undoRedoController.commit(this.config);
    }

    this._manualEditor?.addFields();
    this.dirty = true;
  }

  private _preprocessYaml() {
    return this.config;
  }

  private _yamlChanged(ev: CustomEvent) {
    ev.stopPropagation();
    this.dirty = true;
    if (!ev.detail.isValid) {
      this.yamlErrors = ev.detail.errorMsg;
      return;
    }
    this.yamlErrors = undefined;
    this.config = ev.detail.value;
    this.errors = undefined;
  }

  protected async confirmUnsavedChanged(): Promise<boolean> {
    if (!this.dirty) {
      return true;
    }

    return new Promise<boolean>((resolve) => {
      showAutomationSaveDialog(this, {
        config: this.config!,
        domain: "script",
        updateConfig: async (config, entityRegistryUpdate) => {
          this.config = config;
          this.entityRegistryUpdate = entityRegistryUpdate;
          this.dirty = true;
          this.requestUpdate();

          const id = this.scriptId || String(Date.now());
          try {
            await this._saveScript(id);
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
          this.scriptId
            ? "ui.panel.config.script.editor.leave.unsaved_confirm_title"
            : "ui.panel.config.script.editor.leave.unsaved_new_title"
        ),
        description: this.hass.localize(
          this.scriptId
            ? "ui.panel.config.script.editor.leave.unsaved_confirm_text"
            : "ui.panel.config.script.editor.leave.unsaved_new_text"
        ),
        hideInputs: this.scriptId !== null,
      });
    });
  }

  private async _takeControl() {
    const config = this.config as BlueprintScriptConfig;

    try {
      const result = await substituteBlueprint(
        this.hass,
        "script",
        config.use_blueprint.path,
        config.use_blueprint.input || {}
      );

      const newConfig = {
        ...normalizeScriptConfig(result.substituted_config),
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
            "ui.panel.config.script.picker.migrate_script"
          ),
          text: this.hass.localize(
            "ui.panel.config.script.picker.migrate_script_description"
          ),
        })
      : await this.confirmUnsavedChanged();
    if (result) {
      this.currentEntityId = undefined;
      showScriptEditor({
        ...this.config,
        alias: this.readOnly
          ? this.config?.alias
          : `${this.config?.alias} (${this.hass.localize(
              "ui.panel.config.script.picker.duplicate"
            )})`,
      });
    }
  }

  private async _deleteConfirm() {
    showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.script.editor.delete_confirm_title"
      ),
      text: this.hass.localize(
        "ui.panel.config.script.editor.delete_confirm_text",
        { name: this.config?.alias }
      ),
      confirmText: this.hass!.localize("ui.common.delete"),
      destructive: true,
      dismissText: this.hass!.localize("ui.common.cancel"),
      confirm: () => this._delete(),
    });
  }

  private async _delete() {
    await deleteScript(this.hass, this.scriptId!);
    goBack("/config");
  }

  private async _promptScriptAlias(): Promise<boolean> {
    return new Promise((resolve) => {
      showAutomationSaveDialog(this, {
        config: this.config!,
        domain: "script",
        updateConfig: async (config, entityRegistryUpdate) => {
          this.config = config;
          this.entityRegistryUpdate = entityRegistryUpdate;
          this.dirty = true;
          this.requestUpdate();
          resolve(true);
        },
        onClose: () => resolve(false),
        entityRegistryUpdate: this.entityRegistryUpdate,
        entityRegistryEntry: this.entityRegistry.find(
          (entry) => entry.unique_id === this.scriptId
        ),
      });
    });
  }

  private async _promptScriptMode(): Promise<void> {
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

  private async _handleSaveScript() {
    if (this.yamlErrors) {
      showToast(this, {
        message: this.yamlErrors,
      });
      return;
    }

    this._manualEditor?.resetPastedConfig();

    if (!this.scriptId) {
      const saved = await this._promptScriptAlias();
      if (!saved) {
        return;
      }
      this.currentEntityId = this._computeEntityIdFromAlias(this.config!.alias);
    }
    const id = this.scriptId || this.currentEntityId || Date.now();

    await this._saveScript(id);
    if (!this.scriptId) {
      navigate(`/config/script/edit/${id}`, { replace: true });
    }
  }

  private async _saveScript(id): Promise<void> {
    this.saving = true;

    let entityRegPromise: Promise<EntityRegistryEntry> | undefined;
    if (this.entityRegistryUpdate !== undefined && !this.scriptId) {
      this._newScriptId = id.toString();
      entityRegPromise = new Promise<EntityRegistryEntry>((resolve) => {
        this.entityRegCreated = resolve;
      });
    }

    try {
      await this.hass!.callApi(
        "POST",
        "config/script/config/" + id,
        this.config
      );

      if (this.entityRegistryUpdate !== undefined) {
        let entityId = this.currentEntityId;

        // wait for new script to appear in entity registry
        if (entityRegPromise) {
          try {
            const script = await promiseTimeout(5000, entityRegPromise);
            entityId = script.entity_id;
          } catch (e) {
            entityId = undefined;
            if (e instanceof Error && e.name === "TimeoutError") {
              // Show the dialog and give user a chance to wait for the registry
              // to respond.
              await showAutomationSaveTimeoutDialog(this, {
                savedPromise: entityRegPromise,
                type: "script",
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
              script: this.entityRegistryUpdate.category || null,
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

  protected supportedShortcuts(): SupportedShortcuts {
    return {
      s: () => this._handleSaveScript(),
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

  private _applyUndoRedo(config: ScriptConfig) {
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
        this._runScript();
        break;
      case "add_fields":
        this._addFields();
        break;
      case "rename":
        this._promptScriptAlias();
        break;
      case "change_mode":
        this._promptScriptMode();
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
        manual-script-editor,
        blueprint-script-editor {
          margin: 0 auto;
          max-width: 1040px;
          padding: 28px 20px 0;
          display: block;
        }

        :not(.yaml-mode) > .error-wrapper {
          position: absolute;
          top: 4px;
          z-index: 3;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        :not(.yaml-mode) > .error-wrapper ha-alert {
          background-color: var(--card-background-color);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          border-radius: var(--ha-border-radius-sm);
        }

        .alert-wrapper {
          position: sticky;
          top: -24px;
          margin-top: -24px;
          margin-bottom: 8px;
          z-index: 1;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--ha-space-2);
          pointer-events: none;
        }

        .alert-wrapper ha-alert {
          background-color: var(--card-background-color);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          border-radius: var(--ha-border-radius-sm);
          margin-bottom: 0;
          pointer-events: auto;
        }

        manual-script-editor {
          max-width: var(--ha-automation-editor-max-width);
          padding: 0 12px;
        }

        span[slot="introduction"] a {
          color: var(--primary-color);
        }
        .header {
          display: flex;
          margin: 16px 0;
          align-items: center;
        }
        .header .name {
          font-size: var(--ha-font-size-xl);
          font-weight: var(--ha-font-weight-normal);
          flex: 1;
        }
        .header a {
          color: var(--secondary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-script-editor": HaScriptEditor;
  }

  interface HASSDomEvents {
    "save-script": undefined;
  }
}
