import { consume } from "@lit/context";
import {
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
  mdiRenameBox,
  mdiRobotConfused,
  mdiTag,
  mdiTransitConnection,
} from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import type { Schema } from "js-yaml";
import { fireEvent } from "../../../common/dom/fire_event";
import { goBack, navigate } from "../../../common/navigate";
import { slugify } from "../../../common/string/slugify";
import { promiseTimeout } from "../../../common/util/promise-timeout";
import { afterNextRender } from "../../../common/util/render-status";
import "../../../components/ha-button";
import "../../../components/ha-button-menu";
import "../../../components/ha-fab";

import { transform } from "../../../common/decorators/transform";
import "../../../components/ha-icon-button";
import "../../../components/ha-list-item";
import "../../../components/ha-svg-icon";
import "../../../components/ha-yaml-editor";
import {
  substituteBlueprint,
  yamlSchemaContext,
} from "../../../data/blueprint";
import { validateConfig } from "../../../data/config";
import { fullEntitiesContext } from "../../../data/context";
import { UNAVAILABLE } from "../../../data/entity";
import {
  type EntityRegistryEntry,
  updateEntityRegistryEntry,
} from "../../../data/entity_registry";
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
import type { Entries, HomeAssistant, Route } from "../../../types";
import { showToast } from "../../../util/toast";
import { showAutomationModeDialog } from "../automation/automation-mode-dialog/show-dialog-automation-mode";
import type { EntityRegistryUpdate } from "../automation/automation-save-dialog/show-dialog-automation-save";
import { showAutomationSaveDialog } from "../automation/automation-save-dialog/show-dialog-automation-save";
import { showAssignCategoryDialog } from "../category/show-dialog-assign-category";
import "./blueprint-script-editor";
import "./manual-script-editor";
import type { HaManualScriptEditor } from "./manual-script-editor";

export class HaScriptEditor extends SubscribeMixin(
  PreventUnsavedMixin(KeyboardShortcutMixin(LitElement))
) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public scriptId: string | null = null;

  @property({ attribute: false }) public entityId: string | null = null;

  @property({ attribute: false }) public entityRegistry!: EntityRegistryEntry[];

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _config?: ScriptConfig;

  @state() private _dirty = false;

  @state() private _errors?: string;

  @state() private _yamlErrors?: string;

  @state() private _entityId?: string;

  @state() private _mode: "gui" | "yaml" = "gui";

  @state() private _readOnly = false;

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  @transform<EntityRegistryEntry[], EntityRegistryEntry>({
    transformer: function (this: HaScriptEditor, value) {
      return value.find(({ entity_id }) => entity_id === this._entityId);
    },
    watch: ["_entityId"],
  })
  private _registryEntry?: EntityRegistryEntry;

  @consume({ context: yamlSchemaContext })
  private _yamlSchema?: Schema;

  @query("manual-script-editor")
  private _manualEditor?: HaManualScriptEditor;

  @state() private _validationErrors?: (string | TemplateResult)[];

  @state() private _blueprintConfig?: BlueprintScriptConfig;

  @state() private _saving = false;

  private _entityRegistryUpdate?: EntityRegistryUpdate;

  private _newScriptId?: string;

  private _entityRegCreated?: (
    value: PromiseLike<EntityRegistryEntry> | EntityRegistryEntry
  ) => void;

  protected willUpdate(changedProps) {
    super.willUpdate(changedProps);

    if (
      this._entityRegCreated &&
      this._newScriptId &&
      changedProps.has("entityRegistry")
    ) {
      const script = this.entityRegistry.find(
        (entity: EntityRegistryEntry) =>
          entity.platform === "script" && entity.unique_id === this._newScriptId
      );
      if (script) {
        this._entityRegCreated(script);
        this._entityRegCreated = undefined;
      }
    }
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this._config) {
      return nothing;
    }

    const stateObj = this._entityId
      ? this.hass.states[this._entityId]
      : undefined;

    const useBlueprint = "use_blueprint" in this._config;
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .backCallback=${this._backTapped}
        .header=${this._config.alias ||
        this.hass.localize("ui.panel.config.script.editor.default_name")}
      >
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
        <ha-button-menu slot="toolbar-icon">
          <ha-icon-button
            slot="trigger"
            .label=${this.hass.localize("ui.common.menu")}
            .path=${mdiDotsVertical}
          ></ha-icon-button>

          <ha-list-item
            graphic="icon"
            .disabled=${!this.scriptId}
            @click=${this._showInfo}
          >
            ${this.hass.localize("ui.panel.config.script.editor.show_info")}
            <ha-svg-icon
              slot="graphic"
              .path=${mdiInformationOutline}
            ></ha-svg-icon>
          </ha-list-item>

          <ha-list-item
            graphic="icon"
            .disabled=${!stateObj}
            @click=${this._showSettings}
          >
            ${this.hass.localize(
              "ui.panel.config.automation.picker.show_settings"
            )}
            <ha-svg-icon slot="graphic" .path=${mdiCog}></ha-svg-icon>
          </ha-list-item>

          <ha-list-item
            graphic="icon"
            .disabled=${!stateObj}
            @click=${this._editCategory}
          >
            ${this.hass.localize(
              `ui.panel.config.scene.picker.${this._registryEntry?.categories?.script ? "edit_category" : "assign_category"}`
            )}
            <ha-svg-icon slot="graphic" .path=${mdiTag}></ha-svg-icon>
          </ha-list-item>

          <ha-list-item
            graphic="icon"
            .disabled=${!this.scriptId}
            @click=${this._runScript}
          >
            ${this.hass.localize("ui.panel.config.script.picker.run_script")}
            <ha-svg-icon slot="graphic" .path=${mdiPlay}></ha-svg-icon>
          </ha-list-item>

          ${this.scriptId && this.narrow
            ? html`
                <a href="/config/script/trace/${this.scriptId}">
                  <ha-list-item graphic="icon">
                    ${this.hass.localize(
                      "ui.panel.config.script.editor.show_trace"
                    )}
                    <ha-svg-icon
                      slot="graphic"
                      .path=${mdiTransitConnection}
                    ></ha-svg-icon>
                  </ha-list-item>
                </a>
              `
            : nothing}
          ${!useBlueprint && !("fields" in this._config)
            ? html`
                <ha-list-item
                  graphic="icon"
                  .disabled=${this._readOnly || this._mode === "yaml"}
                  @click=${this._addFields}
                >
                  ${this.hass.localize(
                    "ui.panel.config.script.editor.field.add_fields"
                  )}
                  <ha-svg-icon
                    slot="graphic"
                    .path=${mdiFormTextbox}
                  ></ha-svg-icon>
                </ha-list-item>
              `
            : nothing}

          <ha-list-item
            graphic="icon"
            @click=${this._promptScriptAlias}
            .disabled=${!this.scriptId ||
            this._readOnly ||
            this._mode === "yaml"}
          >
            ${this.hass.localize("ui.panel.config.script.editor.rename")}
            <ha-svg-icon slot="graphic" .path=${mdiRenameBox}></ha-svg-icon>
          </ha-list-item>
          ${!useBlueprint
            ? html`
                <ha-list-item
                  graphic="icon"
                  @click=${this._promptScriptMode}
                  .disabled=${this._readOnly || this._mode === "yaml"}
                >
                  ${this.hass.localize(
                    "ui.panel.config.script.editor.change_mode"
                  )}
                  <ha-svg-icon
                    slot="graphic"
                    .path=${mdiDebugStepOver}
                  ></ha-svg-icon>
                </ha-list-item>
              `
            : nothing}

          <ha-list-item
            .disabled=${this._blueprintConfig ||
            (!this._readOnly && !this.scriptId)}
            graphic="icon"
            @click=${this._duplicate}
          >
            ${this.hass.localize(
              this._readOnly
                ? "ui.panel.config.script.editor.migrate"
                : "ui.panel.config.script.editor.duplicate"
            )}
            <ha-svg-icon
              slot="graphic"
              .path=${mdiPlusCircleMultipleOutline}
            ></ha-svg-icon>
          </ha-list-item>

          ${useBlueprint
            ? html`
                <ha-list-item
                  graphic="icon"
                  @click=${this._takeControl}
                  .disabled=${this._readOnly}
                >
                  ${this.hass.localize(
                    "ui.panel.config.script.editor.take_control"
                  )}
                  <ha-svg-icon
                    slot="graphic"
                    .path=${mdiFileEdit}
                  ></ha-svg-icon>
                </ha-list-item>
              `
            : nothing}

          <ha-list-item
            graphic="icon"
            @click=${this._mode === "gui"
              ? this._switchYamlMode
              : this._switchUiMode}
          >
            ${this.hass.localize(
              `ui.panel.config.automation.editor.edit_${this._mode === "gui" ? "yaml" : "ui"}`
            )}
            <ha-svg-icon slot="graphic" .path=${mdiPlaylistEdit}></ha-svg-icon>
          </ha-list-item>

          <li divider role="separator"></li>

          <ha-list-item
            .disabled=${this._readOnly || !this.scriptId}
            class=${classMap({ warning: Boolean(this.scriptId) })}
            graphic="icon"
            @click=${this._deleteConfirm}
          >
            ${this.hass.localize("ui.panel.config.script.picker.delete")}
            <ha-svg-icon
              class=${classMap({ warning: Boolean(this.scriptId) })}
              slot="graphic"
              .path=${mdiDelete}
            >
            </ha-svg-icon>
          </ha-list-item>
        </ha-button-menu>
        <div class=${this._mode === "yaml" ? "yaml-mode" : ""}>
          ${this._mode === "gui"
            ? html`
                <div>
                  ${useBlueprint
                    ? html`
                        <blueprint-script-editor
                          .hass=${this.hass}
                          .narrow=${this.narrow}
                          .isWide=${this.isWide}
                          .config=${this._config}
                          .disabled=${this._readOnly}
                          .saving=${this._saving}
                          .dirty=${this._dirty}
                          @value-changed=${this._valueChanged}
                          @save-script=${this._handleSaveScript}
                        ></blueprint-script-editor>
                      `
                    : html`
                        <manual-script-editor
                          .hass=${this.hass}
                          .narrow=${this.narrow}
                          .isWide=${this.isWide}
                          .config=${this._config}
                          .disabled=${this._readOnly}
                          .dirty=${this._dirty}
                          .saving=${this._saving}
                          @value-changed=${this._valueChanged}
                          @editor-save=${this._handleSaveScript}
                          @save-script=${this._handleSaveScript}
                        >
                          <div class="alert-wrapper" slot="alerts">
                            ${this._errors || stateObj?.state === UNAVAILABLE
                              ? html`<ha-alert
                                  alert-type="error"
                                  .title=${stateObj?.state === UNAVAILABLE
                                    ? this.hass.localize(
                                        "ui.panel.config.script.editor.unavailable"
                                      )
                                    : undefined}
                                >
                                  ${this._errors || this._validationErrors}
                                  ${stateObj?.state === UNAVAILABLE
                                    ? html`<ha-svg-icon
                                        slot="icon"
                                        .path=${mdiRobotConfused}
                                      ></ha-svg-icon>`
                                    : nothing}
                                </ha-alert>`
                              : nothing}
                            ${this._blueprintConfig
                              ? html`<ha-alert alert-type="info">
                                  ${this.hass.localize(
                                    "ui.panel.config.script.editor.confirm_take_control"
                                  )}
                                  <div slot="action" style="display: flex;">
                                    <ha-button
                                      appearance="plain"
                                      @click=${this._takeControlSave}
                                      >${this.hass.localize(
                                        "ui.common.yes"
                                      )}</ha-button
                                    >
                                    <ha-button
                                      appearance="plain"
                                      @click=${this._revertBlueprint}
                                      >${this.hass.localize(
                                        "ui.common.no"
                                      )}</ha-button
                                    >
                                  </div>
                                </ha-alert>`
                              : this._readOnly
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
            : this._mode === "yaml"
              ? html`<ha-yaml-editor
                    copy-clipboard
                    .hass=${this.hass}
                    .defaultValue=${this._preprocessYaml()}
                    .readOnly=${this._readOnly}
                    disable-fullscreen
                    @value-changed=${this._yamlChanged}
                    @editor-save=${this._handleSaveScript}
                    .showErrors=${false}
                  ></ha-yaml-editor>
                  <ha-fab
                    slot="fab"
                    class=${!this._readOnly && this._dirty ? "dirty" : ""}
                    .label=${this.hass.localize("ui.common.save")}
                    .disabled=${this._saving}
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
      this._entityId = entity?.entity_id;
    }

    if (changedProps.has("scriptId") && !this.scriptId && this.hass) {
      const initData = getScriptEditorInitData();
      this._dirty = !!initData;
      const baseConfig: Partial<ScriptConfig> = {};
      if (!initData || !("use_blueprint" in initData)) {
        baseConfig.sequence = [];
      }
      this._config = {
        ...baseConfig,
        ...initData,
      } as ScriptConfig;
      this._readOnly = false;
    }

    if (changedProps.has("entityId") && this.entityId) {
      getScriptStateConfig(this.hass, this.entityId).then((c) => {
        this._config = normalizeScriptConfig(c.config);
        this._checkValidation();
      });
      const regEntry = this.entityRegistry.find(
        (ent) => ent.entity_id === this.entityId
      );
      if (regEntry?.unique_id) {
        this.scriptId = regEntry.unique_id;
      }
      this._entityId = this.entityId;
      this._dirty = false;
      this._readOnly = true;
    }
  }

  private async _checkValidation() {
    this._validationErrors = undefined;
    if (!this._entityId || !this._config) {
      return;
    }
    const stateObj = this.hass.states[this._entityId];
    if (stateObj?.state !== UNAVAILABLE) {
      return;
    }
    const validation = await validateConfig(this.hass, {
      actions: this._config.sequence,
    });
    this._validationErrors = (
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
        this._dirty = false;
        this._readOnly = false;
        this._config = normalizeScriptConfig(config);
        const entity = this.entityRegistry.find(
          (ent) => ent.platform === "script" && ent.unique_id === this.scriptId
        );
        this._entityId = entity?.entity_id;
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
    this._config = ev.detail.value;
    this._errors = undefined;
    this._dirty = true;
  }

  private async _runScript(ev: CustomEvent) {
    ev.stopPropagation();

    if (hasScriptFields(this.hass, this._entityId!)) {
      showMoreInfoDialog(this, {
        entityId: this._entityId!,
      });
      return;
    }

    await triggerScript(this.hass, this.scriptId!);
    showToast(this, {
      message: this.hass.localize("ui.notification_toast.triggered", {
        name: this._config!.alias,
      }),
    });
  }

  private _showSettings() {
    showMoreInfoDialog(this, {
      entityId: this._entityId!,
      view: "settings",
    });
  }

  private _editCategory() {
    if (!this._registryEntry) {
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
      entityReg: this._registryEntry,
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
      const result = await this._confirmUnsavedChanged();
      if (result) {
        navigate(`/config/script/trace/${this.scriptId}`);
      }
    }
  }

  private _addFields() {
    if ("fields" in this._config!) {
      return;
    }
    this._manualEditor?.addFields();
    this._dirty = true;
  }

  private _preprocessYaml() {
    return this._config;
  }

  private _yamlChanged(ev: CustomEvent) {
    ev.stopPropagation();
    this._dirty = true;
    if (!ev.detail.isValid) {
      this._yamlErrors = ev.detail.errorMsg;
      return;
    }
    this._yamlErrors = undefined;
    this._config = ev.detail.value;
    this._errors = undefined;
  }

  private async _confirmUnsavedChanged(): Promise<boolean> {
    if (!this._dirty) {
      return true;
    }

    return new Promise<boolean>((resolve) => {
      showAutomationSaveDialog(this, {
        config: this._config!,
        domain: "script",
        updateConfig: async (config, entityRegistryUpdate) => {
          this._config = config;
          this._entityRegistryUpdate = entityRegistryUpdate;
          this._dirty = true;
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
        entityRegistryUpdate: this._entityRegistryUpdate,
        entityRegistryEntry: this._registryEntry,
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

  private _backTapped = async () => {
    const result = await this._confirmUnsavedChanged();
    if (result) {
      afterNextRender(() => goBack("/config"));
    }
  };

  private async _takeControl() {
    const config = this._config as BlueprintScriptConfig;

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

      this._blueprintConfig = config;
      this._config = newConfig;
      if (this._mode === "yaml") {
        this.renderRoot.querySelector("ha-yaml-editor")?.setValue(this._config);
      }
      this._readOnly = true;
      this._errors = undefined;
    } catch (err: any) {
      this._errors = err.message;
    }
  }

  private _revertBlueprint() {
    this._config = this._blueprintConfig;
    if (this._mode === "yaml") {
      this.renderRoot.querySelector("ha-yaml-editor")?.setValue(this._config);
    }
    this._blueprintConfig = undefined;
    this._readOnly = false;
  }

  private _takeControlSave() {
    this._readOnly = false;
    this._dirty = true;
    this._blueprintConfig = undefined;
  }

  private async _duplicate() {
    const result = this._readOnly
      ? await showConfirmationDialog(this, {
          title: this.hass.localize(
            "ui.panel.config.script.picker.migrate_script"
          ),
          text: this.hass.localize(
            "ui.panel.config.script.picker.migrate_script_description"
          ),
        })
      : await this._confirmUnsavedChanged();
    if (result) {
      this._entityId = undefined;
      showScriptEditor({
        ...this._config,
        alias: this._readOnly
          ? this._config?.alias
          : `${this._config?.alias} (${this.hass.localize(
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
        { name: this._config?.alias }
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

  private async _switchUiMode() {
    if (this._yamlErrors) {
      const result = await showConfirmationDialog(this, {
        text: html`${this.hass.localize(
            "ui.panel.config.automation.editor.switch_ui_yaml_error"
          )}<br /><br />${this._yamlErrors}`,
        confirmText: this.hass!.localize("ui.common.continue"),
        destructive: true,
        dismissText: this.hass!.localize("ui.common.cancel"),
      });
      if (!result) {
        return;
      }
    }
    this._yamlErrors = undefined;
    this._mode = "gui";
  }

  private _switchYamlMode() {
    this._mode = "yaml";
  }

  private async _promptScriptAlias(): Promise<boolean> {
    return new Promise((resolve) => {
      showAutomationSaveDialog(this, {
        config: this._config!,
        domain: "script",
        updateConfig: async (config, entityRegistryUpdate) => {
          this._config = config;
          this._entityRegistryUpdate = entityRegistryUpdate;
          this._dirty = true;
          this.requestUpdate();
          resolve(true);
        },
        onClose: () => resolve(false),
        entityRegistryUpdate: this._entityRegistryUpdate,
        entityRegistryEntry: this.entityRegistry.find(
          (entry) => entry.unique_id === this.scriptId
        ),
      });
    });
  }

  private async _promptScriptMode(): Promise<void> {
    return new Promise((resolve) => {
      showAutomationModeDialog(this, {
        config: this._config!,
        updateConfig: (config) => {
          this._config = config;
          this._dirty = true;
          this.requestUpdate();
          resolve();
        },
        onClose: () => resolve(),
      });
    });
  }

  private async _handleSaveScript() {
    if (this._yamlErrors) {
      showToast(this, {
        message: this._yamlErrors,
      });
      return;
    }

    this._manualEditor?.resetPastedConfig();

    if (!this.scriptId) {
      const saved = await this._promptScriptAlias();
      if (!saved) {
        return;
      }
      this._entityId = this._computeEntityIdFromAlias(this._config!.alias);
    }
    const id = this.scriptId || this._entityId || Date.now();

    await this._saveScript(id);
    if (!this.scriptId) {
      navigate(`/config/script/edit/${id}`, { replace: true });
    }
  }

  private async _saveScript(id): Promise<void> {
    this._saving = true;

    let entityRegPromise: Promise<EntityRegistryEntry> | undefined;
    if (this._entityRegistryUpdate !== undefined && !this.scriptId) {
      this._newScriptId = id.toString();
      entityRegPromise = new Promise<EntityRegistryEntry>((resolve) => {
        this._entityRegCreated = resolve;
      });
    }

    try {
      await this.hass!.callApi(
        "POST",
        "config/script/config/" + id,
        this._config
      );

      if (this._entityRegistryUpdate !== undefined) {
        let entityId = this._entityId;

        // wait for new script to appear in entity registry
        if (entityRegPromise) {
          try {
            const script = await promiseTimeout(5000, entityRegPromise);
            entityId = script.entity_id;
          } catch (e) {
            entityId = undefined;
            if (e instanceof Error && e.name === "TimeoutError") {
              showAlertDialog(this, {
                title: this.hass.localize(
                  "ui.panel.config.automation.editor.new_automation_setup_failed_title",
                  {
                    type: this.hass.localize(
                      "ui.panel.config.automation.editor.type_script"
                    ),
                  }
                ),
                text: this.hass.localize(
                  "ui.panel.config.automation.editor.new_automation_setup_failed_text",
                  {
                    type: this.hass.localize(
                      "ui.panel.config.automation.editor.type_script"
                    ),
                    types: this.hass.localize(
                      "ui.panel.config.automation.editor.type_script_plural"
                    ),
                  }
                ),
                warning: true,
              });
            } else {
              throw e;
            }
          }
        }

        if (entityId) {
          await updateEntityRegistryEntry(this.hass, entityId, {
            categories: {
              script: this._entityRegistryUpdate.category || null,
            },
            labels: this._entityRegistryUpdate.labels || [],
            area_id: this._entityRegistryUpdate.area || null,
          });
        }
      }

      this._dirty = false;
    } catch (errors: any) {
      this._errors = errors.body?.message || errors.error || errors.body;
      showToast(this, {
        message: errors.body?.message || errors.error || errors.body,
      });
      throw errors;
    } finally {
      this._saving = false;
    }
  }

  protected supportedShortcuts(): SupportedShortcuts {
    return {
      s: () => this._handleSaveScript(),
      c: () => this._copySelectedRow(),
      x: () => this._cutSelectedRow(),
      Delete: () => this._deleteSelectedRow(),
      Backspace: () => this._deleteSelectedRow(),
    };
  }

  protected get isDirty() {
    return this._dirty;
  }

  protected async promptDiscardChanges() {
    return this._confirmUnsavedChanged();
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

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .yaml-mode {
          height: 100%;
          display: flex;
          flex-direction: column;
          padding-bottom: 0;
        }
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
          gap: 8px;
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
          max-width: 1540px;
          padding: 0 12px;
        }

        ha-yaml-editor {
          flex-grow: 1;
          --actions-border-radius: 0;
          --code-mirror-height: 100%;
          min-height: 0;
          display: flex;
          flex-direction: column;
        }
        p {
          margin-bottom: 0;
        }
        span[slot="introduction"] a {
          color: var(--primary-color);
        }
        ha-fab {
          position: fixed;
          right: 16px;
          bottom: calc(-80px - var(--safe-area-inset-bottom));
          transition: bottom 0.3s;
        }
        ha-fab.dirty {
          bottom: 16px;
        }
        li[role="separator"] {
          border-bottom-color: var(--divider-color);
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
        ha-button-menu a {
          text-decoration: none;
          color: var(--primary-color);
        }
      `,
    ];
  }
}

customElements.define("ha-script-editor", HaScriptEditor);

declare global {
  interface HTMLElementTagNameMap {
    "ha-script-editor": HaScriptEditor;
  }

  interface HASSDomEvents {
    "save-script": undefined;
  }
}
