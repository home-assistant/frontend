import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type {
  Condition,
  LogicalCondition,
} from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";
import "../ha-automation-condition";
import type { ConditionElement } from "../ha-automation-condition-row";
import { HaStateCondition } from "./ha-automation-condition-state";

@customElement("ha-automation-condition-logical")
export class HaLogicalCondition extends LitElement implements ConditionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: LogicalCondition;

  public static get defaultConfig() {
    return {
      conditions: [
        {
          condition: "state",
          ...HaStateCondition.defaultConfig,
        },
      ] as Condition[],
    };
  }

  protected render() {
    return html`
      <ha-automation-condition
        .conditions=${this.condition.conditions || []}
        @value-changed=${this._valueChanged}
        .hass=${this.hass}
      ></ha-automation-condition>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: { ...this.condition, conditions: ev.detail.value },
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-logical": HaLogicalCondition;
  }
}
