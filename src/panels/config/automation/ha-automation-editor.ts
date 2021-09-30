import { ActionDetail } from "@material/mwc-list/mwc-list-foundation";
import "@material/mwc-list/mwc-list-item";
import {
  mdiCheck,
  mdiContentDuplicate,
  mdiContentSave,
  mdiDelete,
  mdiDotsVertical,
} from "@mdi/js";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu-light";
import "@polymer/paper-input/paper-textarea";
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
} from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/ha-app-layout";
import "../../../layouts/hass-tabs-subpage";
import { KeyboardShortcutMixin } from "../../../mixins/keyboard-shortcut-mixin";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route } from "../../../types";
import { showToast } from "../../../util/toast";
import "../ha-config-section";
import { configSections } from "../ha-panel-config";
import { HaDeviceAction } from "./action/types/ha-automation-action-device_id";
import "./blueprint-automation-editor";
import "./manual-automation-editor";
import { HaDeviceTrigger } from "./trigger/types/ha-automation-trigger-device";

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
        .backCallback=${() => this._backTapped()}
        .tabs=${configSections.automation}
      >
        <ha-button-menu
          corner="BOTTOM_START"
          slot="toolbar-icon"
          @action=${this._handleMenuAction}
          activatable
        >
          <mwc-icon-button
            slot="trigger"
            .title=${this.hass.localize("ui.common.menu")}
            .label=${this.hass.localize("ui.common.overflow_menu")}
            ><ha-svg-icon path=${mdiDotsVertical}></ha-svg-icon>
          </mwc-icon-button>

          <mwc-list-item
            aria-label=${this.hass.localize(
              "ui.panel.config.automation.editor.edit_ui"
            )}
            graphic="icon"
            ?activated=${this._mode === "gui"}
          >
            ${this.hass.localize("ui.panel.config.automation.editor.edit_ui")}
            ${this._mode === "gui"
              ? html`<ha-svg-icon
                  class="selected_menu_item"
                  slot="graphic"
                  .path=${mdiCheck}
                ></ha-svg-icon>`
              : ``}
          </mwc-list-item>
          <mwc-list-item
            aria-label=${this.hass.localize(
              "ui.panel.config.automation.editor.edit_yaml"
            )}
            graphic="icon"
            ?activated=${this._mode === "yaml"}
          >
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
            .disabled=${!this.automationId}
            aria-label=${this.hass.localize(
              "ui.panel.config.automation.picker.duplicate_automation"
            )}
            graphic="icon"
          >
            ${this.hass.localize(
              "ui.panel.config.automation.picker.duplicate_automation"
            )}
            <ha-svg-icon
              slot="graphic"
              .path=${mdiContentDuplicate}
            ></ha-svg-icon>
          </mwc-list-item>

          <mwc-list-item
            .disabled=${!this.automationId}
            aria-label=${this.hass.localize(
              "ui.panel.config.automation.picker.delete_automation"
            )}
            class=${classMap({ warning: Boolean(this.automationId) })}
            graphic="icon"
          >
            ${this.hass.localize(
              "ui.panel.config.automation.picker.delete_automation"
            )}
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
                ? html` <span slot="header">${this._config?.alias}</span> `
                : ""}
              <div
                class="content ${classMap({
                  "yaml-mode": this._mode === "yaml",
                })}"
                @subscribe-automation-config=${this._subscribeAutomationConfig}
              >
                ${this._errors
                  ? html` <div class="errors">${this._errors}</div> `
                  : ""}
                ${this._mode === "gui"
                  ? html`
                      ${"use_blueprint" in this._config
                        ? html`<blueprint-automation-editor
                            .hass=${this.hass}
                            .narrow=${this.narrow}
                            .isWide=${this.isWide}
                            .stateObj=${stateObj}
                            .config=${this._config}
                            @value-changed=${this._valueChanged}
                          ></blueprint-automation-editor>`
                        : html`<manual-automation-editor
                            .hass=${this.hass}
                            .narrow=${this.narrow}
                            .isWide=${this.isWide}
                            .stateObj=${stateObj}
                            .config=${this._config}
                            @value-changed=${this._valueChanged}
                          ></manual-automation-editor>`}
                    `
                  : this._mode === "yaml"
                  ? html`
                      ${!this.narrow
                        ? html`
                            <ha-card
                              ><div class="card-header">
                                ${this._config.alias}
                              </div>
                              ${stateObj
                                ? html`
                                    <div
                                      class="card-actions layout horizontal justified center"
                                    >
                                      <ha-entity-toggle
                                        .hass=${this.hass}
                                        .stateObj=${stateObj}
                                        .label=${this.hass.localize(
                                          "ui.panel.config.automation.editor.enable_disable"
                                        )}
                                      ></ha-entity-toggle>

                                      <mwc-button
                                        @click=${this._runActions}
                                        .stateObj=${stateObj}
                                      >
                                        ${this.hass.localize(
                                          "ui.card.automation.trigger"
                                        )}
                                      </mwc-button>
                                    </div>
                                  `
                                : ""}
                            </ha-card>
                          `
                        : ``}
                      <ha-yaml-editor
                        .defaultValue=${this._preprocessYaml()}
                        @value-changed=${this._yamlChanged}
                      ></ha-yaml-editor>
                      <ha-card
                        ><div class="card-actions">
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
      let baseConfig: Partial<AutomationConfig> = {
        alias: this.hass.localize(
          "ui.panel.config.automation.editor.default_name"
        ),
        description: "",
      };
      if (!initData || !("use_blueprint" in initData)) {
        baseConfig = {
          ...baseConfig,
          mode: "single",
          trigger: [{ platform: "device", ...HaDeviceTrigger.defaultConfig }],
          condition: [],
          action: [{ ...HaDeviceAction.defaultConfig }],
        };
      }
      this._config = {
        ...baseConfig,
        ...initData,
      } as AutomationConfig;
      this._entityId = undefined;
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

  private _runActions(ev: Event) {
    triggerAutomationActions(this.hass, (ev.target as any).stateObj.entity_id);
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

  private _backTapped(): void {
    if (this._dirty) {
      showConfirmationDialog(this, {
        text: this.hass!.localize(
          "ui.panel.config.automation.editor.unsaved_confirm"
        ),
        confirmText: this.hass!.localize("ui.common.leave"),
        dismissText: this.hass!.localize("ui.common.stay"),
        confirm: () => history.back(),
      });
    } else {
      history.back();
    }
  }

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
      // Wait for dialog to complate closing
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    showAutomationEditor({
      ...this._config,
      id: undefined,
      alias: `${this._config?.alias} (${this.hass.localize(
        "ui.panel.config.automation.picker.duplicate"
      )})`,
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

  private async _handleMenuAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        this._mode = "gui";
        break;
      case 1:
        this._mode = "yaml";
        break;
      case 2:
        this._duplicate();
        break;
      case 3:
        this._deleteConfirm();
        break;
    }
  }

  private _saveAutomation(): void {
    const id = this.automationId || String(Date.now());
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
      `,
    ];
  }
}

customElements.define("ha-automation-editor", HaAutomationEditor);
