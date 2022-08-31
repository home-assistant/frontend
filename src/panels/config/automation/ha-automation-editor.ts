import "@material/mwc-list/mwc-list-item";
import {
  mdiCheck,
  mdiContentDuplicate,
  mdiContentSave,
  mdiDelete,
  mdiDotsVertical,
  mdiPencil,
  mdiPlay,
  mdiPlayCircleOutline,
  mdiRenameBox,
  mdiStopCircleOutline,
  mdiTransitConnection,
} from "@mdi/js";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { property, state, query } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { navigate } from "../../../common/navigate";
import { copyToClipboard } from "../../../common/util/copy-clipboard";
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
  getAutomationConfig,
  getAutomationEditorInitData,
  showAutomationEditor,
  triggerAutomationActions,
} from "../../../data/automation";
import {
  showAlertDialog,
  showConfirmationDialog,
  showPromptDialog,
} from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/ha-app-layout";
import "../../../layouts/hass-tabs-subpage";
import { KeyboardShortcutMixin } from "../../../mixins/keyboard-shortcut-mixin";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route } from "../../../types";
import { showToast } from "../../../util/toast";
import "../ha-config-section";
import { configSections } from "../ha-panel-config";
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
  }
}

export class HaAutomationEditor extends KeyboardShortcutMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public automationId: string | null = null;

  @property() public automations!: AutomationEntity[];

  @property() public isWide?: boolean;

  @property() public narrow!: boolean;

  @property() public route!: Route;

  @state() private _config?: AutomationConfig;

  @state() private _dirty = false;

  @state() private _errors?: string;

  @state() private _entityId?: string;

  @state() private _mode: "gui" | "yaml" = "gui";

  @query("ha-yaml-editor", true) private _editor?: HaYamlEditor;

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
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .backCallback=${this._backTapped}
        .tabs=${configSections.automations}
      >
        <ha-button-menu corner="BOTTOM_START" slot="toolbar-icon">
          <ha-icon-button
            slot="trigger"
            .label=${this.hass.localize("ui.common.menu")}
            .path=${mdiDotsVertical}
          ></ha-icon-button>

          <mwc-list-item
            graphic="icon"
            .disabled=${!stateObj}
            @click=${this._runActions}
          >
            ${this.hass.localize("ui.panel.config.automation.editor.run")}
            <ha-svg-icon slot="graphic" .path=${mdiPlay}></ha-svg-icon>
          </mwc-list-item>

          ${stateObj
            ? html`<a
                href="/config/automation/trace/${this._config
                  ? this._config.id
                  : ""}"
                target="_blank"
                .disabled=${!stateObj}
              >
                <mwc-list-item graphic="icon" .disabled=${!stateObj}>
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

          <mwc-list-item graphic="icon" @click=${this._promptAutomationAlias}>
            ${this.hass.localize("ui.panel.config.automation.editor.rename")}
            <ha-svg-icon slot="graphic" .path=${mdiRenameBox}></ha-svg-icon>
          </mwc-list-item>

          <mwc-list-item
            .disabled=${!this.automationId}
            graphic="icon"
            @click=${this._duplicate}
          >
            ${this.hass.localize("ui.panel.config.automation.picker.duplicate")}
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
            ${!stateObj || stateObj.state === "off"
              ? this.hass.localize("ui.panel.config.automation.editor.enable")
              : this.hass.localize("ui.panel.config.automation.editor.disable")}
            <ha-svg-icon
              slot="graphic"
              .path=${!stateObj || stateObj.state === "off"
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
              ${this.narrow
                ? html`<span slot="header"
                    >${this._config!.alias ||
                    this.hass.localize(
                      "ui.panel.config.automation.editor.default_name"
                    )}</span
                  >`
                : ""}
              <div
                class="content ${classMap({
                  "yaml-mode": this._mode === "yaml",
                })}"
                @subscribe-automation-config=${this._subscribeAutomationConfig}
              >
                ${this._errors
                  ? html`<div class="errors">${this._errors}</div>`
                  : ""}
                ${this._mode === "gui"
                  ? html`
                      ${this.narrow
                        ? ""
                        : html`
                            <div class="header-name">
                              <h1>
                                ${this._config!.alias ||
                                this.hass.localize(
                                  "ui.panel.config.automation.editor.default_name"
                                )}
                              </h1>
                              <ha-icon-button
                                .path=${mdiPencil}
                                @click=${this._promptAutomationAlias}
                                .label=${this.hass.localize(
                                  "ui.panel.config.automation.editor.rename"
                                )}
                              ></ha-icon-button>
                            </div>
                          `}
                      ${"use_blueprint" in this._config
                        ? html`
                            <blueprint-automation-editor
                              .hass=${this.hass}
                              .narrow=${this.narrow}
                              .isWide=${this.isWide}
                              .stateObj=${stateObj}
                              .config=${this._config}
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
                              @value-changed=${this._valueChanged}
                            ></manual-automation-editor>
                          `}
                    `
                  : this._mode === "yaml"
                  ? html`
                      ${!this.narrow
                        ? html`
                            <ha-card outlined>
                              <div class="card-header">
                                ${this._config.alias ||
                                this.hass.localize(
                                  "ui.panel.config.automation.editor.default_name"
                                )}
                              </div>
                            </ha-card>
                          `
                        : ``}
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
      </hass-tabs-subpage>
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

    if (changedProps.has("automationId") && !this.automationId && this.hass) {
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
      this._dirty = true;
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

  private async _loadConfig() {
    try {
      const config = await getAutomationConfig(
        this.hass,
        this.automationId as string
      );

      // Normalize data: ensure trigger, action and condition are lists
      // Happens when people copy paste their automations into the config
      for (const key of ["trigger", "condition", "action"]) {
        const value = config[key];
        if (value && !Array.isArray(value)) {
          config[key] = [value];
        }
      }
      this._dirty = false;
      this._config = config;
    } catch (err: any) {
      showAlertDialog(this, {
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
      }).then(() => history.back());
    }
  }

  private _valueChanged(ev: CustomEvent<{ value: AutomationConfig }>) {
    ev.stopPropagation();
    this._config = ev.detail.value;
    this._dirty = true;
    this._errors = undefined;
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
    const cleanConfig = this._config;
    if (!cleanConfig) {
      return {};
    }

    delete cleanConfig.id;

    return cleanConfig;
  }

  private async _copyYaml(): Promise<void> {
    if (this._editor?.yaml) {
      await copyToClipboard(this._editor.yaml);
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

  private _backTapped = (): void => {
    if (this._dirty) {
      showConfirmationDialog(this, {
        text: this.hass!.localize(
          "ui.panel.config.automation.editor.unsaved_confirm"
        ),
        confirmText: this.hass!.localize("ui.common.leave"),
        dismissText: this.hass!.localize("ui.common.stay"),
        confirm: () => {
          setTimeout(() => history.back());
        },
      });
    } else {
      history.back();
    }
  };

  private async _duplicate() {
    if (this._dirty) {
      if (
        !(await showConfirmationDialog(this, {
          text: this.hass!.localize(
            "ui.panel.config.automation.editor.unsaved_confirm"
          ),
          confirmText: this.hass!.localize("ui.common.leave"),
          dismissText: this.hass!.localize("ui.common.stay"),
        }))
      ) {
        return;
      }
      // Wait for dialog to complete closing
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    showAutomationEditor({
      ...this._config,
      id: undefined,
      alias: undefined,
    });
  }

  private async _deleteConfirm() {
    showConfirmationDialog(this, {
      text: this.hass.localize(
        "ui.panel.config.automation.picker.delete_confirm"
      ),
      confirmText: this.hass!.localize("ui.common.delete"),
      dismissText: this.hass!.localize("ui.common.cancel"),
      confirm: () => this._delete(),
    });
  }

  private async _delete() {
    await deleteAutomation(this.hass, this.automationId as string);
    history.back();
  }

  private _switchUiMode() {
    this._mode = "gui";
  }

  private _switchYamlMode() {
    this._mode = "yaml";
  }

  private async _promptAutomationAlias(): Promise<string | null> {
    const result = await showPromptDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.automation.editor.automation_alias"
      ),
      inputLabel: this.hass.localize("ui.panel.config.automation.editor.alias"),
      inputType: "string",
      placeholder: this.hass.localize(
        "ui.panel.config.automation.editor.default_name"
      ),
      defaultValue: this._config!.alias,
      confirmText: this.hass.localize("ui.common.submit"),
    });
    if (result) {
      this._config!.alias = result;
      this._dirty = true;
      this.requestUpdate();
    }
    return result;
  }

  private async _saveAutomation(): Promise<void> {
    const id = this.automationId || String(Date.now());
    if (!this._config!.alias) {
      const alias = await this._promptAutomationAlias();
      if (!alias) {
        showAlertDialog(this, {
          text: this.hass.localize(
            "ui.panel.config.automation.editor.missing_name"
          ),
        });
        return;
      }
      this._config!.alias = alias;
    }

    this.hass!.callApi(
      "POST",
      "config/automation/config/" + id,
      this._config
    ).then(
      () => {
        this._dirty = false;

        if (!this.automationId) {
          navigate(`/config/automation/edit/${id}`, { replace: true });
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
        .errors {
          padding: 20px;
          font-weight: bold;
          color: var(--error-color);
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
        manual-automation-editor {
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
          font-family: var(--paper-font-headline_-_font-family);
          -webkit-font-smoothing: var(
            --paper-font-headline_-_-webkit-font-smoothing
          );
          font-size: var(--paper-font-headline_-_font-size);
          font-weight: var(--paper-font-headline_-_font-weight);
          letter-spacing: var(--paper-font-headline_-_letter-spacing);
          line-height: var(--paper-font-headline_-_line-height);
          opacity: var(--dark-primary-opacity);
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
