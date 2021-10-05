import "@polymer/paper-dropdown-menu/paper-dropdown-menu-light";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import type { PaperListboxElement } from "@polymer/paper-listbox/paper-listbox";
import { CSSResultGroup, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { dynamicElement } from "../../../../common/dom/dynamic-element-directive";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-card";
import "../../../../components/ha-yaml-editor";
import type { Condition } from "../../../../data/automation";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import "./types/ha-automation-condition-and";
import "./types/ha-automation-condition-device";
import "./types/ha-automation-condition-not";
import "./types/ha-automation-condition-numeric_state";
import "./types/ha-automation-condition-or";
import "./types/ha-automation-condition-state";
import "./types/ha-automation-condition-sun";
import "./types/ha-automation-condition-template";
import "./types/ha-automation-condition-time";
import "./types/ha-automation-condition-trigger";
import "./types/ha-automation-condition-zone";

const OPTIONS = [
  "device",
  "and",
  "or",
  "not",
  "state",
  "numeric_state",
  "sun",
  "template",
  "time",
  "trigger",
  "zone",
];

@customElement("ha-automation-condition-editor")
export default class HaAutomationConditionEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public condition!: Condition;

  @property() public yamlMode = false;

  protected render() {
    const selected = OPTIONS.indexOf(this.condition.condition);
    const yamlMode = this.yamlMode || selected === -1;
    return html`
      ${yamlMode
        ? html`
            ${selected === -1
              ? html`
                  ${this.hass.localize(
                    "ui.panel.config.automation.editor.conditions.unsupported_condition",
                    "condition",
                    this.condition.condition
                  )}
                `
              : ""}
            <h2>
              ${this.hass.localize(
                "ui.panel.config.automation.editor.edit_yaml"
              )}
            </h2>
            <ha-yaml-editor
              .defaultValue=${this.condition}
              @value-changed=${this._onYamlChange}
            ></ha-yaml-editor>
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
    `;
  }

  private _typeChanged(ev: CustomEvent) {
    const type = ((ev.target as PaperListboxElement)?.selectedItem as any)
      ?.condition;

    if (!type) {
      return;
    }

    const elClass = customElements.get(
      `ha-automation-condition-${type}`
    ) as CustomElementConstructor & {
      defaultConfig: Omit<Condition, "condition">;
    };

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
    if (!ev.detail.isValid) {
      return;
    }
    fireEvent(this, "value-changed", { value: ev.detail.value });
  }

  static get styles(): CSSResultGroup {
    return haStyle;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-editor": HaAutomationConditionEditor;
  }
}
