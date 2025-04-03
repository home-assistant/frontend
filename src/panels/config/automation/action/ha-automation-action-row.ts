import { consume } from "@lit/context";
import {
  mdiAlertCircleCheck,
  mdiArrowDown,
  mdiArrowUp,
  mdiContentCopy,
  mdiContentCut,
  mdiContentDuplicate,
  mdiDelete,
  mdiDotsVertical,
  mdiPlay,
  mdiPlayCircleOutline,
  mdiPlaylistEdit,
  mdiRenameBox,
  mdiStopCircleOutline,
} from "@mdi/js";
import deepClone from "deep-clone-simple";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { storage } from "../../../../common/decorators/storage";
import { dynamicElement } from "../../../../common/dom/dynamic-element-directive";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import { capitalizeFirstLetter } from "../../../../common/string/capitalize-first-letter";
import { handleStructError } from "../../../../common/structs/handle-errors";
import "../../../../components/ha-alert";
import "../../../../components/ha-md-button-menu";
import "../../../../components/ha-md-menu-item";
import "../../../../components/ha-md-divider";
import "../../../../components/ha-card";
import "../../../../components/ha-expansion-panel";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-service-icon";
import "../../../../components/ha-tooltip";
import type { HaYamlEditor } from "../../../../components/ha-yaml-editor";
import { ACTION_ICONS, YAML_ONLY_ACTION_TYPES } from "../../../../data/action";
import type { AutomationClipboard } from "../../../../data/automation";
import { validateConfig } from "../../../../data/config";
import {
  floorsContext,
  fullEntitiesContext,
  labelsContext,
} from "../../../../data/context";
import type { EntityRegistryEntry } from "../../../../data/entity_registry";
import type { FloorRegistryEntry } from "../../../../data/floor_registry";
import type { LabelRegistryEntry } from "../../../../data/label_registry";
import type { Action, NonConditionAction } from "../../../../data/script";
import {
  getActionType,
  migrateAutomationAction,
} from "../../../../data/script";
import { describeAction } from "../../../../data/script_i18n";
import { callExecuteScript } from "../../../../data/service";
import {
  showAlertDialog,
  showConfirmationDialog,
  showPromptDialog,
} from "../../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { showToast } from "../../../../util/toast";
import "./types/ha-automation-action-choose";
import "./types/ha-automation-action-condition";
import "./types/ha-automation-action-delay";
import "./types/ha-automation-action-device_id";
import "./types/ha-automation-action-event";
import "./types/ha-automation-action-if";
import "./types/ha-automation-action-parallel";
import "./types/ha-automation-action-play_media";
import "./types/ha-automation-action-repeat";
import "./types/ha-automation-action-sequence";
import "./types/ha-automation-action-service";
import "./types/ha-automation-action-set_conversation_response";
import "./types/ha-automation-action-stop";
import "./types/ha-automation-action-wait_for_trigger";
import "./types/ha-automation-action-wait_template";

export const getType = (action: Action | undefined) => {
  if (!action) {
    return undefined;
  }
  if ("action" in action) {
    return getActionType(action) as "action" | "play_media";
  }
  if (["and", "or", "not"].some((key) => key in action)) {
    return "condition" as const;
  }
  return Object.keys(ACTION_ICONS).find(
    (option) => option in action
  ) as keyof typeof ACTION_ICONS;
};

export interface ActionElement extends LitElement {
  action: Action;
}

export const handleChangeEvent = (element: ActionElement, ev: CustomEvent) => {
  ev.stopPropagation();
  const name = (ev.target as any)?.name;
  if (!name) {
    return;
  }
  const newVal = ev.detail?.value || (ev.target as any).value;

  if ((element.action[name] || "") === newVal) {
    return;
  }

  let newAction: Action;
  if (!newVal) {
    newAction = { ...element.action };
    delete newAction[name];
  } else {
    newAction = { ...element.action, [name]: newVal };
  }
  fireEvent(element, "value-changed", { value: newAction });
};

const preventDefault = (ev) => ev.preventDefault();

@customElement("ha-automation-action-row")
export default class HaAutomationActionRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public action!: Action;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public first?: boolean;

  @property({ type: Boolean }) public last?: boolean;

  @storage({
    key: "automationClipboard",
    state: false,
    subscribe: true,
    storage: "sessionStorage",
  })
  public _clipboard?: AutomationClipboard;

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  _entityReg!: EntityRegistryEntry[];

  @state()
  @consume({ context: labelsContext, subscribe: true })
  _labelReg!: LabelRegistryEntry[];

  @state()
  @consume({ context: floorsContext, subscribe: true })
  _floorReg!: Record<string, FloorRegistryEntry>;

  @state() private _warnings?: string[];

  @state() private _uiModeAvailable = true;

  @state() private _yamlMode = false;

  @query("ha-yaml-editor") private _yamlEditor?: HaYamlEditor;

  protected willUpdate(changedProperties: PropertyValues) {
    if (!changedProperties.has("action")) {
      return;
    }
    const type = getType(this.action);
    this._uiModeAvailable =
      type !== undefined && !YAML_ONLY_ACTION_TYPES.has(type as any);
    if (!this._uiModeAvailable && !this._yamlMode) {
      this._yamlMode = true;
    }
  }

  protected updated(changedProperties: PropertyValues) {
    if (!changedProperties.has("action")) {
      return;
    }
    if (this._yamlMode) {
      const yamlEditor = this._yamlEditor;
      if (yamlEditor && yamlEditor.value !== this.action) {
        yamlEditor.setValue(this.action);
      }
    }
  }

  protected render() {
    if (!this.action) return nothing;

    const type = getType(this.action);
    const yamlMode = this._yamlMode;

    return html`
      <ha-card outlined>
        ${this.action.enabled === false
          ? html`
              <div class="disabled-bar">
                ${this.hass.localize(
                  "ui.panel.config.automation.editor.actions.disabled"
                )}
              </div>
            `
          : nothing}
        <ha-expansion-panel left-chevron>
          ${type === "service" && "action" in this.action && this.action.action
            ? html`
                <ha-service-icon
                  slot="leading-icon"
                  class="action-icon"
                  .hass=${this.hass}
                  .service=${this.action.action}
                ></ha-service-icon>
              `
            : html`
                <ha-svg-icon
                  slot="leading-icon"
                  class="action-icon"
                  .path=${ACTION_ICONS[type!]}
                ></ha-svg-icon>
              `}
          <h3 slot="header">
            ${capitalizeFirstLetter(
              describeAction(
                this.hass,
                this._entityReg,
                this._labelReg,
                this._floorReg,
                this.action
              )
            )}
          </h3>

          <slot name="icons" slot="icons"></slot>

          ${type !== "condition" &&
          (this.action as NonConditionAction).continue_on_error === true
            ? html`<ha-tooltip
                slot="icons"
                .content=${this.hass.localize(
                  "ui.panel.config.automation.editor.actions.continue_on_error"
                )}
              >
                <ha-svg-icon .path=${mdiAlertCircleCheck}></ha-svg-icon>
              </ha-tooltip>`
            : nothing}

          <ha-md-button-menu
            slot="icons"
            @click=${preventDefault}
            @keydown=${stopPropagation}
            @closed=${stopPropagation}
            positioning="fixed"
          >
            <ha-icon-button
              slot="trigger"
              .label=${this.hass.localize("ui.common.menu")}
              .path=${mdiDotsVertical}
            ></ha-icon-button>
            <ha-md-menu-item .clickAction=${this._runAction}>
              ${this.hass.localize(
                "ui.panel.config.automation.editor.actions.run"
              )}
              <ha-svg-icon slot="start" .path=${mdiPlay}></ha-svg-icon>
            </ha-md-menu-item>

            <ha-md-menu-item
              .clickAction=${this._renameAction}
              .disabled=${this.disabled}
            >
              ${this.hass.localize(
                "ui.panel.config.automation.editor.actions.rename"
              )}
              <ha-svg-icon slot="start" .path=${mdiRenameBox}></ha-svg-icon>
            </ha-md-menu-item>

            <ha-md-divider role="separator" tabindex="-1"></ha-md-divider>

            <ha-md-menu-item
              .clickAction=${this._duplicateAction}
              .disabled=${this.disabled}
            >
              ${this.hass.localize(
                "ui.panel.config.automation.editor.actions.duplicate"
              )}
              <ha-svg-icon
                slot="start"
                .path=${mdiContentDuplicate}
              ></ha-svg-icon>
            </ha-md-menu-item>

            <ha-md-menu-item
              .clickAction=${this._copyAction}
              .disabled=${this.disabled}
            >
              ${this.hass.localize(
                "ui.panel.config.automation.editor.triggers.copy"
              )}
              <ha-svg-icon slot="start" .path=${mdiContentCopy}></ha-svg-icon>
            </ha-md-menu-item>

            <ha-md-menu-item
              .clickAction=${this._cutAction}
              .disabled=${this.disabled}
            >
              ${this.hass.localize(
                "ui.panel.config.automation.editor.triggers.cut"
              )}
              <ha-svg-icon slot="start" .path=${mdiContentCut}></ha-svg-icon>
            </ha-md-menu-item>

            <ha-md-menu-item
              .clickAction=${this._moveUp}
              .disabled=${this.disabled || this.first}
            >
              ${this.hass.localize("ui.panel.config.automation.editor.move_up")}
              <ha-svg-icon slot="start" .path=${mdiArrowUp}></ha-svg-icon
            ></ha-md-menu-item>

            <ha-md-menu-item
              .clickAction=${this._moveDown}
              .disabled=${this.disabled || this.last}
            >
              ${this.hass.localize(
                "ui.panel.config.automation.editor.move_down"
              )}
              <ha-svg-icon slot="start" .path=${mdiArrowDown}></ha-svg-icon
            ></ha-md-menu-item>

            <ha-md-menu-item
              .clickAction=${this._toggleYamlMode}
              .disabled=${!this._uiModeAvailable}
            >
              ${this.hass.localize(
                `ui.panel.config.automation.editor.edit_${!yamlMode ? "yaml" : "ui"}`
              )}
              <ha-svg-icon slot="start" .path=${mdiPlaylistEdit}></ha-svg-icon>
            </ha-md-menu-item>

            <ha-md-divider role="separator" tabindex="-1"></ha-md-divider>

            <ha-md-menu-item
              .clickAction=${this._onDisable}
              .disabled=${this.disabled}
            >
              ${this.action.enabled === false
                ? this.hass.localize(
                    "ui.panel.config.automation.editor.actions.enable"
                  )
                : this.hass.localize(
                    "ui.panel.config.automation.editor.actions.disable"
                  )}
              <ha-svg-icon
                slot="start"
                .path=${this.action.enabled === false
                  ? mdiPlayCircleOutline
                  : mdiStopCircleOutline}
              ></ha-svg-icon>
            </ha-md-menu-item>
            <ha-md-menu-item
              class="warning"
              .clickAction=${this._onDelete}
              .disabled=${this.disabled}
            >
              ${this.hass.localize(
                "ui.panel.config.automation.editor.actions.delete"
              )}
              <ha-svg-icon
                class="warning"
                slot="start"
                .path=${mdiDelete}
              ></ha-svg-icon>
            </ha-md-menu-item>
          </ha-md-button-menu>

          <div
            class=${classMap({
              "card-content": true,
              disabled: this.action.enabled === false,
            })}
          >
            ${this._warnings
              ? html`<ha-alert
                  alert-type="warning"
                  .title=${this.hass.localize(
                    "ui.errors.config.editor_not_supported"
                  )}
                >
                  ${this._warnings!.length > 0 &&
                  this._warnings![0] !== undefined
                    ? html` <ul>
                        ${this._warnings!.map(
                          (warning) => html`<li>${warning}</li>`
                        )}
                      </ul>`
                    : ""}
                  ${this.hass.localize(
                    "ui.errors.config.edit_in_yaml_supported"
                  )}
                </ha-alert>`
              : ""}
            ${yamlMode
              ? html`
                  ${type === undefined
                    ? html`
                        ${this.hass.localize(
                          "ui.panel.config.automation.editor.actions.unsupported_action"
                        )}
                      `
                    : ""}
                  <ha-yaml-editor
                    .hass=${this.hass}
                    .defaultValue=${this.action}
                    .readOnly=${this.disabled}
                    @value-changed=${this._onYamlChange}
                  ></ha-yaml-editor>
                `
              : html`
                  <div
                    @ui-mode-not-available=${this._handleUiModeNotAvailable}
                    @value-changed=${this._onUiChanged}
                  >
                    ${dynamicElement(`ha-automation-action-${type}`, {
                      hass: this.hass,
                      action: this.action,
                      narrow: this.narrow,
                      disabled: this.disabled,
                    })}
                  </div>
                `}
          </div>
        </ha-expansion-panel>
      </ha-card>
    `;
  }

  private _handleUiModeNotAvailable(ev: CustomEvent) {
    // Prevent possible parent action-row from switching to yamlMode
    ev.stopPropagation();

    this._warnings = handleStructError(this.hass, ev.detail).warnings;
    if (!this._yamlMode) {
      this._yamlMode = true;
    }
  }

  private _setClipboard() {
    this._clipboard = {
      ...this._clipboard,
      action: deepClone(this.action),
    };
  }

  private _onDisable = () => {
    const enabled = !(this.action.enabled ?? true);
    const value = { ...this.action, enabled };
    fireEvent(this, "value-changed", { value });
    if (this._yamlMode) {
      this._yamlEditor?.setValue(value);
    }
  };

  private _runAction = async () => {
    const validated = await validateConfig(this.hass, {
      actions: this.action,
    });

    if (!validated.actions.valid) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.automation.editor.actions.invalid_action"
        ),
        text: validated.actions.error,
      });
      return;
    }

    try {
      await callExecuteScript(this.hass, this.action);
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.automation.editor.actions.run_action_error"
        ),
        text: err.message || err,
      });
      return;
    }

    showToast(this, {
      message: this.hass.localize(
        "ui.panel.config.automation.editor.actions.run_action_success"
      ),
    });
  };

  private _onDelete = () => {
    showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.automation.editor.actions.delete_confirm_title"
      ),
      text: this.hass.localize(
        "ui.panel.config.automation.editor.actions.delete_confirm_text"
      ),
      dismissText: this.hass.localize("ui.common.cancel"),
      confirmText: this.hass.localize("ui.common.delete"),
      destructive: true,
      confirm: () => {
        fireEvent(this, "value-changed", { value: null });
      },
    });
  };

  private _onYamlChange(ev: CustomEvent) {
    ev.stopPropagation();
    if (!ev.detail.isValid) {
      return;
    }
    fireEvent(this, "value-changed", {
      value: migrateAutomationAction(ev.detail.value),
    });
  }

  private _onUiChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = {
      ...(this.action.alias ? { alias: this.action.alias } : {}),
      ...ev.detail.value,
    };
    fireEvent(this, "value-changed", { value });
  }

  private _switchUiMode() {
    this._warnings = undefined;
    this._yamlMode = false;
  }

  private _switchYamlMode() {
    this._warnings = undefined;
    this._yamlMode = true;
  }

  private _renameAction = async (): Promise<void> => {
    const alias = await showPromptDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.automation.editor.actions.change_alias"
      ),
      inputLabel: this.hass.localize(
        "ui.panel.config.automation.editor.actions.alias"
      ),
      inputType: "string",
      placeholder: capitalizeFirstLetter(
        describeAction(
          this.hass,
          this._entityReg,
          this._labelReg,
          this._floorReg,
          this.action,
          undefined,
          true
        )
      ),
      defaultValue: this.action.alias,
      confirmText: this.hass.localize("ui.common.submit"),
    });
    if (alias !== null) {
      const value = { ...this.action };
      if (alias === "") {
        delete value.alias;
      } else {
        value.alias = alias;
      }
      fireEvent(this, "value-changed", {
        value,
      });
      if (this._yamlMode) {
        this._yamlEditor?.setValue(value);
      }
    }
  };

  private _duplicateAction = () => {
    fireEvent(this, "duplicate");
  };

  private _copyAction = () => {
    this._setClipboard();
  };

  private _cutAction = () => {
    this._setClipboard();
    fireEvent(this, "value-changed", { value: null });
  };

  private _moveUp = () => {
    fireEvent(this, "move-up");
  };

  private _moveDown = () => {
    fireEvent(this, "move-down");
  };

  private _toggleYamlMode = () => {
    if (this._yamlMode) {
      this._switchUiMode();
    } else {
      this._switchYamlMode();
    }
    this.expand();
  };

  public expand() {
    this.updateComplete.then(() => {
      this.shadowRoot!.querySelector("ha-expansion-panel")!.expanded = true;
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-icon-button {
          --mdc-theme-text-primary-on-background: var(--primary-text-color);
        }
        .disabled {
          opacity: 0.5;
          pointer-events: none;
        }
        ha-expansion-panel {
          --expansion-panel-summary-padding: 0 0 0 8px;
          --expansion-panel-content-padding: 0;
        }
        h3 {
          margin: 0;
          font-size: inherit;
          font-weight: inherit;
        }
        .action-icon {
          display: none;
        }
        @media (min-width: 870px) {
          .action-icon {
            display: inline-block;
            color: var(--secondary-text-color);
            opacity: 0.9;
          }
        }
        .card-content {
          padding: 16px;
        }
        .disabled-bar {
          background: var(--divider-color, #e0e0e0);
          text-align: center;
          border-top-right-radius: calc(
            var(--ha-card-border-radius, 12px) - var(
                --ha-card-border-width,
                1px
              )
          );
          border-top-left-radius: calc(
            var(--ha-card-border-radius, 12px) - var(
                --ha-card-border-width,
                1px
              )
          );
        }
        .warning ul {
          margin: 4px 0;
        }
        ha-md-menu-item > ha-svg-icon {
          --mdc-icon-size: 24px;
        }
        ha-tooltip {
          cursor: default;
        }
        :host([highlight]) ha-card {
          --shadow-default: var(--ha-card-box-shadow, 0 0 0 0 transparent);
          --shadow-focus: 0 0 0 1px var(--state-inactive-color);
          border-color: var(--state-inactive-color);
          box-shadow: var(--shadow-default), var(--shadow-focus);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-row": HaAutomationActionRow;
  }
}
