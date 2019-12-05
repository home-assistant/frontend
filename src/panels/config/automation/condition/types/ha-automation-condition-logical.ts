import { customElement, html, LitElement, property } from "lit-element";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { HomeAssistant } from "../../../../../types";
import {
  ConditionElement,
  LogicalCondition,
} from "../ha-automation-condition-row";
import "../ha-automation-condition";

@customElement("ha-automation-condition-logical")
export class HaLogicalCondition extends LitElement implements ConditionElement {
  @property() public hass!: HomeAssistant;
  @property() public condition!: LogicalCondition;

  public static get defaultConfig() {
    return { conditions: [{ condition: "state" }] };
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
