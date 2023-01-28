import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { LogicalCondition } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";
import "../ha-automation-condition";
import type { ConditionElement } from "../ha-automation-condition-row";

@customElement("ha-automation-condition-logical")
export class HaLogicalCondition extends LitElement implements ConditionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: LogicalCondition;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public reOrderMode = false;

  public static get defaultConfig() {
    return {
      conditions: [],
    };
  }

  protected render() {
    return html`
      <ha-automation-condition
        nested
        .conditions=${this.condition.conditions || []}
        @value-changed=${this._valueChanged}
        .hass=${this.hass}
        .disabled=${this.disabled}
        .reOrderMode=${this.reOrderMode}
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
