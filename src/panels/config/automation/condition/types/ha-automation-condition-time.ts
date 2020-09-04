import { Radio } from "@material/mwc-radio";
import "@polymer/paper-input/paper-input";
import {
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
} from "lit-element";
import "../../../../../components/ha-formfield";
import "../../../../../components/ha-radio";
import { TimeCondition } from "../../../../../data/automation";
import { HomeAssistant } from "../../../../../types";
import {
  ConditionElement,
  handleChangeEvent,
} from "../ha-automation-condition-row";

const includeDomains = ["input_datetime"];

interface WeekdayHaSwitch extends HaSwitch {
  day: string;
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

  @internalProperty() private _inputModeBefore?: boolean;

  @internalProperty() private _inputModeAfter?: boolean;

  public static get defaultConfig() {
    return {};
  }

  protected render() {
    const { after, before } = this.condition;

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
          ></ha-entity-picker>`
        : html`<paper-input
            .label=${this.hass.localize(
              "ui.panel.config.automation.editor.conditions.type.time.after"
            )}
            name="after"
            .value=${after?.startsWith("input_datetime.") ? "" : after}
            @value-changed=${this._valueChanged}
          ></paper-input>`}

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
          ></ha-entity-picker>`
        : html`<paper-input
            .label=${this.hass.localize(
              "ui.panel.config.automation.editor.conditions.type.time.before"
            )}
            name="before"
            .value=${before?.startsWith("input_datetime.") ? "" : before}
            @value-changed=${this._valueChanged}
          ></paper-input>`}
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
