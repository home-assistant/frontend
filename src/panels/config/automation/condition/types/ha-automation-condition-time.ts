import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { firstWeekdayIndex } from "../../../../../common/datetime/first_weekday";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import "../../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../../components/ha-form/types";
import type { TimeCondition } from "../../../../../data/automation";
import { FrontendLocaleData } from "../../../../../data/translation";
import type { HomeAssistant } from "../../../../../types";
import type { ConditionElement } from "../ha-automation-condition-row";

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

@customElement("ha-automation-condition-time")
export class HaTimeCondition extends LitElement implements ConditionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: TimeCondition;

  @state() private _inputModeBefore?: boolean;

  @state() private _inputModeAfter?: boolean;

  @property({ type: Boolean }) public disabled = false;

  public static get defaultConfig() {
    return {};
  }

  private _schema = memoizeOne(
    (
      localize: LocalizeFunc,
      locale: FrontendLocaleData,
      inputModeAfter?: boolean,
      inputModeBefore?: boolean
    ) => {
      const dayIndex = firstWeekdayIndex(locale);
      const sortedDays = DAYS.slice(dayIndex, DAYS.length).concat(
        DAYS.slice(0, dayIndex)
      );
      return [
        {
          name: "mode_after",
          type: "select",
          required: true,
          options: [
            [
              "value",
              localize(
                "ui.panel.config.automation.editor.conditions.type.time.type_value"
              ),
            ],
            [
              "input",
              localize(
                "ui.panel.config.automation.editor.conditions.type.time.type_input"
              ),
            ],
          ],
        },
        {
          name: "after",
          selector: inputModeAfter
            ? {
                entity: {
                  filter: [
                    { domain: "input_datetime" },
                    { domain: "sensor", device_class: "timestamp" },
                  ],
                },
              }
            : { time: {} },
        },
        {
          name: "mode_before",
          type: "select",
          required: true,
          options: [
            [
              "value",
              localize(
                "ui.panel.config.automation.editor.conditions.type.time.type_value"
              ),
            ],
            [
              "input",
              localize(
                "ui.panel.config.automation.editor.conditions.type.time.type_input"
              ),
            ],
          ],
        },
        {
          name: "before",
          selector: inputModeBefore
            ? {
                entity: {
                  filter: [
                    { domain: "input_datetime" },
                    { domain: "sensor", device_class: "timestamp" },
                  ],
                },
              }
            : { time: {} },
        },
        {
          type: "multi_select",
          name: "weekday",
          options: sortedDays.map(
            (day) =>
              [
                day,
                localize(
                  `ui.panel.config.automation.editor.conditions.type.time.weekdays.${day}`
                ),
              ] as const
          ),
        },
      ] as const;
    }
  );

  protected render() {
    const inputModeBefore =
      this._inputModeBefore ??
      (this.condition.before?.startsWith("input_datetime.") ||
        this.condition.before?.startsWith("sensor."));
    const inputModeAfter =
      this._inputModeAfter ??
      (this.condition.after?.startsWith("input_datetime.") ||
        this.condition.after?.startsWith("sensor."));

    const schema = this._schema(
      this.hass.localize,
      this.hass.locale,
      inputModeAfter,
      inputModeBefore
    );

    const data = {
      mode_before: inputModeBefore ? "input" : "value",
      mode_after: inputModeAfter ? "input" : "value",
      ...this.condition,
    };

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        .disabled=${this.disabled}
        @value-changed=${this._valueChanged}
        .computeLabel=${this._computeLabelCallback}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const newValue = ev.detail.value;

    this._inputModeAfter = newValue.mode_after === "input";
    this._inputModeBefore = newValue.mode_before === "input";

    delete newValue.mode_after;
    delete newValue.mode_before;

    Object.keys(newValue).forEach((key) =>
      newValue[key] === undefined ||
      newValue[key] === "" ||
      (Array.isArray(newValue[key]) && newValue[key].length === 0)
        ? delete newValue[key]
        : {}
    );

    fireEvent(this, "value-changed", { value: newValue });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ): string =>
    this.hass.localize(
      `ui.panel.config.automation.editor.conditions.type.time.${schema.name}`
    );
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-time": HaTimeCondition;
  }
}
