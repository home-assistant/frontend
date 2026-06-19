import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import {
  literal,
  object,
  optional,
  string,
  assert,
  enums,
  union,
  number,
} from "superstruct";
import memoizeOne from "memoize-one";
import type { HomeAssistant } from "../../../../../types";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import type { EntityTimeCondition } from "../../../common/validate-condition";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../../components/ha-form/types";
import "../../../../../components/ha-form/ha-form";

const durationStruct = union([
  string(),
  object({
    days: optional(number()),
    hours: optional(number()),
    minutes: optional(number()),
    seconds: optional(number()),
  }),
]);

const entityTimeConditionStruct = object({
  condition: literal("entity_time"),
  entity: optional(string()),
  offset: optional(durationStruct),
  mode: optional(enums(["before", "after"])),
  timestamp: optional(enums(["state", "last_updated", "last_changed"])),
});

@customElement("ha-card-condition-entity_time")
export class HaCardConditionEntityTime extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: EntityTimeCondition;

  @property({ type: Boolean }) public disabled = false;

  public static get defaultConfig(): EntityTimeCondition {
    return {
      condition: "entity_time",
      entity: "",
      mode: "after",
      timestamp: "state",
    };
  }

  protected static validateUIConfig(condition: EntityTimeCondition) {
    return assert(condition, entityTimeConditionStruct);
  }

  private _schema = memoizeOne(
    (localize: LocalizeFunc) =>
      [
        {
          name: "entity",
          selector: { entity: {} },
        },
        {
          name: "offset",
          selector: {
            duration: {
              allow_negative: true,
              enable_day: true,
            },
          },
        },
        {
          name: "mode",
          selector: {
            select: {
              options: [
                {
                  value: "before",
                  label: localize(
                    "ui.panel.lovelace.editor.condition-editor.condition.entity_time.before"
                  ),
                },
                {
                  value: "after",
                  label: localize(
                    "ui.panel.lovelace.editor.condition-editor.condition.entity_time.after"
                  ),
                },
              ],
            },
          },
        },
      ] as const satisfies HaFormSchema[]
  );

  protected render() {
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this.condition}
        .computeLabel=${this._computeLabelCallback}
        .schema=${this._schema(this.hass.localize)}
        .disabled=${this.disabled}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const data = ev.detail.value as EntityTimeCondition;
    fireEvent(this, "value-changed", { value: data });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ): string =>
    this.hass.localize(
      `ui.panel.lovelace.editor.condition-editor.condition.entity_time.${schema.name}`
    );
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-card-condition-entity_time": HaCardConditionEntityTime;
  }
}
