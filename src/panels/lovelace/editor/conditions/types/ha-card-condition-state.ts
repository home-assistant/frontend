import { consume } from "@lit/context";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { assert, literal, object, optional, string } from "superstruct";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import "../../../../../components/ha-form/ha-form";
import type {
  SchemaUnion,
  HaFormSchema,
} from "../../../../../components/ha-form/types";
import { STATE_CONDITION_HIDDEN_ATTRIBUTES } from "../../../../../data/entity/entity_attributes";
import type { HomeAssistant } from "../../../../../types";
import type { StateCondition } from "../../../common/validate-condition";
import type { ConditionsEntityContext } from "../context";
import { conditionsEntityContext } from "../context";
import { computeStateName } from "../../../../../common/entity/compute_state_name";
import {
  CURRENT_ENTITY_ID,
  currentEntityOption,
} from "../current-entity-option";

const stateConditionStruct = object({
  condition: literal("state"),
  entity: optional(string()),
  attribute: optional(string()),
  state: optional(string()),
  state_not: optional(string()),
});

interface StateConditionData {
  condition: "state";
  entity?: string;
  attribute?: string;
  invert: "true" | "false";
  state?: string | string[];
}

@customElement("ha-card-condition-state")
export class HaCardConditionState extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: StateCondition;

  @property({ type: Boolean }) public disabled = false;

  @state()
  @consume({ context: conditionsEntityContext, subscribe: true })
  private _entityContext?: ConditionsEntityContext;

  public static get defaultConfig(): StateCondition {
    return { condition: "state", entity: "", state: "" };
  }

  protected static validateUIConfig(condition: StateCondition) {
    return assert(condition, stateConditionStruct);
  }

  private _schema = memoizeOne(
    (
      localize: LocalizeFunc,
      currentEntityId: string | undefined,
      currentEntityName: string | undefined,
      useCurrentEntity: boolean,
      filterEntityIds: string[] | undefined
    ) => {
      const currentEntityOpt = currentEntityId
        ? currentEntityOption(localize, currentEntityId, currentEntityName)
        : undefined;
      const showEntityPicker = filterEntityIds === undefined;
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
              hide_attributes: STATE_CONDITION_HIDDEN_ATTRIBUTES,
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
              selector: { state: { entity_id: fixedEntityIds } },
              context: {
                filter_entity: "entity",
                filter_attribute: "attribute",
              },
            },
          ],
        },
      ] as const satisfies readonly HaFormSchema[];
    }
  );

  protected render() {
    const { state: _state, state_not: _stateNot, ...content } = this.condition;

    const ctx = this._entityContext;
    const currentEntityId = ctx?.mode === "current" ? ctx.entityId : undefined;
    const filterEntityIds = ctx?.mode === "filter" ? ctx.entityIds : undefined;
    const useCurrentEntity =
      currentEntityId !== undefined && !this.condition.entity;

    const currentStateObj = currentEntityId
      ? this.hass.states[currentEntityId]
      : undefined;
    const currentEntityName = currentStateObj
      ? computeStateName(currentStateObj)
      : undefined;

    const data: StateConditionData = {
      ...content,
      entity: useCurrentEntity ? CURRENT_ENTITY_ID : this.condition.entity,
      invert: this.condition.state_not !== undefined ? "true" : "false",
      state: this.condition.state_not ?? this.condition.state,
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
          filterEntityIds
        )}
        .disabled=${this.disabled}
        @value-changed=${this._valueChanged}
        .computeLabel=${this._computeLabelCallback}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const data = ev.detail.value as StateConditionData;

    const {
      invert,
      state: stateValue,
      entity,
      condition: _,
      ...content
    } = data;

    const isCurrentEntity = entity === CURRENT_ENTITY_ID;

    const condition: StateCondition = {
      condition: "state",
      ...content,
      ...(!isCurrentEntity && entity ? { entity } : {}),
      state: invert === "false" ? (stateValue ?? "") : undefined,
      state_not: invert === "true" ? (stateValue ?? "") : undefined,
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
          "ui.panel.lovelace.editor.condition-editor.condition.state.attribute"
        );
      case "state":
        return this.hass.localize(
          "ui.components.entity.entity-state-picker.state"
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
