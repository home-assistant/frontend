import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import {
  literal,
  array,
  object,
  optional,
  string,
  assert,
  enums,
} from "superstruct";
import memoizeOne from "memoize-one";
import type { HomeAssistant } from "../../../../../types";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import {
  WEEKDAY_SHORT_TO_LONG,
  WEEKDAYS_SHORT,
} from "../../../../../common/datetime/weekday";
import type { TimeCondition } from "../../../common/validate-condition";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../../components/ha-form/types";
import "../../../../../components/ha-form/ha-form";

const timeConditionStruct = object({
  condition: literal("time"),
  after: optional(string()),
  before: optional(string()),
  weekdays: optional(array(enums(WEEKDAYS_SHORT))),
});

@customElement("ha-card-condition-time")
export class HaCardConditionTime extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: TimeCondition;

  @property({ type: Boolean }) public disabled = false;

  public static get defaultConfig(): TimeCondition {
    return { condition: "time", after: "08:00", before: "17:00" };
  }

  protected static validateUIConfig(condition: TimeCondition) {
    return assert(condition, timeConditionStruct);
  }

  private _schema = memoizeOne(
    (localize: LocalizeFunc) =>
      [
        { name: "after", selector: { time: { no_second: true } } },
        { name: "before", selector: { time: { no_second: true } } },
        {
          name: "weekdays",
          selector: {
            select: {
              mode: "list",
              multiple: true,
              options: WEEKDAYS_SHORT.map((day) => ({
                value: day,
                label: localize(`ui.weekdays.${WEEKDAY_SHORT_TO_LONG[day]}`),
              })),
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
    const data = ev.detail.value as TimeCondition;
    fireEvent(this, "value-changed", { value: data });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ): string =>
    this.hass.localize(
      `ui.panel.lovelace.editor.condition-editor.condition.time.${schema.name}`
    );
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-card-condition-time": HaCardConditionTime;
  }
}
