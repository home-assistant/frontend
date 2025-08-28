import { consume } from "@lit/context";
import {
  mdiCog,
  mdiContentDuplicate,
  mdiContentSave,
  mdiDebugStepOver,
  mdiDelete,
  mdiDotsVertical,
  mdiFileEdit,
  mdiInformationOutline,
  mdiPlay,
  mdiPlayCircleOutline,
  mdiPlaylistEdit,
  mdiRenameBox,
  mdiRobotConfused,
  mdiStopCircleOutline,
  mdiTag,
  mdiTransitConnection,
  mdiUnfoldLessHorizontal,
  mdiUnfoldMoreHorizontal,
} from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { transform } from "../../../common/decorators/transform";
import { fireEvent } from "../../../common/dom/fire_event";
import { navigate } from "../../../common/navigate";
import { promiseTimeout } from "../../../common/util/promise-timeout";
import { afterNextRender } from "../../../common/util/render-status";
import "../../../components/ha-button";
import "../../../components/ha-button-menu";
import "../../../components/ha-fab";
import "../../../components/ha-fade-in";
import "../../../components/ha-icon";
import "../../../components/ha-icon-button";
import "../../../components/ha-list-item";
import "../../../components/ha-spinner";
import "../../../components/ha-svg-icon";
import "../../../components/ha-yaml-editor";
import type {
  AutomationConfig,
  AutomationEntity,
  BlueprintAutomationConfig,
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
import { UNAVAILABLE } from "../../../data/entity";
import {
  type EntityRegistryEntry,
  updateEntityRegistryEntry,
} from "../../../data/entity_registry";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import { showMoreInfoDialog } from "../../../dialogs/more-info/show-ha-more-info-dialog";
import "../../../layouts/hass-subpage";
import { KeyboardShortcutMixin } from "../../../mixins/keyboard-shortcut-mixin";
import { PreventUnsavedMixin } from "../../../mixins/prevent-unsaved-mixin";
import { haStyle } from "../../../resources/styles";
import type { Entries, HomeAssistant, Route } from "../../../types";
import { showToast } from "../../../util/toast";
import { showAssignCategoryDialog } from "../category/show-dialog-assign-category";
import "../ha-config-section";
import { showAutomationModeDialog } from "./automation-mode-dialog/show-dialog-automation-mode";
import {
  type EntityRegistryUpdate,
  showAutomationSaveDialog,
} from "./automation-save-dialog/show-dialog-automation-save";
import "./blueprint-automation-editor";
import "./manual-automation-editor";
import type { HaManualAutomationEditor } from "./manual-automation-editor";

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
    "save-automation": undefined;
  }
}

export class HaAutomationEditor extends PreventUnsavedMixin(
  KeyboardShortcutMixin(LitElement)
) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public automationId: string | null = null;

  @property({ attribute: false }) public entityId: string | null = null;

  @property({ attribute: false }) public automations!: AutomationEntity[];

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _config?: AutomationConfig;

  @state() private _dirty = false;

  @state() private _errors?: string;

  @state() private _yamlErrors?: string;

  @state() private _entityId?: string;

  @state() private _mode: "gui" | "yaml" = "gui";

  @state() private _readOnly = false;

  @state() private _validationErrors?: (string | TemplateResult)[];

  @state() private _blueprintConfig?: BlueprintAutomationConfig;

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  @transform<EntityRegistryEntry[], EntityRegistryEntry>({
    transformer: function (this: HaAutomationEditor, value) {
      return value.find(({ entity_id }) => entity_id === this._entityId);
    },
    watch: ["_entityId"],
  })
  private _registryEntry?: EntityRegistryEntry;

  @state() private _saving = false;

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

  private _entityRegistryUpdate?: EntityRegistryUpdate;

  private _newAutomationId?: string;

  private _entityRegCreated?: (
    value: PromiseLike<EntityRegistryEntry> | EntityRegistryEntry
  ) => void;

  protected willUpdate(changedProps) {
    super.willUpdate(changedProps);

    if (
      this._entityRegCreated &&
      this._newAutomationId &&
      changedProps.has("_entityRegistry")
    ) {
      const automation = this._entityRegistry.find(
        (entity: EntityRegistryEntry) =>
          entity.platform === "automation" &&
          entity.unique_id === this._newAutomationId
      );
      if (automation) {
        this._entityRegCreated(automation);
        this._entityRegCreated = undefined;
      }
    }
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this._config) {
      return html`
        <ha-fade-in .delay=${500}>
          <ha-spinner size="large"></ha-spinner>
        </ha-fade-in>
      `;
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
              `ui.panel.config.scene.picker.${this._registryEntry?.categories?.automation ? "edit_category" : "assign_category"}`
            )}
            <ha-svg-icon slot="graphic" .path=${mdiTag}></ha-svg-icon>
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

          ${!useBlueprint
            ? html`
                <ha-list-item graphic="icon" @click=${this._collapseAll}>
                  <ha-svg-icon
                    slot="graphic"
                    .path=${mdiUnfoldLessHorizontal}
                  ></ha-svg-icon>
                  ${this.hass.localize(
                    "ui.panel.config.automation.editor.collapse_all"
                  )}
                </ha-list-item>

                <ha-list-item graphic="icon" @click=${this._expandAll}>
                  <ha-svg-icon
                    slot="graphic"
                    .path=${mdiUnfoldMoreHorizontal}
                  ></ha-svg-icon>
                  ${this.hass.localize(
                    "ui.panel.config.automation.editor.expand_all"
                  )}
                </ha-list-item>
              `
            : nothing}

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
          class=${this._mode === "yaml" ? "yaml-mode" : ""}
          @subscribe-automation-config=${this._subscribeAutomationConfig}
        >
          ${this._mode === "gui"
            ? html`
                <div>
                  ${useBlueprint
                    ? html`
                        <blueprint-automation-editor
                          .hass=${this.hass}
                          .narrow=${this.narrow}
                          .isWide=${this.isWide}
                          .stateObj=${stateObj}
                          .config=${this._config}
                          .disabled=${this._readOnly}
                          .saving=${this._saving}
                          .dirty=${this._dirty}
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
                          .config=${this._config}
                          .disabled=${this._readOnly}
                          .dirty=${this._dirty}
                          .saving=${this._saving}
                          @value-changed=${this._valueChanged}
                          @save-automation=${this._handleSaveAutomation}
                          @editor-save=${this._handleSaveAutomation}
                        >
                          <div class="alert-wrapper" slot="alerts">
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
                              : nothing}
                            ${this._blueprintConfig
                              ? html`<ha-alert alert-type="info">
                                  ${this.hass.localize(
                                    "ui.panel.config.automation.editor.confirm_take_control"
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
            : this._mode === "yaml"
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
                    : ""}
                  <ha-yaml-editor
                    copy-clipboard
                    .hass=${this.hass}
                    .defaultValue=${this._preprocessYaml()}
                    .readOnly=${this._readOnly}
                    @value-changed=${this._yamlChanged}
                    @editor-save=${this._handleSaveAutomation}
                    .showErrors=${false}
                    disable-fullscreen
                  ></ha-yaml-editor>
                  <ha-fab
                    slot="fab"
                    class=${this._dirty ? "dirty" : ""}
                    .label=${this.hass.localize("ui.common.save")}
                    .disabled=${this._saving}
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
      this._config = {
        ...baseConfig,
        ...(initData ? normalizeAutomationConfig(initData) : initData),
      } as AutomationConfig;
      this._entityId = undefined;
      this._readOnly = false;
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
      triggers: this._config.triggers,
      conditions: this._config.conditions,
      actions: this._config.actions,
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
      scope: "automation",
      entityReg: this._registryEntry,
    });
  }

  private async _showTrace() {
    if (this._config?.id) {
      const result = await this._confirmUnsavedChanged();
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
    this._dirty = true;
    if (!ev.detail.isValid) {
      this._yamlErrors = ev.detail.errorMsg;
      return;
    }
    this._yamlErrors = undefined;
    this._config = {
      id: this._config?.id,
      ...normalizeAutomationConfig(ev.detail.value),
    };
    this._errors = undefined;
  }

  private async _confirmUnsavedChanged(): Promise<boolean> {
    if (!this._dirty) {
      return true;
    }

    return new Promise<boolean>((resolve) => {
      showAutomationSaveDialog(this, {
        config: this._config!,
        domain: "automation",
        updateConfig: async (config, entityRegistryUpdate) => {
          this._config = config;
          this._entityRegistryUpdate = entityRegistryUpdate;
          this._dirty = true;
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
        entityRegistryUpdate: this._entityRegistryUpdate,
        entityRegistryEntry: this._registryEntry,
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

  private _backTapped = async () => {
    const result = await this._confirmUnsavedChanged();
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
          title: this.hass.localize(
            "ui.panel.config.automation.picker.migrate_automation"
          ),
          text: this.hass.localize(
            "ui.panel.config.automation.picker.migrate_automation_description"
          ),
        })
      : await this._confirmUnsavedChanged();
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

  private async _promptAutomationAlias(): Promise<boolean> {
    return new Promise((resolve) => {
      showAutomationSaveDialog(this, {
        config: this._config!,
        domain: "automation",
        updateConfig: async (config, entityRegistryUpdate) => {
          this._config = config;
          this._entityRegistryUpdate = entityRegistryUpdate;
          this._dirty = true;
          this.requestUpdate();
          resolve(true);
        },
        onClose: () => resolve(false),
        entityRegistryUpdate: this._entityRegistryUpdate,
        entityRegistryEntry: this._registryEntry,
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

  private async _handleSaveAutomation(): Promise<void> {
    if (this._yamlErrors) {
      showToast(this, {
        message: this._yamlErrors,
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
    this._saving = true;
    this._validationErrors = undefined;

    let entityRegPromise: Promise<EntityRegistryEntry> | undefined;
    if (this._entityRegistryUpdate !== undefined && !this._entityId) {
      this._newAutomationId = id;
      entityRegPromise = new Promise<EntityRegistryEntry>((resolve) => {
        this._entityRegCreated = resolve;
      });
    }

    try {
      await saveAutomationConfig(this.hass, id, this._config!);

      if (this._entityRegistryUpdate !== undefined) {
        let entityId = this._entityId;

        // wait for automation to appear in entity registry when creating a new automation
        if (entityRegPromise) {
          try {
            const automation = await promiseTimeout(5000, entityRegPromise);
            entityId = automation.entity_id;
          } catch (e) {
            if (e instanceof Error && e.name === "TimeoutError") {
              showAlertDialog(this, {
                title: this.hass.localize(
                  "ui.panel.config.automation.editor.new_automation_setup_failed_title",
                  {
                    type: this.hass.localize(
                      "ui.panel.config.automation.editor.type_automation"
                    ),
                  }
                ),
                text: this.hass.localize(
                  "ui.panel.config.automation.editor.new_automation_setup_failed_text",
                  {
                    type: this.hass.localize(
                      "ui.panel.config.automation.editor.type_automation"
                    ),
                    types: this.hass.localize(
                      "ui.panel.config.automation.editor.type_automation_plural"
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
              automation: this._entityRegistryUpdate.category || null,
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

  private _subscribeAutomationConfig(ev) {
    const id = this._configSubscriptionsId++;
    this._configSubscriptions[id] = ev.detail.callback;
    ev.detail.unsub = () => {
      delete this._configSubscriptions[id];
    };
    ev.detail.callback(this._config);
  }

  protected supportedShortcuts(): SupportedShortcuts {
    return {
      s: () => this._handleSaveAutomation(),
    };
  }

  protected get isDirty() {
    return this._dirty;
  }

  protected async promptDiscardChanges() {
    return this._confirmUnsavedChanged();
  }

  private _collapseAll() {
    this._manualEditor?.collapseAll();
  }

  private _expandAll() {
    this._manualEditor?.expandAll();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-fade-in {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
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
          display: block;
        }

        :not(.yaml-mode) > .alert-wrapper {
          position: sticky;
          top: -24px;
          margin-top: -24px;
          z-index: 100;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        :not(.yaml-mode) > .alert-wrapper ha-alert {
          background-color: var(--card-background-color);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          border-radius: var(--ha-border-radius-sm);
          margin-bottom: 0;
        }

        manual-automation-editor {
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
        ha-entity-toggle {
          margin-right: 8px;
          margin-inline-end: 8px;
          margin-inline-start: initial;
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
        ha-fab {
          position: fixed;
          right: 16px;
          bottom: calc(-80px - var(--safe-area-inset-bottom));
          transition: bottom 0.3s;
        }
        ha-fab.dirty {
          bottom: 16px;
        }
      `,
    ];
  }
}

customElements.define("ha-automation-editor", HaAutomationEditor);
