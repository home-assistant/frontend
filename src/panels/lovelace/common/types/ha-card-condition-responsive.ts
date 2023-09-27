import { html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import { assert, literal, number, object, optional } from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import { HaFormSchema } from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import { ResponsiveCondition } from "../validate-condition";

const responsiveConditionStruct = object({
  condition: literal("responsive"),
  max_width: optional(number()),
  min_width: optional(number()),
});

const SCHEMA = [
  {
    name: "",
    type: "grid",
    schema: [
      {
        name: "min_width",
        selector: {
          number: {
            mode: "box",
            step: 1,
            unit_of_measurement: "px",
          },
        },
      },
      {
        name: "max_width",
        selector: {
          number: {
            mode: "box",
            step: 1,
            unit_of_measurement: "px",
          },
        },
      },
    ],
  },
] as const satisfies readonly HaFormSchema[];

@customElement("ha-card-condition-responsive")
export class HaCardConditionResponsive extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: ResponsiveCondition;

  @property({ type: Boolean }) public disabled = false;

  public static get defaultConfig(): ResponsiveCondition {
    return { condition: "responsive" };
  }

  protected willUpdate(changedProperties: PropertyValues): void {
    if (!changedProperties.has("condition")) {
      return;
    }
    try {
      assert(this.condition, responsiveConditionStruct);
    } catch (err: any) {
      fireEvent(this, "ui-mode-not-available", err);
    }
  }

  protected render() {
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this.condition}
        .schema=${SCHEMA}
        .disabled=${this.disabled}
        @value-changed=${this._valueChanged}
        .computeLabel=${this._computeLabelCallback}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const data = ev.detail.value as ResponsiveCondition;
    fireEvent(this, "value-changed", { value: data });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<typeof SCHEMA>
  ): string => {
    switch (schema.name) {
      case "min_width":
      case "max_width":
        return this.hass.localize(
          `ui.panel.lovelace.editor.card.conditional.${schema.name}`
        );
      default:
        return "";
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-card-condition-responsive": HaCardConditionResponsive;
  }
}
