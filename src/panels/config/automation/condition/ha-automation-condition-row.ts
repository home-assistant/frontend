import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
// tslint:disable-next-line
import { PaperListboxElement } from "@polymer/paper-listbox/paper-listbox";
import "@polymer/paper-menu-button/paper-menu-button";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
} from "lit-element";
import { dynamicElement } from "../../../../common/dom/dynamic-element-directive";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-card";
import { HomeAssistant } from "../../../../types";

import "./types/ha-automation-condition-device";
import "./types/ha-automation-condition-state";
import "./types/ha-automation-condition-numeric_state";
import "./types/ha-automation-condition-sun";
import "./types/ha-automation-condition-template";
import "./types/ha-automation-condition-time";
import "./types/ha-automation-condition-zone";
import "./types/ha-automation-condition-and";
import "./types/ha-automation-condition-or";
import { DeviceCondition } from "../../../../data/device_automation";

const OPTIONS = [
  "device",
  "and",
  "or",
  "state",
  "numeric_state",
  "sun",
  "template",
  "time",
  "zone",
];

export interface LogicalCondition {
  condition: "and" | "or";
  conditions: Condition[];
}

export interface StateCondition {
  condition: "state";
  entity_id: string;
  state: string | number;
}

export interface NumericStateCondition {
  condition: "numeric_state";
  entity_id: string;
  above?: number;
  below?: number;
  value_template?: string;
}

export interface SunCondition {
  condition: "sun";
  after_offset: number;
  before_offset: number;
  after: "sunrise" | "sunset";
  before: "sunrise" | "sunset";
}

export interface ZoneCondition {
  condition: "zone";
  entity_id: string;
  zone: string;
}

export interface TimeCondition {
  condition: "time";
  after: string;
  before: string;
}

export interface TemplateCondition {
  condition: "template";
  value_template: string;
}

export type Condition =
  | StateCondition
  | NumericStateCondition
  | SunCondition
  | ZoneCondition
  | TimeCondition
  | TemplateCondition
  | DeviceCondition
  | LogicalCondition;

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
    const selected = OPTIONS.indexOf(this.condition.condition);
    if (selected === -1) {
      this._yamlMode = true;
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
                <paper-item @click=${this._switchYamlMode}>
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
                <paper-item @click=${this._onDelete}>
                  ${this.hass.localize(
                    "ui.panel.config.automation.editor.conditions.delete"
                  )}
                </paper-item>
              </paper-listbox>
            </paper-menu-button>
          </div>
          ${this._yamlMode
            ? html`
                <div style="margin-right: 24px;">
                  ${selected === -1
                    ? html`
                        ${this.hass.localize(
                          "ui.panel.config.automation.editor.conditions.unsupported_condition",
                          "condition",
                          this.condition.condition
                        )}
                      `
                    : ""}
                  <ha-yaml-editor
                    .value=${this.condition}
                    @value-changed=${this._onYamlChange}
                  ></ha-yaml-editor>
                </div>
              `
            : html`
                <paper-dropdown-menu-light
                  .label=${this.hass.localize(
                    "ui.panel.config.automation.editor.conditions.type_select"
                  )}
                  no-animations
                >
                  <paper-listbox
                    slot="dropdown-content"
                    .selected=${selected}
                    @iron-select=${this._typeChanged}
                  >
                    ${OPTIONS.map(
                      (opt) => html`
                        <paper-item .condition=${opt}>
                          ${this.hass.localize(
                            `ui.panel.config.automation.editor.conditions.type.${opt}.label`
                          )}
                        </paper-item>
                      `
                    )}
                  </paper-listbox>
                </paper-dropdown-menu-light>
                <div>
                  ${dynamicElement(
                    `ha-automation-condition-${this.condition.condition}`,
                    { hass: this.hass, condition: this.condition }
                  )}
                </div>
              `}
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

  private _typeChanged(ev: CustomEvent) {
    const type = ((ev.target as PaperListboxElement)?.selectedItem as any)
      ?.condition;

    if (!type) {
      return;
    }

    const elClass = customElements.get(`ha-automation-condition-${type}`);

    if (type !== this.condition.condition) {
      fireEvent(this, "value-changed", {
        value: {
          condition: type,
          ...elClass.defaultConfig,
        },
      });
    }
  }

  private _onYamlChange(ev: CustomEvent) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", { value: ev.detail.value });
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
