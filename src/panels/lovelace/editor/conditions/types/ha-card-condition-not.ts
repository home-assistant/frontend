import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { any, array, assert, literal, object, optional } from "superstruct";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-form/ha-form";
import type { HomeAssistant } from "../../../../../types";
import type {
  NotCondition,
  Condition,
  StateCondition,
} from "../../../common/validate-condition";
import "../ha-card-conditions-editor";

const notConditionStruct = object({
  condition: literal("not"),
  conditions: optional(array(any())),
});

@customElement("ha-card-condition-not")
export class HaCardConditionNot extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: NotCondition;

  @property({ type: Boolean }) public disabled = false;

  public static get defaultConfig(): NotCondition {
    return { condition: "not", conditions: [] };
  }

  protected static validateUIConfig(condition: StateCondition) {
    return assert(condition, notConditionStruct);
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
    const conditions = ev.detail.value as Condition[];
    const condition = {
      ...this.condition,
      conditions,
    };
    fireEvent(this, "value-changed", { value: condition });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-card-condition-not": HaCardConditionNot;
  }
}
