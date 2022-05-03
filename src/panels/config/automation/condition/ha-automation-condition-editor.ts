import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { dynamicElement } from "../../../../common/dom/dynamic-element-directive";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stringCompare } from "../../../../common/string/compare";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-select";
import type { HaSelect } from "../../../../components/ha-select";
import "../../../../components/ha-yaml-editor";
import type { Condition } from "../../../../data/automation";
import { expandConditionWithShorthand } from "../../../../data/automation";
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

  @property() condition!: Condition;

  @property() public yamlMode = false;

  private _processedCondition = memoizeOne((condition) =>
    expandConditionWithShorthand(condition)
  );

  private _processedTypes = memoizeOne(
    (localize: LocalizeFunc): [string, string][] =>
      OPTIONS.map(
        (condition) =>
          [
            condition,
            localize(
              `ui.panel.config.automation.editor.conditions.type.${condition}.label`
            ),
          ] as [string, string]
      ).sort((a, b) => stringCompare(a[1], b[1]))
  );

  protected render() {
    const condition = this._processedCondition(this.condition);
    const selected = OPTIONS.indexOf(condition.condition);
    const yamlMode = this.yamlMode || selected === -1;
    return html`
      ${yamlMode
        ? html`
            ${selected === -1
              ? html`
                  ${this.hass.localize(
                    "ui.panel.config.automation.editor.conditions.unsupported_condition",
                    "condition",
                    condition.condition
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
              .defaultValue=${this.condition}
              @value-changed=${this._onYamlChange}
            ></ha-yaml-editor>
          `
        : html`
            <ha-select
              .label=${this.hass.localize(
                "ui.panel.config.automation.editor.conditions.type_select"
              )}
              .value=${condition.condition}
              naturalMenuWidth
              @selected=${this._typeChanged}
            >
              ${this._processedTypes(this.hass.localize).map(
                ([opt, label]) => html`
                  <mwc-list-item .value=${opt}>${label}</mwc-list-item>
                `
              )}
            </ha-select>

            <div>
              ${dynamicElement(
                `ha-automation-condition-${condition.condition}`,
                { hass: this.hass, condition: condition }
              )}
            </div>
          `}
    `;
  }

  private _typeChanged(ev: CustomEvent) {
    const type = (ev.target as HaSelect).value;

    if (!type) {
      return;
    }

    const elClass = customElements.get(
      `ha-automation-condition-${type}`
    ) as CustomElementConstructor & {
      defaultConfig: Omit<Condition, "condition">;
    };

    if (type !== this._processedCondition(this.condition).condition) {
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
    // @ts-ignore
    fireEvent(this, "value-changed", { value: ev.detail.value, yaml: true });
  }

  static styles = [
    haStyle,
    css`
      ha-select {
        margin-bottom: 24px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-editor": HaAutomationConditionEditor;
  }
}
