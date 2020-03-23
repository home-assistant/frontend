import "@polymer/paper-input/paper-input";
import {
  LitElement,
  html,
  property,
  customElement,
  CSSResult,
  css,
} from "lit-element";
import { HomeAssistant } from "../../../../../types";
import { WeekdayCondition } from "../../../../../data/automation";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { HaSwitch } from "../../../../../components/ha-switch";

interface Weekday {
  name: string;
  order: number;
}

@customElement("ha-automation-condition-weekday")
export class HaWeekdayCondition extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public condition!: WeekdayCondition;

  private _dayss: Weekday[] = [
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
    const { days } = this.condition;
    return html`
      <div class="card-config">
        ${this._dayss.map(
          (day) => html`
            <div class="flex">
              <ha-switch
                .day="${day.name}"
                @change=${this._valueChanged}
                .checked=${this._isChecked(days, day.name)}
              >
                ${this.hass.localize(
                  `ui.panel.config.automation.editor.conditions.type.weekday.${day.name}`
                )}</ha-switch
              >
            </div>
          `
        )}
      </div>
    `;
  }

  protected _isChecked(days: string[], day: string): boolean {
    if (days === undefined) {
      return false;
    }
    return days.includes(day);
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();

    const day = (ev.currentTarget as any).day;
    const checked = (ev.currentTarget as HaSwitch).checked;

    let days = this.condition.days;
    if (days === undefined) {
      days = [];
    }

    if (checked) {
      days.push(day);
    } else {
      days = days.filter((d) => d !== day);
    }

    days.sort(
      (a: string, b: string) =>
        this._dayss[a.toLowerCase()] - this._dayss[b.toLowerCase()]
    );

    fireEvent(this, "value-changed", {
      value: {
        ...this.condition,
        ["days"]: days,
      },
    });
  }

  static get styles(): CSSResult[] {
    return [
      css`
        .flex {
          flex: 1;
          margin-left: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          min-width: 0;
          height: 40px;
        }
        span.label {
          font-size: 12px;
          color: var(--paper-dropdown-menu-color, var(--secondary-text-color));
          display: block;
          padding-top: 10px;
        }
      `,
    ];
  }
}
