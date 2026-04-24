import { consume } from "@lit/context";
import type { PropertyValues } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { assert, literal, number, object, optional, string } from "superstruct";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import "../../../../../components/ha-form/ha-form";
import type {
  SchemaUnion,
  HaFormSchema,
} from "../../../../../components/ha-form/types";
import { NON_NUMERIC_ATTRIBUTES } from "../../../../../data/entity/entity_attributes";
import type { HomeAssistant } from "../../../../../types";
import type {
  NumericStateCondition,
  StateCondition,
} from "../../../common/validate-condition";
import type { ConditionsEntityContext } from "../context";
import { conditionsEntityContext } from "../context";
import type { EntityMode } from "../entity-mode";
import {
  entityModeSchemaField,
  getCurrentEntityLabel,
  resolveEntityMode,
} from "../entity-mode";

const numericStateConditionStruct = object({
  condition: literal("numeric_state"),
  entity: optional(string()),
  attribute: optional(string()),
  above: optional(number()),
  below: optional(number()),
});

interface NumericStateConditionData {
  condition: "numeric_state";
  entity?: string;
  entity_mode?: EntityMode;
  attribute?: string;
  above?: number | string;
  below?: number | string;
}

@customElement("ha-card-condition-numeric_state")
export class HaCardConditionNumericState extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: NumericStateCondition;

  @property({ type: Boolean }) public disabled = false;

  @state()
  @consume({ context: conditionsEntityContext, subscribe: true })
  private _entityContext?: ConditionsEntityContext;

  @state() private _entityMode?: EntityMode;

  public static get defaultConfig(): NumericStateCondition {
    return { condition: "numeric_state", entity: "" };
  }

  protected static validateUIConfig(condition: StateCondition) {
    return assert(condition, numericStateConditionStruct);
  }

  protected willUpdate(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has("condition") && this._entityMode === undefined) {
      this._entityMode = this.condition.entity ? "specific" : "current";
    }
  }

  private _schema = memoizeOne(
    (
      localize: LocalizeFunc,
      currentEntityLabel: string | undefined,
      showEntityPicker: boolean,
      unit?: string
    ) => {
      const modeField = currentEntityLabel
        ? entityModeSchemaField(localize, currentEntityLabel)
        : undefined;
      const entityField = showEntityPicker
        ? { name: "entity", selector: { entity: {} } }
        : undefined;
      const attributeField = showEntityPicker
        ? {
            name: "attribute",
            selector: {
              attribute: {
                hide_attributes: NON_NUMERIC_ATTRIBUTES,
              },
            },
            context: {
              filter_entity: "entity",
            },
          }
        : undefined;

      return [
        ...(modeField ? [modeField] : []),
        ...(entityField ? [entityField] : []),
        ...(attributeField ? [attributeField] : []),
        {
          name: "",
          type: "grid",
          schema: [
            {
              name: "above",
              selector: {
                number: {
                  step: "any",
                  mode: "box",
                  unit_of_measurement: unit,
                },
              },
            },
            {
              name: "below",
              selector: {
                number: {
                  step: "any",
                  mode: "box",
                  unit_of_measurement: unit,
                },
              },
            },
          ],
        },
      ] as const satisfies readonly HaFormSchema[];
    }
  );

  protected render() {
    const { currentEntityId, entityMode } = resolveEntityMode(
      this._entityContext,
      this._entityMode,
      this.condition.entity
    );

    const effectiveEntityId =
      entityMode === "current" ? currentEntityId : this.condition.entity;
    const stateObj = effectiveEntityId
      ? this.hass.states[effectiveEntityId]
      : undefined;

    const unit = this.condition.attribute
      ? undefined
      : stateObj?.attributes.unit_of_measurement;

    const currentEntityLabel = getCurrentEntityLabel(
      this.hass,
      currentEntityId
    );
    const showEntityPicker =
      this._entityContext?.mode !== "filter" && entityMode !== "current";

    const data: NumericStateConditionData = {
      ...this.condition,
      entity_mode: entityMode,
    };

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${this._schema(
          this.hass.localize,
          currentEntityLabel,
          showEntityPicker,
          unit
        )}
        .disabled=${this.disabled}
        @value-changed=${this._valueChanged}
        .computeLabel=${this._computeLabelCallback}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const data = { ...ev.detail.value } as NumericStateConditionData;
    const { entity_mode, entity, ...rest } = data;

    this._entityMode = entity_mode;

    const condition: NumericStateCondition = {
      ...rest,
      ...(entity_mode !== "current" && entity ? { entity } : {}),
    };

    if (!condition.attribute) {
      delete condition.attribute;
    }

    fireEvent(this, "value-changed", { value: condition });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ): string => {
    switch (schema.name) {
      case "entity":
      case "entity_mode":
        return this.hass.localize("ui.components.entity.entity-picker.entity");
      case "attribute":
        return this.hass.localize(
          "ui.panel.lovelace.editor.condition-editor.condition.numeric_state.attribute"
        );
      case "below":
      case "above":
        return this.hass.localize(
          `ui.panel.lovelace.editor.condition-editor.condition.numeric_state.${schema.name}`
        );
      default:
        return "";
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-card-condition-numeric_state": HaCardConditionNumericState;
  }
}
