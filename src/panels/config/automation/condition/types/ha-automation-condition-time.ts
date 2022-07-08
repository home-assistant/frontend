import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { TimeCondition } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";
import type { ConditionElement } from "../ha-automation-condition-row";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import "../../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../../components/ha-form/types";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

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
    ) =>
      [
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
            ? { entity: { domain: "input_datetime" } }
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
            ? { entity: { domain: "input_datetime" } }
            : { time: {} },
        },
        {
          type: "multi_select",
          name: "weekday",
          options: DAYS.map(
            (day) =>
              [
                day,
                localize(
                  `ui.panel.config.automation.editor.conditions.type.time.weekdays.${day}`
                ),
              ] as const
          ),
        },
      ] as const
  );

  protected render() {
    const inputModeBefore =
      this._inputModeBefore ??
      this.condition.before?.startsWith("input_datetime.");
    const inputModeAfter =
      this._inputModeAfter ??
      this.condition.after?.startsWith("input_datetime.");

    const schema = this._schema(
      this.hass.localize,
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
      newValue[key] === undefined || newValue[key] === ""
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
