import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-menu-button/paper-menu-button";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
} from "lit-element";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-card";
import { HomeAssistant } from "../../../../types";

import "./ha-automation-condition-editor";
import { Condition } from "../../../../data/automation";

export interface ConditionElement extends LitElement {
  condition: Condition;
}

export const handleChangeEvent = (
  element: ConditionElement,
  ev: CustomEvent
) => {
  ev.stopPropagation();
  const name = (ev.target as any)?.name;
  if (!name) {
    return;
  }
  const newVal = ev.detail.value;

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
  @property() public hass!: HomeAssistant;
  @property() public condition!: Condition;
  @property() private _yamlMode = false;

  protected render() {
    if (!this.condition) {
      return html``;
    }
    return html`
      <ha-card>
        <div class="card-content">
          <div class="card-menu">
            <paper-menu-button
              no-animations
              horizontal-align="right"
              horizontal-offset="-5"
              vertical-offset="-5"
              close-on-activate
            >
              <paper-icon-button
                icon="hass:dots-vertical"
                slot="dropdown-trigger"
              ></paper-icon-button>
              <paper-listbox slot="dropdown-content">
                <paper-item @tap=${this._switchYamlMode}>
                  ${this._yamlMode
                    ? this.hass.localize(
                        "ui.panel.config.automation.editor.edit_ui"
                      )
                    : this.hass.localize(
                        "ui.panel.config.automation.editor.edit_yaml"
                      )}
                </paper-item>
                <paper-item disabled>
                  ${this.hass.localize(
                    "ui.panel.config.automation.editor.conditions.duplicate"
                  )}
                </paper-item>
                <paper-item @tap=${this._onDelete}>
                  ${this.hass.localize(
                    "ui.panel.config.automation.editor.conditions.delete"
                  )}
                </paper-item>
              </paper-listbox>
            </paper-menu-button>
          </div>
          <ha-automation-condition-editor
            .yamlMode=${this._yamlMode}
            .hass=${this.hass}
            .condition=${this.condition}
          ></ha-automation-condition-editor>
        </div>
      </ha-card>
    `;
  }

  private _onDelete() {
    if (
      confirm(
        this.hass.localize(
          "ui.panel.config.automation.editor.conditions.delete_confirm"
        )
      )
    ) {
      fireEvent(this, "value-changed", { value: null });
    }
  }

  private _switchYamlMode() {
    this._yamlMode = !this._yamlMode;
  }

  static get styles(): CSSResult {
    return css`
      .card-menu {
        position: absolute;
        top: 0;
        right: 0;
        z-index: 3;
        color: var(--primary-text-color);
      }
      .rtl .card-menu {
        right: auto;
        left: 0;
      }
      .card-menu paper-item {
        cursor: pointer;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-row": HaAutomationConditionRow;
  }
}
