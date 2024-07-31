import "@material/mwc-button";
import {
  mdiCheck,
  mdiContentDuplicate,
  mdiContentSave,
  mdiDebugStepOver,
  mdiDelete,
  mdiDotsVertical,
  mdiFileEdit,
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
import { property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../../common/dom/fire_event";
import { navigate } from "../../../common/navigate";
import { computeRTL } from "../../../common/util/compute_rtl";
import { afterNextRender } from "../../../common/util/render-status";
import "../../../components/ha-button-menu";
import "../../../components/ha-fab";
import "../../../components/ha-icon";
import "../../../components/ha-icon-button";
import "../../../components/ha-list-item";
import "../../../components/ha-svg-icon";
import "../../../components/ha-yaml-editor";
import {
  AutomationConfig,
  AutomationEntity,
  BlueprintAutomationConfig,
  deleteAutomation,
  fetchAutomationFileConfig,
  getAutomationEditorInitData,
  getAutomationStateConfig,
  normalizeAutomationConfig,
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
import { substituteBlueprint } from "../../../data/blueprint";

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
  }
}

export class HaAutomationEditor extends KeyboardShortcutMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public automationId: string | null = null;

  @property() public entityId: string | null = null;

  @property({ attribute: false }) public automations!: AutomationEntity[];

  @property({ type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _config?: AutomationConfig;

  @state() private _dirty = false;

  @state() private _errors?: string;

  @state() private _entityId?: string;

  @state() private _mode: "gui" | "yaml" = "gui";

  @state() private _readOnly = false;

  @state() private _validationErrors?: (string | TemplateResult)[];

  @state() private _blueprintConfig?: BlueprintAutomationConfig;

  private _configSubscriptions: Record<
    string,
    (config?: AutomationConfig) => void
  > = {};

  private _configSubscriptionsId = 1;

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
        this.hass.localize("ui.panel.config.automation.editor.default_name")}
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

          <ha-list-item
            graphic="icon"
            .disabled=${!stateObj}
            @click=${this._showInfo}
          >
            ${this.hass.localize("ui.panel.config.automation.editor.show_info")}
            <ha-svg-icon
              slot="graphic"
              .path=${mdiInformationOutline}
            ></ha-svg-icon>
          </ha-list-item>

          <ha-list-item
            graphic="icon"
            .disabled=${!stateObj}
            @click=${this._runActions}
          >
            ${this.hass.localize("ui.panel.config.automation.editor.run")}
            <ha-svg-icon slot="graphic" .path=${mdiPlay}></ha-svg-icon>
          </ha-list-item>

          ${stateObj && this.narrow
            ? html`<a
                href="/config/automation/trace/${encodeURIComponent(
                  this._config.id!
                )}"
              >
                <ha-list-item graphic="icon">
                  ${this.hass.localize(
                    "ui.panel.config.automation.editor.show_trace"
                  )}
                  <ha-svg-icon
                    slot="graphic"
                    .path=${mdiTransitConnection}
                  ></ha-svg-icon>
                </ha-list-item>
              </a>`
            : nothing}

          <ha-list-item
            graphic="icon"
            @click=${this._promptAutomationAlias}
            .disabled=${this._readOnly ||
            !this.automationId ||
            this._mode === "yaml"}
          >
            ${this.hass.localize("ui.panel.config.automation.editor.rename")}
            <ha-svg-icon slot="graphic" .path=${mdiRenameBox}></ha-svg-icon>
          </ha-list-item>
          ${!useBlueprint
            ? html`
                <ha-list-item
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
                </ha-list-item>
              `
            : nothing}

          <ha-list-item
            .disabled=${this._blueprintConfig ||
            (!this._readOnly && !this.automationId)}
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
          </ha-list-item>

          ${useBlueprint
            ? html`
                <ha-list-item
                  graphic="icon"
                  @click=${this._takeControl}
                  .disabled=${this._readOnly}
                >
                  ${this.hass.localize(
                    "ui.panel.config.automation.editor.take_control"
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
                ></ha-svg-icon>`
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
          </ha-list-item>

          <ha-list-item
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
          </ha-list-item>
        </ha-button-menu>
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
          ${this._blueprintConfig
            ? html`<ha-alert alert-type="info">
                ${this.hass.localize(
                  "ui.panel.config.automation.editor.confirm_take_control"
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
                    "ui.panel.config.automation.editor.read_only"
                  )}
                  <mwc-button slot="action" @click=${this._duplicate}>
                    ${this.hass.localize(
                      "ui.panel.config.automation.editor.migrate"
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
                        <blueprint-automation-editor
                          .hass=${this.hass}
                          .narrow=${this.narrow}
                          .isWide=${this.isWide}
                          .stateObj=${stateObj}
                          .config=${this._config}
                          .disabled=${Boolean(this._readOnly)}
                          @value-changed=${this._valueChanged}
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
                        ></manual-automation-editor>
                      `}
                </div>
              `
            : this._mode === "yaml"
              ? html`${stateObj?.state === "off"
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
          class=${classMap({ dirty: !this._readOnly && this._dirty })}
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
        ...(initData ? normalizeAutomationConfig(initData) : initData),
      } as AutomationConfig;
      this._entityId = undefined;
      this._readOnly = false;
      this._dirty = true;
    }

    if (changedProps.has("entityId") && this.entityId) {
      getAutomationStateConfig(this.hass, this.entityId).then((c) => {
        this._config = normalizeAutomationConfig(c.config);
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
              `ui.panel.config.automation.editor.${key}s.name`
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
      this._dirty = false;
      this._readOnly = false;
      this._config = normalizeAutomationConfig(config);
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
                { err_no: err.status_code }
              ),
      });
      history.back();
    }
  }

  private _valueChanged(ev: CustomEvent<{ value: AutomationConfig }>) {
    ev.stopPropagation();

    this._config = ev.detail.value;
    if (this._readOnly) {
      return;
    }
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
        navigate(
          `/config/automation/trace/${encodeURIComponent(this._config.id)}`
        );
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

  private async _takeControl() {
    const config = this._config as BlueprintAutomationConfig;

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

  private async _promptAutomationAlias(): Promise<boolean> {
    return new Promise((resolve) => {
      showAutomationRenameDialog(this, {
        config: this._config!,
        domain: "automation",
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

  private async _promptAutomationMode(): Promise<void> {
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

  private async _saveAutomation(): Promise<void> {
    const id = this.automationId || String(Date.now());
    if (!this.automationId) {
      const saved = await this._promptAutomationAlias();
      if (!saved) {
        return;
      }
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
        blueprint-automation-editor,
        :not(.yaml-mode) > ha-alert {
          margin: 0 auto;
          max-width: 1040px;
          padding: 28px 20px 0;
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
        p {
          margin-bottom: 0;
        }
        ha-entity-toggle {
          margin-right: 8px;
          margin-inline-end: 8px;
          margin-inline-start: initial;
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
