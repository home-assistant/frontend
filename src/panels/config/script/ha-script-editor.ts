import "@material/mwc-list/mwc-list-item";
import {
  mdiCheck,
  mdiContentDuplicate,
  mdiContentSave,
  mdiDelete,
  mdiDotsVertical,
  mdiFormTextbox,
  mdiInformationOutline,
  mdiPlay,
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
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import { navigate } from "../../../common/navigate";
import { slugify } from "../../../common/string/slugify";
import { computeRTL } from "../../../common/util/compute_rtl";
import { copyToClipboard } from "../../../common/util/copy-clipboard";
import { afterNextRender } from "../../../common/util/render-status";
import "../../../components/ha-button-menu";
import "../../../components/ha-card";
import "../../../components/ha-fab";
import type {
  HaFormDataContainer,
  SchemaUnion,
} from "../../../components/ha-form/types";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import "../../../components/ha-yaml-editor";
import type { HaYamlEditor } from "../../../components/ha-yaml-editor";
import { validateConfig } from "../../../data/config";
import { UNAVAILABLE } from "../../../data/entity";
import { EntityRegistryEntry } from "../../../data/entity_registry";
import {
  MODES,
  MODES_MAX,
  ScriptConfig,
  deleteScript,
  fetchScriptFileConfig,
  getScriptEditorInitData,
  getScriptStateConfig,
  isMaxMode,
  showScriptEditor,
  triggerScript,
} from "../../../data/script";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-subpage";
import { KeyboardShortcutMixin } from "../../../mixins/keyboard-shortcut-mixin";
import { haStyle } from "../../../resources/styles";
import type { Entries, HomeAssistant, Route } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import { showToast } from "../../../util/toast";
import "./blueprint-script-editor";
import "./manual-script-editor";
import type { HaManualScriptEditor } from "./manual-script-editor";

export class HaScriptEditor extends KeyboardShortcutMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public scriptId: string | null = null;

  @property() public entityId: string | null = null;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ attribute: false }) public entityRegistry!: EntityRegistryEntry[];

  @state() private _config?: ScriptConfig;

  @state() private _entityId?: string;

  @state() private _idError = false;

  @state() private _dirty = false;

  @state() private _errors?: string;

  @state() private _mode: "gui" | "yaml" = "gui";

  @state() private _readOnly = false;

  @query("ha-yaml-editor") private _yamlEditor?: HaYamlEditor;

  @query("manual-script-editor")
  private _manualEditor?: HaManualScriptEditor;

  @state() private _validationErrors?: (string | TemplateResult)[];

  private _schema = memoizeOne(
    (
      hasID: boolean,
      useBluePrint?: boolean,
      currentMode?: (typeof MODES)[number]
    ) =>
      [
        {
          name: "alias",
          selector: {
            text: {
              type: "text",
            },
          },
        },
        {
          name: "icon",
          selector: {
            icon: {},
          },
        },
        ...(!hasID
          ? ([
              {
                name: "id",
                selector: {
                  text: {
                    prefix: "script.",
                  },
                },
              },
            ] as const)
          : []),
        ...(!useBluePrint
          ? ([
              {
                name: "mode",
                selector: {
                  select: {
                    mode: "dropdown",
                    options: MODES.map((mode) => ({
                      label: this.hass.localize(
                        `ui.panel.config.script.editor.modes.${mode}`
                      ),
                      value: mode,
                    })),
                  },
                },
              },
            ] as const)
          : []),
        ...(currentMode && isMaxMode(currentMode)
          ? ([
              {
                name: "max",
                required: true,
                selector: {
                  number: { mode: "box", min: 1, max: Infinity },
                },
              },
            ] as const)
          : []),
      ] as const
  );

  protected render() {
    if (!this._config) {
      return nothing;
    }

    const stateObj = this._entityId
      ? this.hass.states[this._entityId]
      : undefined;

    const useBlueprint = "use_blueprint" in this._config;

    const schema = this._schema(
      !!this.scriptId,
      useBlueprint,
      this._config.mode
    );

    const data = {
      ...(!this._config.mode && !useBlueprint && { mode: MODES[0] }),
      icon: undefined,
      max: this._config.mode && isMaxMode(this._config.mode) ? 10 : undefined,
      ...this._config,
      id: this._entityId,
    };

    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .backCallback=${this._backTapped}
        .header=${!this._config?.alias ? "" : this._config.alias}
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

          <mwc-list-item
            graphic="icon"
            .disabled=${!this.scriptId}
            @click=${this._showInfo}
          >
            ${this.hass.localize("ui.panel.config.script.editor.show_info")}
            <ha-svg-icon
              slot="graphic"
              .path=${mdiInformationOutline}
            ></ha-svg-icon>
          </mwc-list-item>

          <mwc-list-item
            graphic="icon"
            .disabled=${!this.scriptId}
            @click=${this._runScript}
          >
            ${this.hass.localize("ui.panel.config.script.picker.run_script")}
            <ha-svg-icon slot="graphic" .path=${mdiPlay}></ha-svg-icon>
          </mwc-list-item>

          ${!useBlueprint && !("fields" in this._config)
            ? html`
                <mwc-list-item graphic="icon" @click=${this._addFields}>
                  ${this.hass.localize(
                    "ui.panel.config.script.editor.field.add_fields"
                  )}
                  <ha-svg-icon
                    slot="graphic"
                    .path=${mdiFormTextbox}
                  ></ha-svg-icon>
                </mwc-list-item>
              `
            : nothing}
          ${this.scriptId && this.narrow
            ? html`
                <a href="/config/script/trace/${this.scriptId}">
                  <mwc-list-item graphic="icon">
                    ${this.hass.localize(
                      "ui.panel.config.script.editor.show_trace"
                    )}
                    <ha-svg-icon
                      slot="graphic"
                      .path=${mdiTransitConnection}
                    ></ha-svg-icon>
                  </mwc-list-item>
                </a>
              `
            : ""}

          <li divider role="separator"></li>

          <mwc-list-item graphic="icon" @click=${this._switchUiMode}>
            ${this.hass.localize("ui.panel.config.automation.editor.edit_ui")}
            ${this._mode === "gui"
              ? html`
                  <ha-svg-icon
                    class="selected_menu_item"
                    slot="graphic"
                    .path=${mdiCheck}
                  ></ha-svg-icon>
                `
              : ``}
          </mwc-list-item>
          <mwc-list-item graphic="icon" @click=${this._switchYamlMode}>
            ${this.hass.localize("ui.panel.config.automation.editor.edit_yaml")}
            ${this._mode === "yaml"
              ? html`
                  <ha-svg-icon
                    class="selected_menu_item"
                    slot="graphic"
                    .path=${mdiCheck}
                  ></ha-svg-icon>
                `
              : ``}
          </mwc-list-item>

          <li divider role="separator"></li>

          <mwc-list-item
            .disabled=${!this._readOnly && !this.scriptId}
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
          </mwc-list-item>

          <mwc-list-item
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
          </mwc-list-item>
        </ha-button-menu>
        <div
          class="content ${classMap({
            "yaml-mode": this._mode === "yaml",
          })}"
        >
          ${this._errors || stateObj?.state === UNAVAILABLE
            ? html`
                <ha-alert
                  alert-type="error"
                  .title=${stateObj?.state === UNAVAILABLE
                    ? this.hass.localize(
                        "ui.panel.config.script.editor.unavailable"
                      )
                    : undefined}
                >
                  ${this._errors || this._validationErrors}
                </ha-alert>
              `
            : ""}
          ${this._readOnly
            ? html`<ha-alert alert-type="warning">
                ${this.hass.localize("ui.panel.config.script.editor.read_only")}
                <mwc-button slot="action" @click=${this._duplicate}>
                  ${this.hass.localize("ui.panel.config.script.editor.migrate")}
                </mwc-button>
              </ha-alert>`
            : ""}
          ${this._mode === "gui"
            ? html`
                <div
                  class=${classMap({
                    rtl: computeRTL(this.hass),
                  })}
                >
                  ${this._config
                    ? html`
                        <div class="config-container">
                          <ha-card outlined>
                            <div class="card-content">
                              <ha-form
                                .schema=${schema}
                                .data=${data}
                                .hass=${this.hass}
                                .disabled=${this._readOnly}
                                .computeLabel=${this._computeLabelCallback}
                                .computeHelper=${this._computeHelperCallback}
                                @value-changed=${this._valueChanged}
                              ></ha-form>
                            </div>
                          </ha-card>
                        </div>

                        ${useBlueprint
                          ? html`
                              <blueprint-script-editor
                                .hass=${this.hass}
                                .narrow=${this.narrow}
                                .isWide=${this.isWide}
                                .config=${this._config}
                                .disabled=${this._readOnly}
                                @duplicate=${this._duplicate}
                                @value-changed=${this._configChanged}
                              ></blueprint-script-editor>
                            `
                          : html`
                              <manual-script-editor
                                .hass=${this.hass}
                                .narrow=${this.narrow}
                                .isWide=${this.isWide}
                                .config=${this._config}
                                .disabled=${this._readOnly}
                                @duplicate=${this._duplicate}
                                @value-changed=${this._configChanged}
                              ></manual-script-editor>
                            `}
                      `
                    : ""}
                </div>
              `
            : this._mode === "yaml"
            ? html`
                <ha-yaml-editor
                  .hass=${this.hass}
                  .defaultValue=${this._preprocessYaml()}
                  .readOnly=${this._readOnly}
                  @value-changed=${this._yamlChanged}
                ></ha-yaml-editor>
                <ha-card outlined>
                  <div class="card-actions">
                    <mwc-button @click=${this._copyYaml}>
                      ${this.hass.localize(
                        "ui.panel.config.automation.editor.copy_to_clipboard"
                      )}
                    </mwc-button>
                  </div>
                </ha-card>
              `
            : ``}
        </div>
        <ha-fab
          slot="fab"
          .label=${this.hass.localize(
            "ui.panel.config.script.editor.save_script"
          )}
          extended
          @click=${this._saveScript}
          class=${classMap({
            dirty: this._dirty,
          })}
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
      fetchScriptFileConfig(this.hass, this.scriptId).then(
        (config) => {
          this._dirty = false;
          this._readOnly = false;
          this._config = this._normalizeConfig(config);
          const entity = this.entityRegistry.find(
            (ent) =>
              ent.platform === "script" && ent.unique_id === this.scriptId
          );
          this._entityId = entity?.entity_id;
          this._checkValidation();
        },
        (resp) => {
          const entity = this.entityRegistry.find(
            (ent) =>
              ent.platform === "script" && ent.unique_id === this.scriptId
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
                  "err_no",
                  resp.status_code || resp.code
                )
          );
          history.back();
        }
      );
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

  private _normalizeConfig(config: ScriptConfig): ScriptConfig {
    // Normalize data: ensure sequence is a list
    // Happens when people copy paste their scripts into the config
    const value = config.sequence;
    if (value && !Array.isArray(value)) {
      config.sequence = [value];
    }
    return config;
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
              `ui.panel.config.automation.editor.${key}s.header`
            )}:
            ${value.error}<br />`
    );
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>,
    data: HaFormDataContainer
  ): string => {
    switch (schema.name) {
      case "mode":
        return this.hass.localize("ui.panel.config.script.editor.modes.label");
      case "max":
        // Mode must be one of max modes per schema definition above
        return this.hass.localize(
          `ui.panel.config.script.editor.max.${
            data.mode as (typeof MODES_MAX)[number]
          }`
        );
      default:
        return this.hass.localize(
          `ui.panel.config.script.editor.${schema.name}`
        );
    }
  };

  private _computeHelperCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ): string | undefined | TemplateResult => {
    if (schema.name === "mode") {
      return html`
        <a
          style="color: var(--secondary-text-color)"
          href=${documentationUrl(
            this.hass,
            "/integrations/script/#script-modes"
          )}
          target="_blank"
          rel="noreferrer"
          >${this.hass.localize(
            "ui.panel.config.script.editor.modes.learn_more"
          )}</a
        >
      `;
    }
    return undefined;
  };

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

  private async _runScript(ev: CustomEvent) {
    ev.stopPropagation();
    await triggerScript(this.hass, this.scriptId!);
    showToast(this, {
      message: this.hass.localize(
        "ui.notification_toast.triggered",
        "name",
        this._config!.alias
      ),
    });
  }

  private _computeEntityIdFromAlias(alias: string) {
    const aliasSlugify = slugify(alias);
    let id = aliasSlugify;
    let i = 2;
    while (this.hass.states[`script.${id}`]) {
      id = `${aliasSlugify}_${i}`;
      i++;
    }
    return id;
  }

  private _setEntityId(id?: string) {
    this._entityId = id;
    if (this.hass.states[`script.${this._entityId}`]) {
      this._idError = true;
    } else {
      this._idError = false;
    }
  }

  private updateEntityId(
    newId: string | undefined,
    newAlias: string | undefined
  ) {
    const currentAlias = this._config?.alias ?? "";
    const currentEntityId = this._entityId ?? "";

    if (newId !== this._entityId) {
      this._setEntityId(newId || undefined);
      return;
    }

    const currentComputedEntity = this._computeEntityIdFromAlias(currentAlias);

    if (currentComputedEntity === currentEntityId || !this._entityId) {
      const newComputedId = newAlias
        ? this._computeEntityIdFromAlias(newAlias)
        : undefined;

      this._setEntityId(newComputedId);
    }
  }

  private _addFields() {
    if ("fields" in this._config!) {
      return;
    }
    this._manualEditor?.addFields();
    this._dirty = true;
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    if (this._readOnly) {
      return;
    }
    this._errors = undefined;
    const values = ev.detail.value as any;

    let changed = false;
    const newValues: Omit<ScriptConfig, "sequence"> = {
      alias: values.alias ?? "",
      icon: values.icon,
      mode: values.mode,
      max: isMaxMode(values.mode) ? values.max : undefined,
    };

    if (!this.scriptId) {
      this.updateEntityId(values.id, values.alias);
    }

    for (const key of Object.keys(newValues)) {
      const value = newValues[key];

      if (value === this._config![key]) {
        continue;
      }
      if (value === undefined) {
        const newConfig = { ...this._config! };
        delete newConfig![key];
        this._config = newConfig;
      } else {
        this._config = { ...this._config!, [key]: value };
      }
      changed = true;
    }

    if (changed) {
      this._dirty = true;
    }
  }

  private _configChanged(ev) {
    this._config = ev.detail.value;
    this._errors = undefined;
    this._dirty = true;
  }

  private _preprocessYaml() {
    return this._config;
  }

  private async _copyYaml(): Promise<void> {
    if (this._yamlEditor?.yaml) {
      await copyToClipboard(this._yamlEditor.yaml);
      showToast(this, {
        message: this.hass.localize("ui.common.copied_clipboard"),
      });
    }
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
      dismissText: this.hass!.localize("ui.common.cancel"),
      confirm: () => this._delete(),
      destructive: true,
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

  private async _saveScript(): Promise<void> {
    if (this._idError) {
      showToast(this, {
        message: this.hass.localize(
          "ui.panel.config.script.editor.id_already_exists_save_error"
        ),
        dismissable: false,
        duration: 0,
        action: {
          action: () => {},
          text: this.hass.localize("ui.dialogs.generic.ok"),
        },
      });
      return;
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
        ha-card {
          overflow: hidden;
        }
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
        blueprint-script-editor {
          margin: 0 auto;
          max-width: 1040px;
          padding: 28px 20px 0;
        }
        .config-container ha-alert {
          margin-bottom: 16px;
          display: block;
        }
        ha-yaml-editor {
          flex-grow: 1;
          --code-mirror-height: 100%;
          min-height: 0;
        }
        .yaml-mode ha-card {
          overflow: initial;
          --ha-card-border-radius: 0;
          border-bottom: 1px solid var(--divider-color);
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
