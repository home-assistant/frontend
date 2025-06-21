import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import {
  assert,
  literal,
  number,
  object,
  optional,
  string,
  union,
} from "superstruct";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-form/ha-form";
import type {
  SchemaUnion,
  HaFormSchema,
} from "../../../../../components/ha-form/types";
import { forDictStruct } from "../../../../config/automation/structs";
import type { HomeAssistant } from "../../../../../types";
import type {
  LastUpdatedStateCondition,
  StateCondition,
} from "../../../common/validate-condition";

const lastUpdatedStateConditionStruct = object({
  condition: literal("last_updated_state"),
  entity: optional(string()),
  within: optional(union([number(), string(), forDictStruct])),
  after: optional(union([number(), string(), forDictStruct])),
});

@customElement("ha-card-condition-last_updated_state")
export class HaCardConditionLastUpdatedState extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: LastUpdatedStateCondition;

  @property({ type: Boolean }) public disabled = false;

  public static get defaultConfig(): LastUpdatedStateCondition {
    return { condition: "last_updated_state", entity: "" };
  }

  protected static validateUIConfig(condition: StateCondition) {
    return assert(condition, lastUpdatedStateConditionStruct);
  }

  private _schema = memoizeOne(
    () =>
      [
        { name: "entity", selector: { entity: {} } },
        {
          name: "",
          type: "grid",
          schema: [
            {
              name: "within",
              selector: {
                duration: {},
              },
            },
            {
              name: "after",
              selector: {
                duration: {},
              },
            },
          ],
        },
      ] as const satisfies readonly HaFormSchema[]
  );

  protected render() {
    const stateObj = this.condition.entity
      ? this.hass.states[this.condition.entity]
      : undefined;

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this.condition}
        .schema=${this._schema(stateObj)}
        .disabled=${this.disabled}
        @value-changed=${this._valueChanged}
        .computeLabel=${this._computeLabelCallback}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const condition = ev.detail.value as LastUpdatedStateCondition;
    fireEvent(this, "value-changed", { value: condition });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ): string => {
    switch (schema.name) {
      case "entity":
        return this.hass.localize("ui.components.entity.entity-picker.entity");
      case "within":
      case "after":
        return this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.state.for"
        );
      default:
        return "";
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-card-condition-last_updated_state": HaCardConditionLastUpdatedState;
  }
}
