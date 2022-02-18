import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { TimeCondition } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";
import type { ConditionElement } from "../ha-automation-condition-row";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import type { HaFormSchema } from "../../../../../components/ha-form/types";

const DAYS = {
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
  sun: 7,
};

@customElement("ha-automation-condition-time")
export class HaTimeCondition extends LitElement implements ConditionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: TimeCondition;

  @state() private _inputModeBefore?: boolean;

  @state() private _inputModeAfter?: boolean;

  public static get defaultConfig() {
    return {};
  }

  private _schema = memoizeOne(
    (
      localize: LocalizeFunc,
      inputModeAfter?: boolean,
      inputModeBefore?: boolean
    ): HaFormSchema[] => {
      const modeAfterSchema = inputModeAfter
        ? { name: "after", selector: { entity: { domain: "input_datetime" } } }
        : { name: "after", selector: { time: {} } };

      const modeBeforeSchema = inputModeBefore
        ? { name: "before", selector: { entity: { domain: "input_datetime" } } }
        : { name: "before", selector: { time: {} } };

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
        modeAfterSchema,
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
        modeBeforeSchema,
        {
          type: "multi_select",
          name: "weekday",
          options: Object.keys(DAYS).map((day) => [
            day,
            localize(
              `ui.panel.config.automation.editor.conditions.type.time.weekdays.${day}`
            ),
          ]),
        },
      ];
    }
  );

  protected render() {
    const inputModeBefore =
      this._inputModeBefore ??
      this.condition.before?.startsWith("input_datetime.");
    const inputModeAfter =
      this._inputModeAfter ??
      this.condition.after?.startsWith("input_datetime.");

    const schema: HaFormSchema[] = this._schema(
      this.hass.localize,
      inputModeAfter,
      inputModeBefore
    );

    const data = {
      mode_before: "value",
      mode_after: "value",
      ...this.condition,
    };

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        @value-changed=${this._valueChanged}
        .computeLabel=${this._computeLabelCallback}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const newValue = ev.detail.value;

    const newModeAfter = newValue.mode_after === "input";
    const newModeBefore = newValue.mode_before === "input";

    if (newModeAfter !== this._inputModeAfter) {
      this._inputModeAfter = newModeAfter;
      newValue.after = undefined;
    }

    if (newModeBefore !== this._inputModeBefore) {
      this._inputModeBefore = newModeBefore;
      newValue.before = undefined;
    }

    Object.keys(newValue).forEach((key) =>
      newValue[key] === undefined || newValue[key] === ""
        ? delete newValue[key]
        : {}
    );

    fireEvent(this, "value-changed", { value: newValue });
  }

  private _computeLabelCallback = (schema: HaFormSchema): string =>
    this.hass.localize(
      `ui.panel.config.automation.editor.conditions.type.time.${schema.name}`
    );
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-time": HaTimeCondition;
  }
}
