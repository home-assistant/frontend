import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { any, array, assert, literal, object, optional } from "superstruct";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-form/ha-form";
import type { HomeAssistant } from "../../../../../types";
import {
  LovelaceCondition,
  LovelaceOrCondition,
} from "../../../common/conditions/types";
import "../ha-card-conditions-editor";

const orConditionStruct = object({
  condition: literal("or"),
  conditions: optional(array(any())),
});

@customElement("ha-card-condition-or")
export class HaCardConditionOr extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: LovelaceOrCondition;

  @property({ type: Boolean }) public disabled = false;

  public static get defaultConfig(): LovelaceOrCondition {
    return { condition: "or", conditions: [] };
  }

  protected static validateUIConfig(condition: LovelaceOrCondition) {
    return assert(condition, orConditionStruct);
  }

  protected render() {
    return html`
      <ha-card-conditions-editor
        nested
        .hass=${this.hass}
        .conditions=${this.condition.conditions}
        @value-changed=${this._valueChanged}
      >
      </ha-card-conditions-editor>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const conditions = ev.detail.value as LovelaceCondition[];
    const condition = {
      ...this.condition,
      conditions,
    };
    fireEvent(this, "value-changed", { value: condition });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-card-condition-or": HaCardConditionOr;
  }
}
