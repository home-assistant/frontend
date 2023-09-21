import type { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import { HaFormSchema } from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import { StateCondition } from "../validate-condition";

type StateConditionData = {
  condition: "state";
  entity: string;
  invert: "true" | "false";
  state?: string;
};

const SCHEMA = [
  { name: "entity", selector: { entity: {} } },
  {
    name: "",
    type: "grid",
    schema: [
      {
        name: "invert",
        selector: {
          select: {
            mode: "dropdown",
            options: [
              {
                label: "State equal",
                value: "false",
              },
              {
                label: "State not equal",
                value: "true",
              },
            ],
          },
        },
      },
      {
        name: "state",
        selector: {
          state: {},
        },
        context: {
          filter_entity: "entity",
        },
      },
    ],
  },
] as const satisfies readonly HaFormSchema[];

@customElement("ha-card-condition-state")
export class HaCardConditionState extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: StateCondition;

  @property({ type: Boolean }) public disabled = false;

  public static get defaultConfig(): StateCondition {
    return { condition: "state", entity: "", state: "" };
  }

  protected render() {
    const { state, state_not, ...content } = this.condition;

    const data: StateConditionData = {
      ...content,
      invert: this.condition.state_not ? "true" : "false",
      state: this.condition.state_not ?? this.condition.state ?? "",
    };

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${SCHEMA}
        .disabled=${this.disabled}
        @value-changed=${this._valueChanged}
        .computeLabel=${this._computeLabelCallback}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const data = ev.detail.value as StateConditionData;

    const { invert, state, entity, condition: _, ...content } = data;

    const condition: StateCondition = {
      condition: "state",
      ...content,
      entity: entity ?? "",
      state: invert === "false" ? state ?? "" : undefined,
      state_not: invert === "true" ? state ?? "" : undefined,
    };

    fireEvent(this, "value-changed", { value: condition });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<typeof SCHEMA>
  ): string => {
    const entity = this.hass.states[this.condition.entity] as
      | HassEntity
      | undefined;
    switch (schema.name) {
      case "entity":
        return this.hass.localize("ui.components.entity.entity-picker.entity");
      case "state":
        if (entity) {
          return `${this.hass.localize(
            "ui.components.entity.entity-state-picker.state"
          )} (${this.hass.formatEntityState(entity)})`;
        }
        return `${this.hass.localize(
          "ui.components.entity.entity-state-picker.state"
        )}`;

      default:
        return "";
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-card-condition-state": HaCardConditionState;
  }
}
