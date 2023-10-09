import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { dynamicElement } from "../../../../common/dom/dynamic-element-directive";
import { fireEvent } from "../../../../common/dom/fire_event";
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

@customElement("ha-automation-condition-editor")
export default class HaAutomationConditionEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) condition!: Condition;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public yamlMode = false;

  @property({ type: Boolean }) public reOrderMode = false;

  private _processedCondition = memoizeOne((condition) =>
    expandConditionWithShorthand(condition)
  );

  protected render() {
    const condition = this._processedCondition(this.condition);
    const supported =
      customElements.get(`ha-automation-condition-${condition.condition}`) !==
      undefined;
    const yamlMode = this.yamlMode || !supported;
    return html`
      ${yamlMode
        ? html`
            ${!supported
              ? html`
                  ${this.hass.localize(
                    "ui.panel.config.automation.editor.conditions.unsupported_condition",
                    "condition",
                    condition.condition
                  )}
                `
              : ""}
            <ha-yaml-editor
              .hass=${this.hass}
              .defaultValue=${this.condition}
              @value-changed=${this._onYamlChange}
              .readOnly=${this.disabled}
            ></ha-yaml-editor>
          `
        : html`
            <div @value-changed=${this._onUiChanged}>
              ${dynamicElement(
                `ha-automation-condition-${condition.condition}`,
                {
                  hass: this.hass,
                  condition: condition,
                  reOrderMode: this.reOrderMode,
                  disabled: this.disabled,
                }
              )}
            </div>
          `}
    `;
  }

  private _onYamlChange(ev: CustomEvent) {
    ev.stopPropagation();
    if (!ev.detail.isValid) {
      return;
    }
    // @ts-ignore
    fireEvent(this, "value-changed", { value: ev.detail.value, yaml: true });
  }

  private _onUiChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = {
      ...(this.condition.alias ? { alias: this.condition.alias } : {}),
      ...ev.detail.value,
    };
    fireEvent(this, "value-changed", { value });
  }

  static styles = haStyle;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-editor": HaAutomationConditionEditor;
  }
}
