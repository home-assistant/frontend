import type { PropertyValues } from "lit";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { assert, literal, object, optional, string } from "superstruct";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import "../../../../../components/ha-form/ha-form";
import type {
  SchemaUnion,
  HaFormSchema,
} from "../../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../../types";
import type { AttributeCondition } from "../../../common/validate-condition";

const attributeConditionStruct = object({
  condition: literal("attribute"),
  entity: optional(string()),
  attribute: optional(string()),
  attribute_value: optional(string()),
  attribute_value_not: optional(string()),
});

interface AttributeConditionData {
  condition: "attribute";
  entity?: string;
  attribute?: string;
  invert: "true" | "false";
  attribute_value?: string | string[];
}

@customElement("ha-card-condition-attribute")
export class HaCardConditionAttribute extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: AttributeCondition;

  @property({ type: Boolean }) public disabled = false;

  public static get defaultConfig(): AttributeCondition {
    return {
      condition: "attribute",
      entity: "",
      attribute: "",
      attribute_value: "",
    };
  }

  protected static validateUIConfig(condition: AttributeCondition) {
    return assert(condition, attributeConditionStruct);
  }

  protected willUpdate(changedProperties: PropertyValues): void {
    if (!changedProperties.has("condition")) {
      return;
    }
    try {
      assert(this.condition, attributeConditionStruct);
    } catch (err: any) {
      fireEvent(this, "ui-mode-not-available", err);
    }
  }

  private _schema = memoizeOne(
    (localize: LocalizeFunc) =>
      [
        { name: "entity", selector: { entity: {} } },
        {
          name: "attribute",
          selector: { attribute: {} },
          context: {
            filter_entity: "entity",
          },
        },
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
                        "ui.panel.lovelace.editor.condition-editor.condition.attribute.attribute_equal"
                      ),
                      value: "false",
                    },
                    {
                      label: localize(
                        "ui.panel.lovelace.editor.condition-editor.condition.attribute.attribute_not_equal"
                      ),
                      value: "true",
                    },
                  ],
                },
              },
            },
            {
              name: "attribute_value",
              selector: { text: {} },
            },
          ],
        },
      ] as const satisfies readonly HaFormSchema[]
  );

  protected render() {
    const { attribute_value, attribute_value_not, ...content } = this.condition;

    const data: AttributeConditionData = {
      ...content,
      entity: this.condition.entity,
      attribute: this.condition.attribute,
      invert: attribute_value_not !== undefined ? "true" : "false",
      attribute_value: attribute_value_not ?? attribute_value,
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
    const data = ev.detail.value as AttributeConditionData;

    const { invert, attribute_value, condition: _, ...content } = data;

    const condition: AttributeCondition = {
      condition: "attribute",
      ...content,
      attribute_value: invert === "false" ? (attribute_value ?? "") : undefined,
      attribute_value_not:
        invert === "true" ? (attribute_value ?? "") : undefined,
    };

    fireEvent(this, "value-changed", { value: condition });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ): string => {
    switch (schema.name) {
      case "entity":
        return this.hass.localize("ui.components.entity.entity-picker.entity");
      case "attribute":
        return this.hass.localize(
          "ui.components.entity.entity-attribute-picker.attribute"
        );
      default:
        return "";
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-card-condition-attribute": HaCardConditionAttribute;
  }
}
