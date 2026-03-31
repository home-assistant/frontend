import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import type { PeriodKey, PeriodSelector } from "../../data/selector";
import type { HomeAssistant } from "../../types";
import { deepEqual } from "../../common/util/deep-equal";
import type { LocalizeFunc } from "../../common/translations/localize";
import "../ha-form/ha-form";

const PERIODS = {
  none: undefined,
  today: { calendar: { period: "day" } },
  yesterday: { calendar: { period: "day", offset: -1 } },
  tomorrow: { calendar: { period: "day", offset: 1 } },
  this_week: { calendar: { period: "week" } },
  last_week: { calendar: { period: "week", offset: -1 } },
  next_week: { calendar: { period: "week", offset: 1 } },
  this_month: { calendar: { period: "month" } },
  last_month: { calendar: { period: "month", offset: -1 } },
  next_month: { calendar: { period: "month", offset: 1 } },
  this_year: { calendar: { period: "year" } },
  last_year: { calendar: { period: "year", offset: -1 } },
  next_7d: { calendar: { period: "day", offset: 7 } },
  next_30d: { calendar: { period: "day", offset: 30 } },
} as const;

@customElement("ha-selector-period")
export class HaPeriodSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: PeriodSelector;

  @property({ attribute: false }) public value?: unknown;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  private _schema = memoizeOne(
    (
      selectedPeriodKey: PeriodKey | undefined,
      selector: PeriodSelector,
      localize: LocalizeFunc
    ) =>
      [
        {
          name: "period",
          required: this.required,
          selector:
            selectedPeriodKey && selectedPeriodKey in this._periods(selector)
              ? {
                  select: {
                    multiple: false,
                    options: Object.keys(this._periods(selector)).map(
                      (periodKey) => ({
                        value: periodKey,
                        label:
                          localize(
                            `ui.components.selectors.period.periods.${periodKey as PeriodKey}`
                          ) || periodKey,
                      })
                    ),
                  },
                }
              : { object: {} },
        },
      ] as const
  );

  protected render() {
    const data = this._data(this.value, this.selector);

    const schema = this._schema(
      typeof data.period === "string" ? (data.period as PeriodKey) : undefined,
      this.selector,
      this.hass.localize
    );

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        .computeHelper=${this._computeHelperCallback}
        .computeLabel=${this._computeLabelCallback}
        .disabled=${this.disabled}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _periods = memoizeOne((selector: PeriodSelector) =>
    Object.fromEntries(
      Object.entries(PERIODS).filter(([key]) =>
        selector.period?.options?.includes(key as any)
      )
    )
  );

  private _data = memoizeOne((value: unknown, selector: PeriodSelector) => {
    for (const [periodKey, period] of Object.entries(this._periods(selector))) {
      if (deepEqual(period, value)) {
        return { period: periodKey };
      }
    }
    return { period: value };
  });

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const newValue = ev.detail.value;

    if (typeof newValue.period === "string") {
      const periods = this._periods(this.selector);
      if (newValue.period in periods) {
        const period = this._periods(this.selector)[newValue.period];
        fireEvent(this, "value-changed", { value: period });
      }
    } else {
      fireEvent(this, "value-changed", { value: newValue.period });
    }
  }

  private _computeHelperCallback = () => this.helper;

  private _computeLabelCallback = () => this.label;

  static styles = css`
    :host {
      position: relative;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-period": HaPeriodSelector;
  }
}
