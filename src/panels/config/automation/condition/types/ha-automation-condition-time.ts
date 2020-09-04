import "@polymer/paper-input/paper-input";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
} from "lit-element";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { computeRTLDirection } from "../../../../../common/util/compute_rtl";
import "../../../../../components/ha-formfield";
import { HaSwitch } from "../../../../../components/ha-switch";
import { TimeCondition } from "../../../../../data/automation";
import { HomeAssistant } from "../../../../../types";
import {
  ConditionElement,
  handleChangeEvent,
} from "../ha-automation-condition-row";

const DAYS = {
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
  sun: 7,
};

interface WeekdayHaSwitch extends HaSwitch {
  day: string;
}

@customElement("ha-automation-condition-time")
export class HaTimeCondition extends LitElement implements ConditionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: TimeCondition;

  public static get defaultConfig() {
    return {};
  }

  protected render() {
    const { after, before, weekday } = this.condition;
    return html`
      <paper-input
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.conditions.type.time.after"
        )}
        name="after"
        .value=${after}
        @value-changed=${this._valueChanged}
      ></paper-input>
      <paper-input
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.conditions.type.time.before"
        )}
        name="before"
        .value=${before}
        @value-changed=${this._valueChanged}
      ></paper-input>

      ${Object.keys(DAYS).map(
        (day) => html`
          <ha-formfield
            alignEnd
            spaceBetween
            class="flex"
            .label=${this.hass!.localize(
              `ui.panel.config.automation.editor.conditions.type.time.weekdays.${day}`
            )}
            .dir=${computeRTLDirection(this.hass!)}
          >
            <ha-switch
              .day=${day}
              .checked=${weekday?.includes(day)}
              @change=${this._dayValueChanged}
            >
            </ha-switch>
          </ha-formfield>
        `
      )}
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    handleChangeEvent(this, ev);
  }

  private _dayValueChanged(ev: CustomEvent): void {
    ev.stopPropagation();

    const daySwitch = ev.currentTarget as WeekdayHaSwitch;

    let days = this.condition.weekday;
    if (!days) {
      days = [];
    }

    if (daySwitch.checked) {
      days.push(daySwitch.day);
    } else {
      days = days.filter((d) => d !== daySwitch.day);
    }

    days.sort((a: string, b: string) => DAYS[a] - DAYS[b]);

    this.condition.weekday = days;

    fireEvent(this, "value-changed", {
      value: this.condition,
    });
  }

  static get styles(): CSSResult {
    return css`
      .flex {
        display: flex;
        height: 40px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-time": HaTimeCondition;
  }
}
