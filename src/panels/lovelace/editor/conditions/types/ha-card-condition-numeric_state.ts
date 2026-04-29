import { consume } from "@lit/context";
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
import { computeStateName } from "../../../../../common/entity/compute_state_name";
import {
  CURRENT_ENTITY_ID,
  currentEntityOption,
} from "../current-entity-option";

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

  public static get defaultConfig(): NumericStateCondition {
    return { condition: "numeric_state", entity: "" };
  }

  protected static validateUIConfig(condition: StateCondition) {
    return assert(condition, numericStateConditionStruct);
  }

  private _schema = memoizeOne(
    (
      localize: LocalizeFunc,
      currentEntityId: string | undefined,
      currentEntityName: string | undefined,
      useCurrentEntity: boolean,
      filterEntityIds: string[] | undefined,
      unit: string | undefined
    ) => {
      const showEntityPicker = filterEntityIds === undefined;
      const currentEntityOpt = currentEntityId
        ? currentEntityOption(localize, currentEntityId, currentEntityName)
        : undefined;
      const fixedEntityIds =
        filterEntityIds ??
        (useCurrentEntity && currentEntityId ? [currentEntityId] : undefined);

      return [
        ...(showEntityPicker
          ? [
              {
                name: "entity",
                selector: {
                  entity: {
                    extra_options: currentEntityOpt
                      ? [currentEntityOpt]
                      : undefined,
                  },
                },
              },
            ]
          : []),
        {
          name: "attribute",
          selector: {
            attribute: {
              hide_attributes: NON_NUMERIC_ATTRIBUTES,
              entity_id: fixedEntityIds,
            },
          },
          context: { filter_entity: "entity" },
        },
        {
          name: "",
          type: "grid",
          schema: [
            {
              name: "above",
              selector: {
                number: { step: "any", mode: "box", unit_of_measurement: unit },
              },
            },
            {
              name: "below",
              selector: {
                number: { step: "any", mode: "box", unit_of_measurement: unit },
              },
            },
          ],
        },
      ] as const satisfies readonly HaFormSchema[];
    }
  );

  protected render() {
    const ctx = this._entityContext;
    const currentEntityId = ctx?.mode === "current" ? ctx.entityId : undefined;
    const filterEntityIds = ctx?.mode === "filter" ? ctx.entityIds : undefined;
    const useCurrentEntity =
      currentEntityId !== undefined && !this.condition.entity;

    const selectedEntityId = useCurrentEntity
      ? currentEntityId
      : this.condition.entity;
    const stateObj = selectedEntityId
      ? this.hass.states[selectedEntityId]
      : undefined;
    const currentStateObj = currentEntityId
      ? this.hass.states[currentEntityId]
      : undefined;
    const currentEntityName = currentStateObj
      ? computeStateName(currentStateObj)
      : undefined;

    const unit = this.condition.attribute
      ? undefined
      : stateObj?.attributes.unit_of_measurement;

    const data: NumericStateConditionData = {
      ...this.condition,
      entity: useCurrentEntity ? CURRENT_ENTITY_ID : this.condition.entity,
    };

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${this._schema(
          this.hass.localize,
          currentEntityId,
          currentEntityName,
          useCurrentEntity,
          filterEntityIds,
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
    const { entity, ...rest } = data;

    const isCurrentEntity = entity === CURRENT_ENTITY_ID;

    const condition: NumericStateCondition = {
      ...rest,
      ...(!isCurrentEntity && entity ? { entity } : {}),
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
