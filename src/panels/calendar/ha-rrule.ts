import { html, LitElement, TemplateResult } from "lit";
import { state, customElement, property } from "lit/decorators";
import { RRule, Frequency } from "rrule";
import type { Options } from "rrule";
import { fireEvent } from "../../common/dom/fire_event";
import { stopPropagation } from "../../common/dom/stop_propagation";
import "../../components/ha-textfield";
import "../../components/ha-select";
import "../../components/ha-selector/ha-selector-number";
import { HomeAssistant } from "../../types";
import { NumberSelector } from "../../data/selector";

enum RepeatFrequency {
  NONE = "none",
  YEARLY = "yearly",
  MONTHLY = "monthly",
  WEEKLY = "weekly",
  DAILY = "daily",
}

const convertFrequency = (freq: Frequency): RepeatFrequency | undefined => {
  switch (freq) {
    case Frequency.YEARLY:
      return RepeatFrequency.YEARLY;
    case Frequency.MONTHLY:
      return RepeatFrequency.MONTHLY;
    case Frequency.WEEKLY:
      return RepeatFrequency.WEEKLY;
    case Frequency.DAILY:
      return RepeatFrequency.DAILY;
    default:
      return undefined;
  }
};

const convertRepeatFrequency = (
  freq: RepeatFrequency
): Frequency | undefined => {
  switch (freq) {
    case RepeatFrequency.YEARLY:
      return Frequency.YEARLY;
    case RepeatFrequency.MONTHLY:
      return Frequency.MONTHLY;
    case RepeatFrequency.WEEKLY:
      return Frequency.WEEKLY;
    case RepeatFrequency.DAILY:
      return Frequency.DAILY;
    default:
      return undefined;
  }
};

@customElement("ha-rrule")
export class HaRRule extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public mutable = true;

  @property() public value?: string;

  @state() private _freq?: RepeatFrequency;

  @state() private _rrule?: Partial<Options>;

  protected firstUpdated() {
    if (this.value === undefined || this.value === "") {
      this._freq = RepeatFrequency.NONE;
      this._rrule = undefined;
      this.requestUpdate();
      return;
    }
    try {
      this._rrule = RRule.parseString(this.value);
    } catch (ex) {
      // unsupported rrule string
      this._rrule = undefined;
      this._freq = undefined;
      this.requestUpdate();
      return;
    }
    this._freq = convertFrequency(this._rrule!.freq!);
    this.requestUpdate();
  }

  protected render(): TemplateResult {
    if (!this._freq) {
      // Unparsed RRULE string is just displayed as text
      return html`${this.value}`;
    }
    if (!this.mutable) {
      return html`${this._rruleText()}`;
    }
    return html`
      <ha-select
        .hass=${this.hass}
        .label=${this.hass.localize(
          "ui.components.calendar.event.repeat.label"
        )}
        .value=${this._freq}
        .required="true"
        @selected=${this._handleFreqChange}
        @closed=${stopPropagation}
        fixedMenuPosition
      >
        ${Object.values(RepeatFrequency).map(
          (freq) => html` <mwc-list-item .value=${freq}>
            ${this.hass.localize(
              `ui.components.calendar.event.repeat.freq.${freq}`
            )}
          </mwc-list-item>`
        )}
      </ha-select>

      ${this._freq !== RepeatFrequency.NONE &&
      this._freq !== RepeatFrequency.YEARLY
        ? html`<ha-selector-number
            label=${this.hass.localize(
              `ui.components.calendar.event.repeat.interval.label`
            )}
            .hass=${this.hass}
            .selector=${this._intervalSelector()}
            .value=${this._rrule!.interval}
            @value-changed=${this._handleIntervalChange}
          ></ha-selector-number>`
        : html``}
    `;
  }

  private _handleFreqChange(ev) {
    this._freq = ev.target.value;
    if (this._freq === RepeatFrequency.NONE) {
      this._rrule = undefined;
    } else {
      this._rrule = {
        freq: convertRepeatFrequency(this._freq!)!,
        interval: 1,
      };
    }
    this.requestUpdate();
    this._updateRule();
  }

  private _handleIntervalChange(ev) {
    this._rrule!.interval = ev.detail.value;
    this.requestUpdate();
    this._updateRule();
  }

  // Fire event with an rfc5546 recurrence rule string value
  private _updateRule() {
    if (this._rrule === undefined) {
      return;
    }
    const contentline = RRule.optionsToString(this._rrule);
    const rule = contentline.slice(6); // Strip "RRULE:" prefix
    fireEvent(this, "value-changed", { value: rule }); // Format is FREQ=DAILY;...
  }

  private _rruleText() {
    // This does not currently handle translations!
    return RRule.fromString(`RRULE:${this.value}`).toText();
  }

  private _intervalSelector(): NumberSelector {
    if (
      this._freq === RepeatFrequency.NONE ||
      this._freq === RepeatFrequency.YEARLY
    ) {
      throw Error("Unexpected repeat frequency");
    }
    return {
      number: {
        min: 1,
        step: 1,
        mode: "box",
        unit_of_measurement: this.hass.localize(
          `ui.components.calendar.event.repeat.interval.${this._freq!}`
        ),
      },
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-rrule": HaRRule;
  }
}
