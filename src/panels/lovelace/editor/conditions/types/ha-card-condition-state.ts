import type { PropertyValues } from "lit";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import {
  assert,
  literal,
  object,
  optional,
  string,
  number,
  union,
} from "superstruct";
import { forDictStruct } from "../../../../config/automation/structs";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import "../../../../../components/ha-form/ha-form";
import type {
  SchemaUnion,
  HaFormSchema,
} from "../../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../../types";
import type { StateCondition } from "../../../common/validate-condition";
import type { HaDurationData } from "../../../../../components/ha-duration-input";

const stateConditionStruct = object({
  condition: literal("state"),
  entity: optional(string()),
  state: optional(string()),
  state_not: optional(string()),
  for: optional(union([number(), string(), forDictStruct])),
});

interface StateConditionData {
  condition: "state";
  entity?: string;
  invert: "true" | "false";
  state?: string | string[];
  for?: number | string | HaDurationData;
}

@customElement("ha-card-condition-state")
export class HaCardConditionState extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: StateCondition;

  @property({ type: Boolean }) public disabled = false;

  public static get defaultConfig(): StateCondition {
    return { condition: "state", entity: "", state: "" };
  }

  protected static validateUIConfig(condition: StateCondition) {
    return assert(condition, stateConditionStruct);
  }

  protected willUpdate(changedProperties: PropertyValues): void {
    if (!changedProperties.has("condition")) {
      return;
    }
    try {
      assert(this.condition, stateConditionStruct);
    } catch (err: any) {
      fireEvent(this, "ui-mode-not-available", err);
    }
  }

  private _schema = memoizeOne(
    (localize: LocalizeFunc) =>
      [
        { name: "entity", selector: { entity: {} } },
        {
          name: "",
          type: "grid",
          schema: [
            {
              name: "invert",
              required: true,
              selector: {
                select: {
                  mode: "dropdown",
                  options: [
                    {
                      label: localize(
                        "ui.panel.lovelace.editor.condition-editor.condition.state.state_equal"
                      ),
                      value: "false",
                    },
                    {
                      label: localize(
                        "ui.panel.lovelace.editor.condition-editor.condition.state.state_not_equal"
                      ),
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
            {
              name: "for",
              selector: {
                duration: {},
              },
            },
          ],
        },
      ] as const satisfies readonly HaFormSchema[]
  );

  protected render() {
    const { state, state_not, ...content } = this.condition;

    const data: StateConditionData = {
      ...content,
      entity: this.condition.entity,
      invert: this.condition.state_not !== undefined ? "true" : "false",
      state: this.condition.state_not ?? this.condition.state,
    };

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${this._schema(this.hass.localize)}
        .disabled=${this.disabled}
        @value-changed=${this._valueChanged}
        .computeLabel=${this._computeLabelCallback}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const data = ev.detail.value as StateConditionData;

    const { invert, state, condition: _, ...content } = data;

    const condition: StateCondition = {
      condition: "state",
      ...content,
      state: invert === "false" ? (state ?? "") : undefined,
      state_not: invert === "true" ? (state ?? "") : undefined,
    };

    fireEvent(this, "value-changed", { value: condition });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ): string => {
    switch (schema.name) {
      case "entity":
        return this.hass.localize("ui.components.entity.entity-picker.entity");
      case "state":
        return this.hass.localize(
          "ui.components.entity.entity-state-picker.state"
        );
      case "for":
        return this.hass.localize(
          "ui.panel.lovelace.editor.condition-editor.condition.state.for"
        );
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
