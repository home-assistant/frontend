import { consume } from "@lit/context";
import type { PropertyValues } from "lit";
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
import type { EntityMode } from "../entity-mode";
import {
  entityModeSchemaField,
  getCurrentEntityLabel,
  resolveEntityMode,
} from "../entity-mode";

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
  entity_mode?: EntityMode;
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

  @state() private _entityMode?: EntityMode;

  private _resolveStateEntityIds = memoizeOne(
    (
      ctx: ConditionsEntityContext | undefined,
      entityMode: EntityMode | undefined,
      currentEntityId: string | undefined
    ): string[] | undefined => {
      if (ctx?.mode === "filter") return ctx.entityIds;
      if (entityMode === "current" && currentEntityId) return [currentEntityId];
      return undefined;
    }
  );

  public static get defaultConfig(): StateCondition {
    return { condition: "state", entity: "", state: "" };
  }

  protected static validateUIConfig(condition: StateCondition) {
    return assert(condition, stateConditionStruct);
  }

  protected willUpdate(changedProperties: PropertyValues<this>): void {
    if (!changedProperties.has("condition")) {
      return;
    }
    try {
      assert(this.condition, stateConditionStruct);
    } catch (err: any) {
      fireEvent(this, "ui-mode-not-available", err);
    }
    if (this._entityMode === undefined) {
      this._entityMode = this.condition.entity ? "specific" : "current";
    }
  }

  private _schema = memoizeOne(
    (
      localize: LocalizeFunc,
      currentEntityLabel: string | undefined,
      showEntityPicker: boolean,
      entityIds: string[] | undefined
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
                hide_attributes: STATE_CONDITION_HIDDEN_ATTRIBUTES,
              },
            },
            context: {
              filter_entity: "entity",
            },
          }
        : undefined;
      const stateField = showEntityPicker
        ? {
            name: "state",
            selector: { state: {} },
            context: {
              filter_entity: "entity",
              filter_attribute: "attribute",
            },
          }
        : {
            name: "state",
            selector: { state: { entity_id: entityIds } },
          };

      return [
        ...(modeField ? [modeField] : []),
        ...(entityField ? [entityField] : []),
        ...(attributeField ? [attributeField] : []),
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
            stateField,
          ],
        },
      ] as const satisfies readonly HaFormSchema[];
    }
  );

  protected render() {
    const { state: _state, state_not: _stateNot, ...content } = this.condition;

    const { currentEntityId, entityMode } = resolveEntityMode(
      this._entityContext,
      this._entityMode,
      this.condition.entity
    );
    const currentEntityLabel = getCurrentEntityLabel(
      this.hass,
      currentEntityId
    );
    const entityIds = this._resolveStateEntityIds(
      this._entityContext,
      entityMode,
      currentEntityId
    );
    const showEntityPicker =
      this._entityContext?.mode !== "filter" && entityMode !== "current";

    const data: StateConditionData = {
      ...content,
      entity: this.condition.entity,
      entity_mode: entityMode,
      invert: this.condition.state_not !== undefined ? "true" : "false",
      state: this.condition.state_not ?? this.condition.state,
    };

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${this._schema(
          this.hass.localize,
          currentEntityLabel,
          showEntityPicker,
          entityIds
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
      entity_mode,
      condition: _,
      ...content
    } = data;

    this._entityMode = entity_mode;

    const condition: StateCondition = {
      condition: "state",
      ...content,
      ...(entity_mode !== "current" && entity ? { entity } : {}),
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
      case "entity_mode":
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
