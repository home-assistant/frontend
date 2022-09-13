import "@material/mwc-list/mwc-list-item";
import {
  mdiCheck,
  mdiContentDuplicate,
  mdiContentSave,
  mdiDelete,
  mdiDotsVertical,
  mdiInformationOutline,
  mdiPlay,
  mdiSort,
  mdiTransitConnection,
} from "@mdi/js";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeObjectId } from "../../../common/entity/compute_object_id";
import { navigate } from "../../../common/navigate";
import { slugify } from "../../../common/string/slugify";
import { computeRTL } from "../../../common/util/compute_rtl";
import { copyToClipboard } from "../../../common/util/copy-clipboard";
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
import {
  deleteScript,
  getScriptConfig,
  getScriptEditorInitData,
  isMaxMode,
  MODES,
  MODES_MAX,
  ScriptConfig,
  showScriptEditor,
  triggerScript,
} from "../../../data/script";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/ha-app-layout";
import "../../../layouts/hass-subpage";
import { KeyboardShortcutMixin } from "../../../mixins/keyboard-shortcut-mixin";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant, Route } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import { showToast } from "../../../util/toast";
import { HaDeviceAction } from "../automation/action/types/ha-automation-action-device_id";
import "./blueprint-script-editor";
import "./manual-script-editor";
import type { HaManualScriptEditor } from "./manual-script-editor";

export class HaScriptEditor extends KeyboardShortcutMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public scriptEntityId: string | null = null;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow!: boolean;

  @state() private _config?: ScriptConfig;

  @state() private _entityId?: string;

  @state() private _idError = false;

  @state() private _dirty = false;

  @state() private _errors?: string;

  @state() private _mode: "gui" | "yaml" = "gui";

  @query("ha-yaml-editor", true) private _yamlEditor?: HaYamlEditor;

  @query("manual-script-editor")
  private _manualEditor?: HaManualScriptEditor;

  private _schema = memoizeOne(
    (
      hasID: boolean,
      useBluePrint?: boolean,
      currentMode?: typeof MODES[number]
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
                  text: {},
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

  protected render(): TemplateResult {
    if (!this._config) {
      return html``;
    }

    const schema = this._schema(
      !!this.scriptEntityId,
      "use_blueprint" in this._config,
      this._config.mode
    );

    const data = {
      mode: MODES[0],
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
        ${this.scriptEntityId && !this.narrow
          ? html`
              <mwc-button @click=${this._showTrace} slot="toolbar-icon">
                ${this.hass.localize(
                  "ui.panel.config.script.editor.show_trace"
                )}
              </mwc-button>
            `
          : ""}
        <ha-button-menu corner="BOTTOM_START" slot="toolbar-icon">
          <ha-icon-button
            slot="trigger"
            .label=${this.hass.localize("ui.common.menu")}
            .path=${mdiDotsVertical}
          ></ha-icon-button>

          <mwc-list-item
            graphic="icon"
            .disabled=${!this.scriptEntityId}
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
            .disabled=${!this.scriptEntityId}
            @click=${this._runScript}
          >
            ${this.hass.localize("ui.panel.config.script.picker.run_script")}
            <ha-svg-icon slot="graphic" .path=${mdiPlay}></ha-svg-icon>
          </mwc-list-item>

          ${this.scriptEntityId && this.narrow
            ? html`
                <a href="/config/script/trace/${this.scriptEntityId}">
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
          ${this._config && !("use_blueprint" in this._config)
            ? html`
                <mwc-list-item
                  aria-label=${this.hass.localize(
                    "ui.panel.config.automation.editor.re_order"
                  )}
                  graphic="icon"
                  .disabled=${this._mode !== "gui"}
                  @click=${this._toggleReOrderMode}
                >
                  ${this.hass.localize(
                    "ui.panel.config.automation.editor.re_order"
                  )}
                  <ha-svg-icon slot="graphic" .path=${mdiSort}></ha-svg-icon>
                </mwc-list-item>
              `
            : ""}

          <li divider role="separator"></li>

          <mwc-list-item
            aria-label=${this.hass.localize(
              "ui.panel.config.automation.editor.edit_ui"
            )}
            graphic="icon"
            @click=${this._switchUiMode}
          >
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
          <mwc-list-item
            aria-label=${this.hass.localize(
              "ui.panel.config.automation.editor.edit_yaml"
            )}
            graphic="icon"
            @click=${this._switchYamlMode}
          >
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
            .disabled=${!this.scriptEntityId}
            .label=${this.hass.localize(
              "ui.panel.config.script.picker.duplicate"
            )}
            graphic="icon"
            @click=${this._duplicate}
          >
            ${this.hass.localize("ui.panel.config.script.picker.duplicate")}
            <ha-svg-icon
              slot="graphic"
              .path=${mdiContentDuplicate}
            ></ha-svg-icon>
          </mwc-list-item>

          <mwc-list-item
            .disabled=${!this.scriptEntityId}
            aria-label=${this.hass.localize(
              "ui.panel.config.script.picker.delete"
            )}
            class=${classMap({ warning: Boolean(this.scriptEntityId) })}
            graphic="icon"
            @click=${this._deleteConfirm}
          >
            ${this.hass.localize("ui.panel.config.script.picker.delete")}
            <ha-svg-icon
              class=${classMap({ warning: Boolean(this.scriptEntityId) })}
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
          ${this._errors ? html`<div class="errors">${this._errors}</div>` : ""}
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
                                .computeLabel=${this._computeLabelCallback}
                                .computeHelper=${this._computeHelperCallback}
                                @value-changed=${this._valueChanged}
                              ></ha-form>
                            </div>
                          </ha-card>
                        </div>

                        ${"use_blueprint" in this._config
                          ? html`
                              <blueprint-script-editor
                                .hass=${this.hass}
                                .narrow=${this.narrow}
                                .isWide=${this.isWide}
                                .config=${this._config}
                                @value-changed=${this._configChanged}
                              ></blueprint-script-editor>
                            `
                          : html`
                              <manual-script-editor
                                .hass=${this.hass}
                                .narrow=${this.narrow}
                                .isWide=${this.isWide}
                                .config=${this._config}
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

    const oldScript = changedProps.get("scriptEntityId");
    if (
      changedProps.has("scriptEntityId") &&
      this.scriptEntityId &&
      this.hass &&
      // Only refresh config if we picked a new script. If same ID, don't fetch it.
      (!oldScript || oldScript !== this.scriptEntityId)
    ) {
      getScriptConfig(this.hass, computeObjectId(this.scriptEntityId)).then(
        (config) => {
          // Normalize data: ensure sequence is a list
          // Happens when people copy paste their scripts into the config
          const value = config.sequence;
          if (value && !Array.isArray(value)) {
            config.sequence = [value];
          }
          this._dirty = false;
          this._config = config;
        },
        (resp) => {
          alert(
            resp.status_code === 404
              ? this.hass.localize(
                  "ui.panel.config.script.editor.load_error_not_editable"
                )
              : this.hass.localize(
                  "ui.panel.config.script.editor.load_error_unknown",
                  "err_no",
                  resp.status_code
                )
          );
          history.back();
        }
      );
    }

    if (
      changedProps.has("scriptEntityId") &&
      !this.scriptEntityId &&
      this.hass
    ) {
      const initData = getScriptEditorInitData();
      this._dirty = !!initData;
      const baseConfig: Partial<ScriptConfig> = {
        alias: this.hass.localize("ui.panel.config.script.editor.default_name"),
      };
      if (!initData || !("use_blueprint" in initData)) {
        baseConfig.sequence = [{ ...HaDeviceAction.defaultConfig }];
      }
      this._config = {
        ...baseConfig,
        ...initData,
      } as ScriptConfig;
    }
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
            data.mode as typeof MODES_MAX[number]
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
    if (!this.scriptEntityId) {
      return;
    }
    fireEvent(this, "hass-more-info", { entityId: this.scriptEntityId });
  }

  private async _showTrace() {
    if (this.scriptEntityId) {
      const result = await this.confirmUnsavedChanged();
      if (result) {
        navigate(`/config/script/trace/${this.scriptEntityId}`);
      }
    }
  }

  private async _runScript(ev: CustomEvent) {
    ev.stopPropagation();
    await triggerScript(this.hass, this.scriptEntityId as string);
    showToast(this, {
      message: this.hass.localize(
        "ui.notification_toast.triggered",
        "name",
        this._config!.alias
      ),
    });
  }

  private _modeChanged(mode) {
    const curMode = this._config!.mode || MODES[0];

    if (mode === curMode) {
      return;
    }

    this._config = { ...this._config!, mode };
    if (!isMaxMode(mode)) {
      delete this._config.max;
    }
    this._dirty = true;
  }

  private _aliasChanged(alias: string) {
    if (
      this.scriptEntityId ||
      (this._entityId && this._entityId !== slugify(this._config!.alias))
    ) {
      return;
    }

    const aliasSlugify = slugify(alias);
    let id = aliasSlugify;
    let i = 2;
    while (this.hass.states[`script.${id}`]) {
      id = `${aliasSlugify}_${i}`;
      i++;
    }

    this._entityId = id;
  }

  private _idChanged(id: string) {
    this._entityId = id;
    if (this.hass.states[`script.${this._entityId}`]) {
      this._idError = true;
    } else {
      this._idError = false;
    }
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const values = ev.detail.value as any;
    const currentId = this._entityId;
    let changed = false;

    for (const key of Object.keys(values)) {
      if (key === "sequence") {
        continue;
      }

      const value = values[key];

      if (
        value === this._config![key] ||
        (key === "id" && currentId === value)
      ) {
        continue;
      }

      changed = true;

      switch (key) {
        case "id":
          this._idChanged(value);
          break;
        case "alias":
          this._aliasChanged(value);
          break;
        case "mode":
          this._modeChanged(value);
          break;
      }

      if (values[key] === undefined) {
        const newConfig = { ...this._config! };
        delete newConfig![key];
        this._config = newConfig;
      } else {
        this._config = { ...this._config!, [key]: value };
      }
    }

    if (changed) {
      this._dirty = true;
    }
  }

  private _configChanged(ev) {
    this._config = ev.detail.value;
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
        text: this.hass!.localize(
          "ui.panel.config.automation.editor.unsaved_confirm"
        ),
        confirmText: this.hass!.localize("ui.common.leave"),
        dismissText: this.hass!.localize("ui.common.stay"),
      });
    }
    return true;
  }

  private _backTapped = async () => {
    const result = await this.confirmUnsavedChanged();
    if (result) {
      history.back();
    }
  };

  private async _duplicate() {
    const result = await this.confirmUnsavedChanged();
    if (result) {
      showScriptEditor({
        ...this._config,
        alias: `${this._config?.alias} (${this.hass.localize(
          "ui.panel.config.script.picker.duplicate"
        )})`,
      });
    }
  }

  private async _deleteConfirm() {
    showConfirmationDialog(this, {
      text: this.hass.localize("ui.panel.config.script.editor.delete_confirm"),
      confirmText: this.hass!.localize("ui.common.delete"),
      dismissText: this.hass!.localize("ui.common.cancel"),
      confirm: () => this._delete(),
    });
  }

  private async _delete() {
    await deleteScript(
      this.hass,
      computeObjectId(this.scriptEntityId as string)
    );
    history.back();
  }

  private _switchUiMode() {
    this._mode = "gui";
  }

  private _switchYamlMode() {
    this._mode = "yaml";
  }

  private _toggleReOrderMode() {
    if (this._manualEditor) {
      this._manualEditor.reOrderMode = !this._manualEditor.reOrderMode;
    }
  }

  private _saveScript(): void {
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
    const id = this.scriptEntityId
      ? computeObjectId(this.scriptEntityId)
      : this._entityId || Date.now();
    this.hass!.callApi("POST", "config/script/config/" + id, this._config).then(
      () => {
        this._dirty = false;

        if (!this.scriptEntityId) {
          navigate(`/config/script/edit/${id}`, { replace: true });
        }
      },
      (errors) => {
        this._errors = errors.body.message || errors.error || errors.body;
        showToast(this, {
          message: errors.body.message || errors.error || errors.body,
        });
        throw errors;
      }
    );
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
