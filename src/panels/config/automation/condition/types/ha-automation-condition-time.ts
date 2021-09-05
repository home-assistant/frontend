import { Radio } from "@material/mwc-radio";
import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { computeRTLDirection } from "../../../../../common/util/compute_rtl";
import "../../../../../components/ha-formfield";
import "../../../../../components/ha-radio";
import { HaSwitch } from "../../../../../components/ha-switch";
import { TimeCondition } from "../../../../../data/automation";
import { HomeAssistant } from "../../../../../types";
import {
  ConditionElement,
  handleChangeEvent,
} from "../ha-automation-condition-row";
import "../../../../../components/ha-time-input";

const includeDomains = ["input_datetime"];

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

  @state() private _inputModeBefore?: boolean;

  @state() private _inputModeAfter?: boolean;

  public static get defaultConfig() {
    return {};
  }

  protected render() {
    const { after, before, weekday } = this.condition;

    const inputModeBefore =
      this._inputModeBefore ?? before?.startsWith("input_datetime.");
    const inputModeAfter =
      this._inputModeAfter ?? after?.startsWith("input_datetime.");

    return html`
      <ha-formfield
        .label=${this.hass!.localize(
          "ui.panel.config.automation.editor.conditions.type.time.type_value"
        )}
      >
        <ha-radio
          @change=${this._handleModeChanged}
          name="mode_after"
          value="value"
          ?checked=${!inputModeAfter}
        ></ha-radio>
      </ha-formfield>
      <ha-formfield
        .label=${this.hass!.localize(
          "ui.panel.config.automation.editor.conditions.type.time.type_input"
        )}
      >
        <ha-radio
          @change=${this._handleModeChanged}
          name="mode_after"
          value="input"
          ?checked=${inputModeAfter}
        ></ha-radio>
      </ha-formfield>
      ${inputModeAfter
        ? html`<ha-entity-picker
            .label=${this.hass.localize(
              "ui.panel.config.automation.editor.conditions.type.time.after"
            )}
            .includeDomains=${includeDomains}
            .name=${"after"}
            .value=${after?.startsWith("input_datetime.") ? after : ""}
            @value-changed=${this._valueChanged}
            .hass=${this.hass}
            allow-custom-entity
          ></ha-entity-picker>`
        : html`<ha-time-input
            .label=${this.hass.localize(
              "ui.panel.config.automation.editor.conditions.type.time.after"
            )}
            .locale=${this.hass.locale}
            .name=${"after"}
            .value=${after?.startsWith("input_datetime.") ? "" : after}
            @value-changed=${this._valueChanged}
          ></ha-time-input>`}

      <ha-formfield
        .label=${this.hass!.localize(
          "ui.panel.config.automation.editor.conditions.type.time.type_value"
        )}
      >
        <ha-radio
          @change=${this._handleModeChanged}
          name="mode_before"
          value="value"
          ?checked=${!inputModeBefore}
        ></ha-radio>
      </ha-formfield>
      <ha-formfield
        .label=${this.hass!.localize(
          "ui.panel.config.automation.editor.conditions.type.time.type_input"
        )}
      >
        <ha-radio
          @change=${this._handleModeChanged}
          name="mode_before"
          value="input"
          ?checked=${inputModeBefore}
        ></ha-radio>
      </ha-formfield>
      ${inputModeBefore
        ? html`<ha-entity-picker
            .label=${this.hass.localize(
              "ui.panel.config.automation.editor.conditions.type.time.before"
            )}
            .includeDomains=${includeDomains}
            .name=${"before"}
            .value=${before?.startsWith("input_datetime.") ? before : ""}
            @value-changed=${this._valueChanged}
            .hass=${this.hass}
            allow-custom-entity
          ></ha-entity-picker>`
        : html`<ha-time-input
            .label=${this.hass.localize(
              "ui.panel.config.automation.editor.conditions.type.time.before"
            )}
            .name=${"before"}
            .locale=${this.hass.locale}
            .value=${before?.startsWith("input_datetime.") ? "" : before}
            @value-changed=${this._valueChanged}
          ></ha-time-input>`}
      ${Object.keys(DAYS).map(
        (day) => html`
          <ha-formfield
            alignEnd
            spaceBetween
            class="weekday-toggle"
            .label=${this.hass!.localize(
              `ui.panel.config.automation.editor.conditions.type.time.weekdays.${day}`
            )}
            .dir=${computeRTLDirection(this.hass!)}
          >
            <ha-switch
              .day=${day}
              .checked=${!weekday || weekday === day || weekday.includes(day)}
              @change=${this._dayValueChanged}
            >
            </ha-switch>
          </ha-formfield>
        `
      )}
    `;
  }

  private _handleModeChanged(ev: Event) {
    const target = ev.target as Radio;
    if (target.getAttribute("name") === "mode_after") {
      this._inputModeAfter = target.value === "input";
    } else {
      this._inputModeBefore = target.value === "input";
    }
  }

  private _valueChanged(ev: CustomEvent): void {
    handleChangeEvent(this, ev);
  }

  private _dayValueChanged(ev: CustomEvent): void {
    const daySwitch = ev.currentTarget as WeekdayHaSwitch;

    let days: string[];

    if (!this.condition.weekday) {
      days = Object.keys(DAYS);
    } else {
      days = !Array.isArray(this.condition.weekday)
        ? [this.condition.weekday]
        : this.condition.weekday;
    }

    if (daySwitch.checked) {
      days.push(daySwitch.day);
    } else {
      days = days.filter((d) => d !== daySwitch.day);
    }

    days.sort((a: string, b: string) => DAYS[a] - DAYS[b]);

    fireEvent(this, "value-changed", {
      value: { ...this.condition, weekday: days },
    });
  }

  static get styles(): CSSResultGroup {
    return css`
      .weekday-toggle {
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
