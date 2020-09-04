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

interface Weekday {
  name: string;
  order: number;
}

@customElement("ha-automation-condition-time")
export class HaTimeCondition extends LitElement implements ConditionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: TimeCondition;

  private _days: Weekday[] = [
    { name: "mon", order: 1 },
    { name: "tue", order: 2 },
    { name: "wed", order: 3 },
    { name: "thu", order: 4 },
    { name: "fri", order: 5 },
    { name: "sat", order: 6 },
    { name: "sun", order: 7 },
  ];

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

      ${this._days.map(
        (day) => html`
          <ha-formfield
            class="flex"
            .label=${this.hass!.localize(
              `ui.panel.config.automation.editor.conditions.type.time.weekdays.${day.name}`
            )}
            .dir=${computeRTLDirection(this.hass!)}
            alignEnd
            spaceBetween
          >
            <ha-switch
              .day=${day.name}
              .checked=${this._isChecked(weekday, day.name)}
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

  private _isChecked(days: string[], day: string): boolean {
    if (days === undefined) {
      return false;
    }
    return days.includes(day);
  }

  private _dayValueChanged(ev: CustomEvent): void {
    ev.stopPropagation();

    const day = (ev.currentTarget as any).day;
    const checked = (ev.currentTarget as HaSwitch).checked;

    let days = this.condition.weekday;
    if (days === undefined) {
      days = [];
    }

    if (checked) {
      days.push(day);
    } else {
      days = days.filter((d) => d !== day);
    }

    days.sort((a: string, b: string) => {
      const first: number =
        this._days.find((d) => d.name === b.toLowerCase())?.order ?? 1;
      const second: number =
        this._days.find((d) => d.name === a.toLowerCase())?.order ?? 2;
      return second - first;
    });

    this.condition.weekday = days;

    fireEvent(this, "value-changed", {
      value: this.condition,
    });
  }

  static get styles(): CSSResult[] {
    return [
      css`
        .flex {
          display: flex;
          height: 40px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-time": HaTimeCondition;
  }
}
