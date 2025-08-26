import { html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { LogicalCondition } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";
import "../ha-automation-condition";
import type HaAutomationCondition from "../ha-automation-condition";
import type { ConditionElement } from "../ha-automation-condition-row";

@customElement("ha-automation-condition-logical")
export abstract class HaLogicalCondition
  extends LitElement
  implements ConditionElement
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: LogicalCondition;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean, attribute: "sidebar" }) public optionsInSidebar =
    false;

  @query("ha-automation-condition")
  private _conditionElement?: HaAutomationCondition;

  protected render() {
    return html`
      <ha-automation-condition
        .conditions=${this.condition.conditions || []}
        @value-changed=${this._valueChanged}
        .hass=${this.hass}
        .disabled=${this.disabled}
        .optionsInSidebar=${this.optionsInSidebar}
        .narrow=${this.narrow}
      ></ha-automation-condition>
    `;
  }

  public expandAll() {
    this._conditionElement?.expandAll?.();
  }

  public collapseAll() {
    this._conditionElement?.collapseAll?.();
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
