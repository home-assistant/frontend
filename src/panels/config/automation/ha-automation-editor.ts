import "@material/mwc-button";
import "@material/mwc-list/mwc-list-item";
import {
  mdiCheck,
  mdiContentDuplicate,
  mdiContentSave,
  mdiDebugStepOver,
  mdiDelete,
  mdiDotsVertical,
  mdiInformationOutline,
  mdiPlay,
  mdiPlayCircleOutline,
  mdiRenameBox,
  mdiRobotConfused,
  mdiStopCircleOutline,
  mdiTransitConnection,
} from "@mdi/js";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
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
import { copyToClipboard } from "../../../common/util/copy-clipboard";
import { afterNextRender } from "../../../common/util/render-status";
import "../../../components/ha-button-menu";
import "../../../components/ha-card";
import "../../../components/ha-fab";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import "../../../components/ha-yaml-editor";
import type { HaYamlEditor } from "../../../components/ha-yaml-editor";
import {
  AutomationConfig,
  AutomationEntity,
  deleteAutomation,
  fetchAutomationFileConfig,
  getAutomationEditorInitData,
  getAutomationStateConfig,
  saveAutomationConfig,
  showAutomationEditor,
  triggerAutomationActions,
} from "../../../data/automation";
import { validateConfig } from "../../../data/config";
import { UNAVAILABLE } from "../../../data/entity";
import { fetchEntityRegistry } from "../../../data/entity_registry";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-subpage";
import { KeyboardShortcutMixin } from "../../../mixins/keyboard-shortcut-mixin";
import { haStyle } from "../../../resources/styles";
import { Entries, HomeAssistant, Route } from "../../../types";
import { showToast } from "../../../util/toast";
import "../ha-config-section";
import { showAutomationModeDialog } from "./automation-mode-dialog/show-dialog-automation-mode";
import { showAutomationRenameDialog } from "./automation-rename-dialog/show-dialog-automation-rename";
import "./blueprint-automation-editor";
import "./manual-automation-editor";

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
    duplicate: undefined;
    "re-order": undefined;
  }
}

export class HaAutomationEditor extends KeyboardShortcutMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public automationId: string | null = null;

  @property() public entityId: string | null = null;

  @property() public automations!: AutomationEntity[];

  @property() public isWide?: boolean;

  @property() public narrow!: boolean;

  @property() public route!: Route;

  @state() private _config?: AutomationConfig;

  @state() private _dirty = false;

  @state() private _errors?: string;

  @state() private _entityId?: string;

  @state() private _mode: "gui" | "yaml" = "gui";

  @state() private _readOnly = false;

  @state() private _validationErrors?: (string | TemplateResult)[];

  @query("ha-yaml-editor", true) private _yamlEditor?: HaYamlEditor;

  private _configSubscriptions: Record<
    string,
    (config?: AutomationConfig) => void
  > = {};

  private _configSubscriptionsId = 1;

  protected render(): TemplateResult {
    const stateObj = this._entityId
      ? this.hass.states[this._entityId]
      : undefined;
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .backCallback=${this._backTapped}
        .header=${!this._config
          ? ""
          : this._config.alias ||
            this.hass.localize(
              "ui.panel.config.automation.editor.default_name"
            )}
      >
        ${this._config?.id && !this.narrow
          ? html`
              <mwc-button @click=${this._showTrace} slot="toolbar-icon">
                ${this.hass.localize(
                  "ui.panel.config.automation.editor.show_trace"
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
            .disabled=${!stateObj}
            @click=${this._showInfo}
          >
            ${this.hass.localize("ui.panel.config.automation.editor.show_info")}
            <ha-svg-icon
              slot="graphic"
              .path=${mdiInformationOutline}
            ></ha-svg-icon>
          </mwc-list-item>

          <mwc-list-item
            graphic="icon"
            .disabled=${!stateObj}
            @click=${this._runActions}
          >
            ${this.hass.localize("ui.panel.config.automation.editor.run")}
            <ha-svg-icon slot="graphic" .path=${mdiPlay}></ha-svg-icon>
          </mwc-list-item>

          ${stateObj && this._config && this.narrow
            ? html`<a href="/config/automation/trace/${this._config.id}">
                <mwc-list-item graphic="icon">
                  ${this.hass.localize(
                    "ui.panel.config.automation.editor.show_trace"
                  )}
                  <ha-svg-icon
                    slot="graphic"
                    .path=${mdiTransitConnection}
                  ></ha-svg-icon>
                </mwc-list-item>
              </a>`
            : ""}

          <mwc-list-item
            graphic="icon"
            @click=${this._promptAutomationAlias}
            .disabled=${!this.automationId || this._mode === "yaml"}
          >
            ${this.hass.localize("ui.panel.config.automation.editor.rename")}
            <ha-svg-icon slot="graphic" .path=${mdiRenameBox}></ha-svg-icon>
          </mwc-list-item>

          ${this._config && !("use_blueprint" in this._config)
            ? html`
                <mwc-list-item
                  graphic="icon"
                  @click=${this._promptAutomationMode}
                  .disabled=${this._readOnly || this._mode === "yaml"}
                >
                  ${this.hass.localize(
                    "ui.panel.config.automation.editor.change_mode"
                  )}
                  <ha-svg-icon
                    slot="graphic"
                    .path=${mdiDebugStepOver}
                  ></ha-svg-icon>
                </mwc-list-item>
              `
            : ""}

          <mwc-list-item
            .disabled=${!this._readOnly && !this.automationId}
            graphic="icon"
            @click=${this._duplicate}
          >
            ${this.hass.localize(
              this._readOnly
                ? "ui.panel.config.automation.editor.migrate"
                : "ui.panel.config.automation.editor.duplicate"
            )}
            <ha-svg-icon
              slot="graphic"
              .path=${mdiContentDuplicate}
            ></ha-svg-icon>
          </mwc-list-item>

          <li divider role="separator"></li>

          <mwc-list-item graphic="icon" @click=${this._switchUiMode}>
            ${this.hass.localize("ui.panel.config.automation.editor.edit_ui")}
            ${this._mode === "gui"
              ? html`<ha-svg-icon
                  class="selected_menu_item"
                  slot="graphic"
                  .path=${mdiCheck}
                ></ha-svg-icon>`
              : ``}
          </mwc-list-item>
          <mwc-list-item graphic="icon" @click=${this._switchYamlMode}>
            ${this.hass.localize("ui.panel.config.automation.editor.edit_yaml")}
            ${this._mode === "yaml"
              ? html`<ha-svg-icon
                  class="selected_menu_item"
                  slot="graphic"
                  .path=${mdiCheck}
                ></ha-svg-icon>`
              : ``}
          </mwc-list-item>

          <li divider role="separator"></li>

          <mwc-list-item
            graphic="icon"
            .disabled=${!stateObj}
            @click=${this._toggle}
          >
            ${stateObj?.state === "off"
              ? this.hass.localize("ui.panel.config.automation.editor.enable")
              : this.hass.localize("ui.panel.config.automation.editor.disable")}
            <ha-svg-icon
              slot="graphic"
              .path=${stateObj?.state === "off"
                ? mdiPlayCircleOutline
                : mdiStopCircleOutline}
            ></ha-svg-icon>
          </mwc-list-item>

          <mwc-list-item
            .disabled=${!this.automationId}
            class=${classMap({ warning: Boolean(this.automationId) })}
            graphic="icon"
            @click=${this._deleteConfirm}
          >
            ${this.hass.localize("ui.panel.config.automation.picker.delete")}
            <ha-svg-icon
              class=${classMap({ warning: Boolean(this.automationId) })}
              slot="graphic"
              .path=${mdiDelete}
            >
            </ha-svg-icon>
          </mwc-list-item>
        </ha-button-menu>

        ${this._config
          ? html`
              <div
                class="content ${classMap({
                  "yaml-mode": this._mode === "yaml",
                })}"
                @subscribe-automation-config=${this._subscribeAutomationConfig}
              >
                ${this._errors || stateObj?.state === UNAVAILABLE
                  ? html`<ha-alert
                      alert-type="error"
                      .title=${stateObj?.state === UNAVAILABLE
                        ? this.hass.localize(
                            "ui.panel.config.automation.editor.unavailable"
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
                ${this._mode === "gui"
                  ? "use_blueprint" in this._config
                    ? html`
                        <blueprint-automation-editor
                          .hass=${this.hass}
                          .narrow=${this.narrow}
                          .isWide=${this.isWide}
                          .stateObj=${stateObj}
                          .config=${this._config}
                          .disabled=${Boolean(this._readOnly)}
                          @value-changed=${this._valueChanged}
                          @duplicate=${this._duplicate}
                        ></blueprint-automation-editor>
                      `
                    : html`
                        <manual-automation-editor
                          .hass=${this.hass}
                          .narrow=${this.narrow}
                          .isWide=${this.isWide}
                          .stateObj=${stateObj}
                          .config=${this._config}
                          .disabled=${Boolean(this._readOnly)}
                          @value-changed=${this._valueChanged}
                          @duplicate=${this._duplicate}
                        ></manual-automation-editor>
                      `
                  : this._mode === "yaml"
                  ? html`
                      ${this._readOnly
                        ? html`<ha-alert alert-type="warning">
                            ${this.hass.localize(
                              "ui.panel.config.automation.editor.read_only"
                            )}
                            <mwc-button slot="action" @click=${this._duplicate}>
                              ${this.hass.localize(
                                "ui.panel.config.automation.editor.migrate"
                              )}
                            </mwc-button>
                          </ha-alert>`
                        : ""}
                      ${stateObj?.state === "off"
                        ? html`
                            <ha-alert alert-type="info">
                              ${this.hass.localize(
                                "ui.panel.config.automation.editor.disabled"
                              )}
                              <mwc-button slot="action" @click=${this._toggle}>
                                ${this.hass.localize(
                                  "ui.panel.config.automation.editor.enable"
                                )}
                              </mwc-button>
                            </ha-alert>
                          `
                        : ""}
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
            `
          : ""}
        <ha-fab
          slot="fab"
          class=${classMap({ dirty: this._dirty })}
          .label=${this.hass.localize("ui.panel.config.automation.editor.save")}
          extended
          @click=${this._saveAutomation}
        >
          <ha-svg-icon slot="icon" .path=${mdiContentSave}></ha-svg-icon>
        </ha-fab>
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
      let baseConfig: Partial<AutomationConfig> = { description: "" };
      if (!initData || !("use_blueprint" in initData)) {
        baseConfig = {
          ...baseConfig,
          mode: "single",
          trigger: [],
          condition: [],
          action: [],
        };
      }
      this._config = {
        ...baseConfig,
        ...initData,
      } as AutomationConfig;
      this._entityId = undefined;
      this._readOnly = false;
      this._dirty = true;
    }

    if (changedProps.has("entityId") && this.entityId) {
      getAutomationStateConfig(this.hass, this.entityId).then((c) => {
        this._config = this._normalizeConfig(c.config);
        this._checkValidation();
      });
      this._entityId = this.entityId;
      this._dirty = false;
      this._readOnly = true;
    }

    if (
      changedProps.has("automations") &&
      this.automationId &&
      !this._entityId
    ) {
      this._setEntityId();
    }

    if (changedProps.has("_config")) {
      Object.values(this._configSubscriptions).forEach((sub) =>
        sub(this._config)
      );
    }
  }

  private _setEntityId() {
    const automation = this.automations.find(
      (entity: AutomationEntity) => entity.attributes.id === this.automationId
    );
    this._entityId = automation?.entity_id;
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
      trigger: this._config.trigger,
      condition: this._config.condition,
      action: this._config.action,
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

  private _normalizeConfig(config: AutomationConfig): AutomationConfig {
    // Normalize data: ensure trigger, action and condition are lists
    // Happens when people copy paste their automations into the config
    for (const key of ["trigger", "condition", "action"]) {
      const value = config[key];
      if (value && !Array.isArray(value)) {
        config[key] = [value];
      }
    }
    return config;
  }

  private async _loadConfig() {
    try {
      const config = await fetchAutomationFileConfig(
        this.hass,
        this.automationId as string
      );
      this._dirty = false;
      this._readOnly = false;
      this._config = this._normalizeConfig(config);
      this._checkValidation();
    } catch (err: any) {
      const entityRegistry = await fetchEntityRegistry(this.hass.connection);
      const entity = entityRegistry.find(
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
        text:
          err.status_code === 404
            ? this.hass.localize(
                "ui.panel.config.automation.editor.load_error_not_editable"
              )
            : this.hass.localize(
                "ui.panel.config.automation.editor.load_error_unknown",
                "err_no",
                err.status_code
              ),
      });
      history.back();
    }
  }

  private _valueChanged(ev: CustomEvent<{ value: AutomationConfig }>) {
    ev.stopPropagation();
    if (this._readOnly) {
      return;
    }
    this._config = ev.detail.value;
    this._dirty = true;
    this._errors = undefined;
  }

  private _showInfo() {
    if (!this.hass || !this._entityId) {
      return;
    }
    fireEvent(this, "hass-more-info", { entityId: this._entityId });
  }

  private async _showTrace() {
    if (this._config?.id) {
      const result = await this.confirmUnsavedChanged();
      if (result) {
        navigate(`/config/automation/trace/${this._config.id}`);
      }
    }
  }

  private _runActions() {
    if (!this.hass || !this._entityId) {
      return;
    }
    triggerAutomationActions(
      this.hass,
      this.hass.states[this._entityId].entity_id
    );
  }

  private async _toggle(): Promise<void> {
    if (!this.hass || !this._entityId) {
      return;
    }
    const stateObj = this.hass.states[this._entityId];
    const service = stateObj.state === "off" ? "turn_on" : "turn_off";
    await this.hass.callService("automation", service, {
      entity_id: stateObj.entity_id,
    });
  }

  private _preprocessYaml() {
    if (!this._config) {
      return {};
    }
    const cleanConfig: AutomationConfig = { ...this._config };
    delete cleanConfig.id;
    return cleanConfig;
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
    this._config = { id: this._config?.id, ...ev.detail.value };
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
          title: "Migrate automation?",
          text: "You can migrate this automation, so it can be edited from the UI. After it is migrated and you have saved it, you will have to manually delete your old automation from your configuration. Do you want to migrate this automation?",
        })
      : await this.confirmUnsavedChanged();
    if (result) {
      showAutomationEditor({
        ...this._config,
        id: undefined,
        alias: this._readOnly ? this._config?.alias : undefined,
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
        { name: this._config?.alias }
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
      history.back();
    }
  }

  private _switchUiMode() {
    this._mode = "gui";
  }

  private _switchYamlMode() {
    this._mode = "yaml";
  }

  private async _promptAutomationAlias(): Promise<void> {
    return new Promise((resolve) => {
      showAutomationRenameDialog(this, {
        config: this._config!,
        updateAutomation: (config) => {
          this._config = config;
          this._dirty = true;
          this.requestUpdate();
          resolve();
        },
        onClose: () => resolve(),
      });
    });
  }

  private async _promptAutomationMode(): Promise<void> {
    return new Promise((resolve) => {
      showAutomationModeDialog(this, {
        config: this._config!,
        updateAutomation: (config) => {
          this._config = config;
          this._dirty = true;
          this.requestUpdate();
          resolve();
        },
        onClose: () => resolve(),
      });
    });
  }

  private async _saveAutomation(): Promise<void> {
    const id = this.automationId || String(Date.now());
    if (!this.automationId) {
      await this._promptAutomationAlias();
    }

    this._validationErrors = undefined;
    try {
      await saveAutomationConfig(this.hass, id, this._config!);
    } catch (errors: any) {
      this._errors = errors.body.message || errors.error || errors.body;
      showToast(this, {
        message: errors.body.message || errors.error || errors.body,
      });
      throw errors;
    }

    this._dirty = false;

    if (!this.automationId) {
      navigate(`/config/automation/edit/${id}`, { replace: true });
    }
  }

  private _subscribeAutomationConfig(ev) {
    const id = this._configSubscriptionsId++;
    this._configSubscriptions[id] = ev.detail.callback;
    ev.detail.unsub = () => {
      delete this._configSubscriptions[id];
    };
    ev.detail.callback(this._config);
  }

  protected handleKeyboardSave() {
    this._saveAutomation();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-card {
          overflow: hidden;
        }
        .content {
          padding-bottom: 20px;
        }
        .yaml-mode {
          height: 100%;
          display: flex;
          flex-direction: column;
          padding-bottom: 0;
        }
        manual-automation-editor,
        blueprint-automation-editor {
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
        p {
          margin-bottom: 0;
        }
        ha-entity-toggle {
          margin-right: 8px;
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
        ha-button-menu a {
          text-decoration: none;
          color: var(--primary-color);
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

customElements.define("ha-automation-editor", HaAutomationEditor);
