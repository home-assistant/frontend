import "@material/mwc-button";
import {
  mdiCheck,
  mdiContentDuplicate,
  mdiContentSave,
  mdiDebugStepOver,
  mdiDelete,
  mdiDotsVertical,
  mdiFileEdit,
  mdiFormTextbox,
  mdiInformationOutline,
  mdiPlay,
  mdiRenameBox,
  mdiRobotConfused,
  mdiTransitConnection,
} from "@mdi/js";
import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  TemplateResult,
  css,
  html,
  nothing,
} from "lit";
import { property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../../common/dom/fire_event";
import { navigate } from "../../../common/navigate";
import { slugify } from "../../../common/string/slugify";
import { computeRTL } from "../../../common/util/compute_rtl";
import { afterNextRender } from "../../../common/util/render-status";
import "../../../components/ha-button-menu";
import "../../../components/ha-fab";

import "../../../components/ha-icon-button";
import "../../../components/ha-list-item";
import "../../../components/ha-svg-icon";
import "../../../components/ha-yaml-editor";
import { validateConfig } from "../../../data/config";
import { UNAVAILABLE } from "../../../data/entity";
import { EntityRegistryEntry } from "../../../data/entity_registry";
import {
  BlueprintScriptConfig,
  ScriptConfig,
  deleteScript,
  fetchScriptFileConfig,
  getScriptEditorInitData,
  getScriptStateConfig,
  hasScriptFields,
  migrateAutomationAction,
  showScriptEditor,
  triggerScript,
} from "../../../data/script";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import { showMoreInfoDialog } from "../../../dialogs/more-info/show-ha-more-info-dialog";
import "../../../layouts/hass-subpage";
import { KeyboardShortcutMixin } from "../../../mixins/keyboard-shortcut-mixin";
import { haStyle } from "../../../resources/styles";
import type { Entries, HomeAssistant, Route } from "../../../types";
import { showToast } from "../../../util/toast";
import { showAutomationModeDialog } from "../automation/automation-mode-dialog/show-dialog-automation-mode";
import { showAutomationRenameDialog } from "../automation/automation-rename-dialog/show-dialog-automation-rename";
import "./blueprint-script-editor";
import "./manual-script-editor";
import type { HaManualScriptEditor } from "./manual-script-editor";
import { substituteBlueprint } from "../../../data/blueprint";

export class HaScriptEditor extends KeyboardShortcutMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public scriptId: string | null = null;

  @property() public entityId: string | null = null;

  @property({ attribute: false }) public entityRegistry!: EntityRegistryEntry[];

  @property({ type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _config?: ScriptConfig;

  @state() private _idError = false;

  @state() private _dirty = false;

  @state() private _errors?: string;

  @state() private _entityId?: string;

  @state() private _mode: "gui" | "yaml" = "gui";

  @state() private _readOnly = false;

  @query("manual-script-editor")
  private _manualEditor?: HaManualScriptEditor;

  @state() private _validationErrors?: (string | TemplateResult)[];

  @state() private _blueprintConfig?: BlueprintScriptConfig;

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
        .header=${!this._config.alias ? "" : this._config.alias}
      >
        ${this.scriptId && !this.narrow
          ? html`
              <mwc-button @click=${this._showTrace} slot="toolbar-icon">
                ${this.hass.localize(
                  "ui.panel.config.script.editor.show_trace"
                )}
              </mwc-button>
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
              .path=${mdiContentDuplicate}
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

          <li divider role="separator"></li>

          <ha-list-item graphic="icon" @click=${this._switchUiMode}>
            ${this.hass.localize("ui.panel.config.automation.editor.edit_ui")}
            ${this._mode === "gui"
              ? html`<ha-svg-icon
                  class="selected_menu_item"
                  slot="graphic"
                  .path=${mdiCheck}
                ></ha-svg-icon> `
              : ``}
          </ha-list-item>
          <ha-list-item graphic="icon" @click=${this._switchYamlMode}>
            ${this.hass.localize("ui.panel.config.automation.editor.edit_yaml")}
            ${this._mode === "yaml"
              ? html`<ha-svg-icon
                  class="selected_menu_item"
                  slot="graphic"
                  .path=${mdiCheck}
                ></ha-svg-icon>`
              : ``}
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
        <div
          class="content ${classMap({
            "yaml-mode": this._mode === "yaml",
          })}"
        >
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
            : ""}
          ${this._blueprintConfig
            ? html`<ha-alert alert-type="info">
                ${this.hass.localize(
                  "ui.panel.config.script.editor.confirm_take_control"
                )}
                <div slot="action" style="display: flex;">
                  <mwc-button @click=${this._takeControlSave}
                    >${this.hass.localize("ui.common.yes")}</mwc-button
                  >
                  <mwc-button @click=${this._revertBlueprint}
                    >${this.hass.localize("ui.common.no")}</mwc-button
                  >
                </div>
              </ha-alert>`
            : this._readOnly
              ? html`<ha-alert alert-type="warning" dismissable
                  >${this.hass.localize(
                    "ui.panel.config.script.editor.read_only"
                  )}
                  <mwc-button slot="action" @click=${this._duplicate}>
                    ${this.hass.localize(
                      "ui.panel.config.script.editor.migrate"
                    )}
                  </mwc-button>
                </ha-alert>`
              : nothing}
          ${this._mode === "gui"
            ? html`
                <div
                  class=${classMap({
                    rtl: computeRTL(this.hass),
                  })}
                >
                  ${useBlueprint
                    ? html`
                        <blueprint-script-editor
                          .hass=${this.hass}
                          .narrow=${this.narrow}
                          .isWide=${this.isWide}
                          .config=${this._config}
                          .disabled=${this._readOnly}
                          @value-changed=${this._valueChanged}
                        ></blueprint-script-editor>
                      `
                    : html`
                        <manual-script-editor
                          .hass=${this.hass}
                          .narrow=${this.narrow}
                          .isWide=${this.isWide}
                          .config=${this._config}
                          .disabled=${this._readOnly}
                          @value-changed=${this._valueChanged}
                        ></manual-script-editor>
                      `}
                </div>
              `
            : this._mode === "yaml"
              ? html`<ha-yaml-editor
                  copyClipboard
                  .hass=${this.hass}
                  .defaultValue=${this._preprocessYaml()}
                  .readOnly=${this._readOnly}
                  @value-changed=${this._yamlChanged}
                ></ha-yaml-editor>`
              : nothing}
        </div>
        <ha-fab
          slot="fab"
          class=${classMap({
            dirty: this._dirty,
          })}
          .label=${this.hass.localize(
            "ui.panel.config.script.editor.save_script"
          )}
          extended
          @click=${this._saveScript}
        >
          <ha-svg-icon slot="icon" .path=${mdiContentSave}></ha-svg-icon>
        </ha-fab>
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

    if (changedProps.has("scriptId") && !this.scriptId && this.hass) {
      const initData = getScriptEditorInitData();
      this._dirty = !!initData;
      const baseConfig: Partial<ScriptConfig> = {
        alias: this.hass.localize("ui.panel.config.script.editor.default_name"),
      };
      if (!initData || !("use_blueprint" in initData)) {
        baseConfig.sequence = [];
      }
      this._config = {
        ...baseConfig,
        ...initData,
      } as ScriptConfig;
      this._readOnly = false;
      this._dirty = true;
    }

    if (changedProps.has("entityId") && this.entityId) {
      getScriptStateConfig(this.hass, this.entityId).then((c) => {
        this._config = this._normalizeConfig(c.config);
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

  private _setEntityId(id?: string) {
    this._entityId = id;
    if (this.hass.states[`script.${this._entityId}`]) {
      this._idError = true;
    } else {
      this._idError = false;
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
      action: this._config.sequence,
    });
    this._validationErrors = (
      Object.entries(validation) as Entries<typeof validation>
    ).map(([key, value]) =>
      value.valid
        ? ""
        : html`${this.hass.localize(
              `ui.panel.config.automation.editor.${key}s.name`
            )}:
            ${value.error}<br />`
    );
  }

  private _normalizeConfig(config: ScriptConfig): ScriptConfig {
    // Normalize data: ensure sequence is a list
    // Happens when people copy paste their scripts into the config
    const value = config.sequence;
    if (value && !Array.isArray(value)) {
      config.sequence = [value];
    }
    config.sequence = migrateAutomationAction(config.sequence);
    return config;
  }

  private async _loadConfig() {
    fetchScriptFileConfig(this.hass, this.scriptId!).then(
      (config) => {
        this._dirty = false;
        this._readOnly = false;
        this._config = this._normalizeConfig(config);
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
        history.back();
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
    if (!ev.detail.isValid) {
      return;
    }
    this._config = ev.detail.value;
    this._errors = undefined;
    this._dirty = true;
  }

  private async confirmUnsavedChanged(): Promise<boolean> {
    if (this._dirty) {
      return showConfirmationDialog(this, {
        title: this.hass!.localize(
          "ui.panel.config.automation.editor.unsaved_confirm_title"
        ),
        text: this.hass!.localize(
          "ui.panel.config.automation.editor.unsaved_confirm_text"
        ),
        confirmText: this.hass!.localize("ui.common.leave"),
        dismissText: this.hass!.localize("ui.common.stay"),
        destructive: true,
      });
    }
    return true;
  }

  private _backTapped = async () => {
    const result = await this.confirmUnsavedChanged();
    if (result) {
      afterNextRender(() => history.back());
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
        ...this._normalizeConfig(result.substituted_config),
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
          title: "Migrate script?",
          text: "You can migrate this script, so it can be edited from the UI. After it is migrated and you have saved it, you will have to manually delete your old script from your configuration. Do you want to migrate this script?",
        })
      : await this.confirmUnsavedChanged();
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
    history.back();
  }

  private _switchUiMode() {
    this._mode = "gui";
  }

  private _switchYamlMode() {
    this._mode = "yaml";
  }

  private async _promptScriptAlias(): Promise<boolean> {
    return new Promise((resolve) => {
      showAutomationRenameDialog(this, {
        config: this._config!,
        domain: "script",
        updateConfig: (config) => {
          this._config = config;
          this._dirty = true;
          this.requestUpdate();
          resolve(true);
        },
        onClose: () => resolve(false),
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

  private async _saveScript(): Promise<void> {
    if (this._idError) {
      showToast(this, {
        message: this.hass.localize(
          "ui.panel.config.script.editor.id_already_exists_save_error"
        ),
        dismissable: false,
        duration: -1,
        action: {
          action: () => {},
          text: this.hass.localize("ui.dialogs.generic.ok"),
        },
      });
      return;
    }

    if (!this.scriptId) {
      const saved = await this._promptScriptAlias();
      if (!saved) {
        return;
      }
      const entityId = this._computeEntityIdFromAlias(this._config!.alias);
      this._setEntityId(entityId);
    }
    const id = this.scriptId || this._entityId || Date.now();

    try {
      await this.hass!.callApi(
        "POST",
        "config/script/config/" + id,
        this._config
      );
    } catch (errors: any) {
      this._errors = errors.body.message || errors.error || errors.body;
      showToast(this, {
        message: errors.body.message || errors.error || errors.body,
      });
      throw errors;
    }

    this._dirty = false;

    if (!this.scriptId) {
      navigate(`/config/script/edit/${id}`, { replace: true });
    }
  }

  protected handleKeyboardSave() {
    this._saveScript();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        p {
          margin-bottom: 0;
        }
        .errors {
          padding: 20px;
          font-weight: bold;
          color: var(--error-color);
        }
        .yaml-mode {
          height: 100%;
          display: flex;
          flex-direction: column;
          padding-bottom: 0;
        }
        .config-container,
        manual-script-editor,
        blueprint-script-editor,
        :not(.yaml-mode) > ha-alert {
          margin: 0 auto;
          max-width: 1040px;
          padding: 28px 20px 0;
          display: block;
        }
        .config-container ha-alert {
          margin-bottom: 16px;
          display: block;
        }
        ha-yaml-editor {
          flex-grow: 1;
          --actions-border-radius: 0;
          --code-mirror-height: 100%;
          min-height: 0;
          display: flex;
          flex-direction: column;
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
        .selected_menu_item {
          color: var(--primary-color);
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
          font-size: 20px;
          font-weight: 400;
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
}
