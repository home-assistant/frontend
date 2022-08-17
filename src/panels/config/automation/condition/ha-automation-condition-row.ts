import { ActionDetail } from "@material/mwc-list/mwc-list-foundation";
import "@material/mwc-list/mwc-list-item";
import { mdiDotsVertical } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../../../common/dom/fire_event";
import { handleStructError } from "../../../../common/structs/handle-errors";
import "../../../../components/ha-button-menu";
import "../../../../components/ha-card";
import "../../../../components/buttons/ha-progress-button";
import type { HaProgressButton } from "../../../../components/buttons/ha-progress-button";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-icon-button-expand";
import { Condition, testCondition } from "../../../../data/automation";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
import "./ha-automation-condition-editor";
import { validateConfig } from "../../../../data/config";
import { HaYamlEditor } from "../../../../components/ha-yaml-editor";
import { describeCondition } from "../../../../data/automation_i18n";

export interface ConditionElement extends LitElement {
  condition: Condition;
}

export const handleChangeEvent = (
  element: ConditionElement,
  ev: CustomEvent
) => {
  ev.stopPropagation();
  const name = (ev.currentTarget as any)?.name;
  if (!name) {
    return;
  }
  const newVal = ev.detail?.value || (ev.currentTarget as any)?.value;

  if ((element.condition[name] || "") === newVal) {
    return;
  }

  let newCondition: Condition;
  if (!newVal) {
    newCondition = { ...element.condition };
    delete newCondition[name];
  } else {
    newCondition = { ...element.condition, [name]: newVal };
  }
  fireEvent(element, "value-changed", { value: newCondition });
};

@customElement("ha-automation-condition-row")
export default class HaAutomationConditionRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public condition!: Condition;

  @state() private _yamlMode = false;

  @state() private _warnings?: string[];

  @state() private _expanded = false;

  @query("ha-yaml-editor") private _yamlEditor?: HaYamlEditor;

  protected render() {
    if (!this.condition) {
      return html``;
    }
    return html`
      <ha-card outlined>
        ${this.condition.enabled === false
          ? html`<div class="disabled-bar">
              ${this.hass.localize(
                "ui.panel.config.automation.editor.actions.disabled"
              )}
            </div>`
          : ""}
        <div class="card-summary">
          <ha-icon-button-expand
            .hass=${this.hass}
            .expanded=${this._expanded}
            @click=${this.toggleExpanded}
          ></ha-icon-button-expand>
          <div class="name" @click=${this.toggleExpanded}>
            ${describeCondition(this.condition)}
          </div>
          <ha-progress-button @click=${this._testCondition}>
            ${this.hass.localize(
              "ui.panel.config.automation.editor.conditions.test"
            )}
          </ha-progress-button>
          <ha-button-menu corner="BOTTOM_START" @action=${this._handleAction}>
            <ha-icon-button
              slot="trigger"
              .label=${this.hass.localize("ui.common.menu")}
              .path=${mdiDotsVertical}
            >
            </ha-icon-button>
            <mwc-list-item>
              ${this._yamlMode
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
              ${this.condition.enabled === false
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
          class=${classMap({
            "card-content": true,
            disabled: this.condition.enabled === false,
            expanded: this._expanded,
          })}
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
          <ha-automation-condition-editor
            @ui-mode-not-available=${this._handleUiModeNotAvailable}
            @value-changed=${this._handleChangeEvent}
            .yamlMode=${this._yamlMode}
            .hass=${this.hass}
            .condition=${this.condition}
          ></ha-automation-condition-editor>
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

  private _handleChangeEvent(ev: CustomEvent) {
    if (ev.detail.yaml) {
      this._warnings = undefined;
    }
  }

  private _handleAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        this._switchYamlMode();
        break;
      case 1:
        fireEvent(this, "duplicate");
        break;
      case 2:
        this._onDisable();
        break;
      case 3:
        this._onDelete();
        break;
    }
  }

  private _onDisable() {
    const enabled = !(this.condition.enabled ?? true);
    const value = { ...this.condition, enabled };
    fireEvent(this, "value-changed", { value });
    if (this._yamlMode) {
      this._yamlEditor?.setValue(value);
    }
  }

  private _onDelete() {
    showConfirmationDialog(this, {
      text: this.hass.localize(
        "ui.panel.config.automation.editor.conditions.delete_confirm"
      ),
      dismissText: this.hass.localize("ui.common.cancel"),
      confirmText: this.hass.localize("ui.common.delete"),
      confirm: () => {
        fireEvent(this, "value-changed", { value: null });
      },
    });
  }

  private _switchYamlMode() {
    this._warnings = undefined;
    this._yamlMode = !this._yamlMode;
  }

  private async _testCondition(ev) {
    const condition = this.condition;
    const button = ev.target as HaProgressButton;
    if (button.progress) {
      return;
    }
    button.progress = true;

    try {
      const validateResult = await validateConfig(this.hass, {
        condition,
      });

      // Abort if condition changed.
      if (this.condition !== condition) {
        return;
      }

      if (!validateResult.condition.valid) {
        showAlertDialog(this, {
          title: this.hass.localize(
            "ui.panel.config.automation.editor.conditions.invalid_condition"
          ),
          text: validateResult.condition.error,
        });
        return;
      }
      let result: { result: boolean };
      try {
        result = await testCondition(this.hass, condition);
      } catch (err: any) {
        if (this.condition !== condition) {
          return;
        }

        showAlertDialog(this, {
          title: this.hass.localize(
            "ui.panel.config.automation.editor.conditions.test_failed"
          ),
          text: err.message,
        });
        return;
      }

      if (this.condition !== condition) {
        return;
      }

      if (result.result) {
        button.actionSuccess();
      } else {
        button.actionError();
      }
    } finally {
      button.progress = false;
    }
  }

  public get expanded() {
    return this._expanded;
  }

  public toggleExpanded() {
    this._expanded = !this._expanded;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .card-summary {
          display: flex;
          align-items: center;
        }
        .card-summary .name {
          flex: 1;
          cursor: pointer;
        }
        .card-summary ha-button-menu,
        .card-summary ha-progress-button {
          --mdc-theme-text-primary-on-background: var(--primary-text-color);
        }
        .disabled {
          opacity: 0.5;
          pointer-events: none;
        }
        .card-content {
          padding-top: 16px;
          margin-top: 0;
          display: none;
        }
        .card-content.expanded {
          display: block;
        }
        .disabled-bar {
          background: var(--divider-color, #e0e0e0);
          text-align: center;
          border-top-right-radius: var(--ha-card-border-radius);
          border-top-left-radius: var(--ha-card-border-radius);
        }
        mwc-list-item[disabled] {
          --mdc-theme-text-primary-on-background: var(--disabled-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-row": HaAutomationConditionRow;
  }
}
