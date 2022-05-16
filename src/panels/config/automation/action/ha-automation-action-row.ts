import { ActionDetail } from "@material/mwc-list/mwc-list-foundation";
import "@material/mwc-list/mwc-list-item";
import { mdiArrowDown, mdiArrowUp, mdiDotsVertical } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { dynamicElement } from "../../../../common/dom/dynamic-element-directive";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stringCompare } from "../../../../common/string/compare";
import { handleStructError } from "../../../../common/structs/handle-errors";
import { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-alert";
import "../../../../components/ha-button-menu";
import "../../../../components/ha-card";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-select";
import type { HaSelect } from "../../../../components/ha-select";
import type { HaYamlEditor } from "../../../../components/ha-yaml-editor";
import { validateConfig } from "../../../../data/config";
import { Action, getActionType } from "../../../../data/script";
import { callExecuteScript } from "../../../../data/service";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { showToast } from "../../../../util/toast";
import "./types/ha-automation-action-activate_scene";
import "./types/ha-automation-action-choose";
import "./types/ha-automation-action-condition";
import "./types/ha-automation-action-delay";
import "./types/ha-automation-action-device_id";
import "./types/ha-automation-action-event";
import "./types/ha-automation-action-if";
import "./types/ha-automation-action-parallel";
import "./types/ha-automation-action-play_media";
import "./types/ha-automation-action-repeat";
import "./types/ha-automation-action-service";
import "./types/ha-automation-action-stop";
import "./types/ha-automation-action-wait_for_trigger";
import "./types/ha-automation-action-wait_template";

const OPTIONS = [
  "condition",
  "delay",
  "event",
  "play_media",
  "activate_scene",
  "service",
  "wait_template",
  "wait_for_trigger",
  "repeat",
  "choose",
  "if",
  "device_id",
  "stop",
  "parallel",
];

const getType = (action: Action | undefined) => {
  if (!action) {
    return undefined;
  }
  if ("service" in action || "scene" in action) {
    return getActionType(action);
  }
  if (["and", "or", "not"].some((key) => key in action)) {
    return "condition";
  }
  return OPTIONS.find((option) => option in action);
};

declare global {
  // for fire event
  interface HASSDomEvents {
    "move-action": { direction: "up" | "down" };
  }
}

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

@customElement("ha-automation-action-row")
export default class HaAutomationActionRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public action!: Action;

  @property() public index!: number;

  @property() public totalActions!: number;

  @property({ type: Boolean }) public narrow = false;

  @state() private _warnings?: string[];

  @state() private _uiModeAvailable = true;

  @state() private _yamlMode = false;

  @query("ha-yaml-editor") private _yamlEditor?: HaYamlEditor;

  private _processedTypes = memoizeOne(
    (localize: LocalizeFunc): [string, string][] =>
      OPTIONS.map(
        (action) =>
          [
            action,
            localize(
              `ui.panel.config.automation.editor.actions.type.${action}.label`
            ),
          ] as [string, string]
      ).sort((a, b) => stringCompare(a[1], b[1]))
  );

  protected willUpdate(changedProperties: PropertyValues) {
    if (!changedProperties.has("action")) {
      return;
    }
    this._uiModeAvailable = getType(this.action) !== undefined;
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
    const type = getType(this.action);
    const yamlMode = this._yamlMode;

    return html`
      <ha-card outlined>
        ${this.action.enabled === false
          ? html`<div class="disabled-bar">
              ${this.hass.localize(
                "ui.panel.config.automation.editor.actions.disabled"
              )}
            </div>`
          : ""}
        <div class="card-menu">
          ${this.index !== 0
            ? html`
                <ha-icon-button
                  .label=${this.hass.localize(
                    "ui.panel.config.automation.editor.move_up"
                  )}
                  .path=${mdiArrowUp}
                  @click=${this._moveUp}
                ></ha-icon-button>
              `
            : ""}
          ${this.index !== this.totalActions - 1
            ? html`
                <ha-icon-button
                  .label=${this.hass.localize(
                    "ui.panel.config.automation.editor.move_down"
                  )}
                  .path=${mdiArrowDown}
                  @click=${this._moveDown}
                ></ha-icon-button>
              `
            : ""}
          <ha-button-menu corner="BOTTOM_START" @action=${this._handleAction}>
            <ha-icon-button
              slot="trigger"
              .label=${this.hass.localize("ui.common.menu")}
              .path=${mdiDotsVertical}
            ></ha-icon-button>
            <mwc-list-item>
              ${this.hass.localize(
                "ui.panel.config.automation.editor.actions.run_action"
              )}
            </mwc-list-item>
            <mwc-list-item .disabled=${!this._uiModeAvailable}>
              ${yamlMode
                ? this.hass.localize(
                    "ui.panel.config.automation.editor.edit_ui"
                  )
                : this.hass.localize(
                    "ui.panel.config.automation.editor.edit_yaml"
                  )}
            </mwc-list-item>
            <mwc-list-item>
              ${this.hass.localize(
                "ui.panel.config.automation.editor.actions.duplicate"
              )}
            </mwc-list-item>
            <mwc-list-item>
              ${this.action.enabled === false
                ? this.hass.localize(
                    "ui.panel.config.automation.editor.actions.enable"
                  )
                : this.hass.localize(
                    "ui.panel.config.automation.editor.actions.disable"
                  )}
            </mwc-list-item>
            <mwc-list-item class="warning">
              ${this.hass.localize(
                "ui.panel.config.automation.editor.actions.delete"
              )}
            </mwc-list-item>
          </ha-button-menu>
        </div>
        <div
          class="card-content ${this.action.enabled === false
            ? "disabled"
            : ""}"
        >
          ${this._warnings
            ? html`<ha-alert
                alert-type="warning"
                .title=${this.hass.localize(
                  "ui.errors.config.editor_not_supported"
                )}
              >
                ${this._warnings!.length > 0 && this._warnings![0] !== undefined
                  ? html` <ul>
                      ${this._warnings!.map(
                        (warning) => html`<li>${warning}</li>`
                      )}
                    </ul>`
                  : ""}
                ${this.hass.localize("ui.errors.config.edit_in_yaml_supported")}
              </ha-alert>`
            : ""}
          ${yamlMode
            ? html`
                ${type === undefined
                  ? html`
                      ${this.hass.localize(
                        "ui.panel.config.automation.editor.actions.unsupported_action",
                        "action",
                        type
                      )}
                    `
                  : ""}
                <h2>
                  ${this.hass.localize(
                    "ui.panel.config.automation.editor.edit_yaml"
                  )}
                </h2>
                <ha-yaml-editor
                  .hass=${this.hass}
                  .defaultValue=${this.action}
                  @value-changed=${this._onYamlChange}
                ></ha-yaml-editor>
              `
            : html`
                <ha-select
                  .label=${this.hass.localize(
                    "ui.panel.config.automation.editor.actions.type_select"
                  )}
                  .value=${getType(this.action)}
                  naturalMenuWidth
                  @selected=${this._typeChanged}
                >
                  ${this._processedTypes(this.hass.localize).map(
                    ([opt, label]) => html`
                      <mwc-list-item .value=${opt}>${label}</mwc-list-item>
                    `
                  )}
                </ha-select>

                <div @ui-mode-not-available=${this._handleUiModeNotAvailable}>
                  ${dynamicElement(`ha-automation-action-${type}`, {
                    hass: this.hass,
                    action: this.action,
                    narrow: this.narrow,
                  })}
                </div>
              `}
        </div>
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

  private _moveUp() {
    fireEvent(this, "move-action", { direction: "up" });
  }

  private _moveDown() {
    fireEvent(this, "move-action", { direction: "down" });
  }

  private _handleAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        this._runAction();
        break;
      case 1:
        this._switchYamlMode();
        break;
      case 2:
        fireEvent(this, "duplicate");
        break;
      case 3:
        this._onDisable();
        break;
      case 4:
        this._onDelete();
        break;
    }
  }

  private _onDisable() {
    const enabled = !(this.action.enabled ?? true);
    const value = { ...this.action, enabled };
    fireEvent(this, "value-changed", { value });
    if (this._yamlMode) {
      this._yamlEditor?.setValue(value);
    }
  }

  private async _runAction() {
    const validated = await validateConfig(this.hass, {
      action: this.action,
    });

    if (!validated.action.valid) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.automation.editor.actions.invalid_action"
        ),
        text: validated.action.error,
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
  }

  private _onDelete() {
    showConfirmationDialog(this, {
      text: this.hass.localize(
        "ui.panel.config.automation.editor.actions.delete_confirm"
      ),
      dismissText: this.hass.localize("ui.common.cancel"),
      confirmText: this.hass.localize("ui.common.delete"),
      confirm: () => {
        fireEvent(this, "value-changed", { value: null });
      },
    });
  }

  private _typeChanged(ev: CustomEvent) {
    const type = (ev.target as HaSelect).value;

    if (!type) {
      return;
    }

    this._uiModeAvailable = OPTIONS.includes(type);
    if (!this._uiModeAvailable && !this._yamlMode) {
      this._yamlMode = false;
    }

    if (type !== getType(this.action)) {
      const elClass = customElements.get(
        `ha-automation-action-${type}`
      ) as CustomElementConstructor & { defaultConfig: Action };

      fireEvent(this, "value-changed", {
        value: {
          ...elClass.defaultConfig,
        },
      });
    }
  }

  private _onYamlChange(ev: CustomEvent) {
    ev.stopPropagation();
    if (!ev.detail.isValid) {
      return;
    }
    fireEvent(this, "value-changed", { value: ev.detail.value });
  }

  private _switchYamlMode() {
    this._warnings = undefined;
    this._yamlMode = !this._yamlMode;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .disabled {
          opacity: 0.5;
          pointer-events: none;
        }
        .card-content {
          padding-top: 16px;
          margin-top: 0;
        }
        .disabled-bar {
          background: var(--divider-color, #e0e0e0);
          text-align: center;
          border-top-right-radius: var(--ha-card-border-radius);
          border-top-left-radius: var(--ha-card-border-radius);
        }
        .card-menu {
          float: var(--float-end, right);
          z-index: 3;
          margin: 4px;
          --mdc-theme-text-primary-on-background: var(--primary-text-color);
          display: flex;
          align-items: center;
        }
        mwc-list-item[disabled] {
          --mdc-theme-text-primary-on-background: var(--disabled-text-color);
        }
        .warning {
          margin-bottom: 8px;
        }
        .warning ul {
          margin: 4px 0;
        }
        ha-select {
          margin-bottom: 24px;
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
