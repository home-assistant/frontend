import { TZDate } from "@date-fns/tz";
import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { ByWeekday, Options, WeekdayStr } from "rrule";
import { RRule, Weekday } from "rrule";
import { formatDate, formatTime } from "../../common/datetime/calc_date";
import { firstWeekdayIndex } from "../../common/datetime/first_weekday";
import type { LocalizeKeys } from "../../common/translations/localize";
import "../../components/chips/ha-chip-set";
import "../../components/chips/ha-filter-chip";
import "../../components/ha-date-input";
import "../../components/ha-select";
import "../../components/ha-textfield";
import type { HomeAssistant } from "../../types";
import type {
  MonthlyRepeatItem,
  RepeatEnd,
  RepeatFrequency,
} from "./recurrence";
import {
  DEFAULT_COUNT,
  convertFrequency,
  convertRepeatFrequency,
  getMonthdayRepeatFromRule,
  getMonthlyRepeatItems,
  getMonthlyRepeatWeekdayFromRule,
  getWeekday,
  getWeekdays,
  ruleByWeekDay,
  untilValue,
} from "./recurrence";

@customElement("ha-recurrence-rule-editor")
export class RecurrenceRuleEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public disabled = false;

  @property() public value = "";

  @property({ attribute: false }) public dtstart?: Date;

  @property({ attribute: "all-day", type: Boolean }) public allDay = false;

  @property({ attribute: false }) public locale!: HomeAssistant["locale"];

  @property() public timezone?: string;

  @state() private _computedRRule = "";

  @state() private _freq?: RepeatFrequency = "none";

  @state() private _interval = 1;

  @state() private _weekday: Set<WeekdayStr> = new Set<WeekdayStr>();

  @state() private _monthlyRepeat?: string;

  @state() private _monthlyRepeatWeekday?: Weekday;

  @state() private _monthday?: number;

  @state() private _end: RepeatEnd = "never";

  @state() private _count?: number;

  @state() private _untilDay?: Date;

  private _allWeekdays?: WeekdayStr[];

  private _monthlyRepeatItems: MonthlyRepeatItem[] = [];

  protected willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);

    if (changedProps.has("locale")) {
      this._allWeekdays = getWeekdays(firstWeekdayIndex(this.locale)).map(
        (day: Weekday) => day.toString() as WeekdayStr
      );
    }

    if (changedProps.has("dtstart") || changedProps.has("_interval")) {
      this._monthlyRepeatItems = this.dtstart
        ? getMonthlyRepeatItems(this.hass, this._interval, this.dtstart)
        : [];
      this._computeWeekday();
    }

    if (
      !changedProps.has("value") &&
      (changedProps.has("dtstart") ||
        changedProps.has("timezone") ||
        changedProps.has("_freq") ||
        changedProps.has("_interval") ||
        changedProps.has("_weekday") ||
        changedProps.has("_monthlyRepeatWeekday") ||
        changedProps.has("_monthday") ||
        changedProps.has("_end") ||
        changedProps.has("_count") ||
        changedProps.has("_untilDay"))
    ) {
      this._updateRule();
      return;
    }

    if (this._computedRRule === this.value) {
      return;
    }

    this._interval = 1;
    this._weekday.clear();
    this._monthlyRepeat = undefined;
    this._monthday = undefined;
    this._monthlyRepeatWeekday = undefined;
    this._end = "never";
    this._count = undefined;
    this._untilDay = undefined;

    this._computedRRule = this.value;
    if (this.value === "") {
      this._freq = "none";
      return;
    }
    let rrule: Partial<Options> | undefined;
    try {
      rrule = RRule.parseString(this.value);
    } catch (_err) {
      // unsupported rrule string
      this._freq = undefined;
      return;
    }
    this._freq = convertFrequency(rrule!.freq!);
    if (rrule.interval) {
      this._interval = rrule.interval;
    }
    this._monthlyRepeatWeekday = getMonthlyRepeatWeekdayFromRule(rrule);
    if (this._monthlyRepeatWeekday) {
      this._monthlyRepeat = `BYDAY=${this._monthlyRepeatWeekday.toString()}`;
    }
    this._monthday = getMonthdayRepeatFromRule(rrule);
    if (this._monthday) {
      this._monthlyRepeat = `BYMONTHDAY=${this._monthday}`;
    }
    if (
      this._freq === "weekly" &&
      rrule.byweekday &&
      Array.isArray(rrule.byweekday)
    ) {
      this._weekday = new Set<WeekdayStr>(
        rrule.byweekday.map(
          (value: ByWeekday) => value.toString() as WeekdayStr
        )
      );
    }
    if (rrule.until) {
      this._end = "on";
      this._untilDay = new Date(
        new TZDate(rrule.until, this.timezone).getTime()
      );
    } else if (rrule.count) {
      this._end = "after";
      this._count = rrule.count;
    }
  }

  renderRepeat() {
    return html`
      <ha-select
        id="freq"
        label=${this.hass.localize("ui.components.calendar.event.repeat.label")}
        @selected=${this._onRepeatSelected}
        .value=${this._freq}
        .options=${["none", "yearly", "monthly", "weekly", "daily"].map(
          (freq) => ({
            value: freq,
            label: this.hass.localize(
              `ui.components.calendar.event.repeat.freq.${freq}` as LocalizeKeys
            ),
          })
        )}
      ></ha-select>
    `;
  }

  renderMonthly() {
    return html`
      ${this.renderInterval()}
      ${this._monthlyRepeatItems.length > 0
        ? html`<ha-select
            id="monthly"
            label=${this.hass.localize(
              "ui.components.calendar.event.repeat.monthly.label"
            )}
            @selected=${this._onMonthlyDetailSelected}
            .value=${this._monthlyRepeat || this._monthlyRepeatItems[0]?.value}
            .options=${this._monthlyRepeatItems}
          ></ha-select>`
        : nothing}
    `;
  }

  renderWeekly() {
    return html`
      ${this.renderInterval()}
      <ha-chip-set class="weekdays">
        ${this._allWeekdays!.map(
          (item) => html`
            <ha-filter-chip
              no-leading-icon
              .value=${item}
              .selected=${this._weekday.has(item)}
              @click=${this._onWeekdayToggle}
              .label=${this.hass.localize(
                `ui.components.calendar.event.repeat.weekly.weekday.${
                  item.toLowerCase() as Lowercase<WeekdayStr>
                }`
              )}
            >
            </ha-filter-chip>
          `
        )}
      </ha-chip-set>
    `;
  }

  renderDaily() {
    return this.renderInterval();
  }

  renderInterval() {
    return html`
      <ha-textfield
        id="interval"
        label=${this.hass.localize(
          "ui.components.calendar.event.repeat.interval.label"
        )}
        type="number"
        min="1"
        .value=${this._interval}
        .suffix=${this.hass.localize(
          `ui.components.calendar.event.repeat.interval.${this
            ._freq!}` as LocalizeKeys
        )}
        @change=${this._onIntervalChange}
      ></ha-textfield>
    `;
  }

  renderEnd() {
    return html`
      <ha-select
        id="end"
        label=${this.hass.localize(
          "ui.components.calendar.event.repeat.end.label"
        )}
        .value=${this._end}
        @selected=${this._onEndSelected}
        .options=${["never", "after", "on"].map((end) => ({
          value: end,
          label: this.hass.localize(
            `ui.components.calendar.event.repeat.end.${end as RepeatEnd}`
          ),
        }))}
      >
      </ha-select>
      ${this._end === "after"
        ? html`
            <ha-textfield
              id="after"
              label=${this.hass.localize(
                "ui.components.calendar.event.repeat.end_after.label"
              )}
              type="number"
              min="1"
              .value=${this._count!}
              suffix=${this.hass.localize(
                "ui.components.calendar.event.repeat.end_after.ocurrences"
              )}
              @change=${this._onCountChange}
            ></ha-textfield>
          `
        : nothing}
      ${this._end === "on"
        ? html`
            <ha-date-input
              id="on"
              label=${this.hass.localize(
                "ui.components.calendar.event.repeat.end_on.label"
              )}
              .locale=${this.locale}
              .value=${formatDate(this._untilDay!, this.timezone!)}
              @value-changed=${this._onUntilChange}
            ></ha-date-input>
          `
        : nothing}
    `;
  }

  render() {
    return html`
      ${this.renderRepeat()}
      ${this._freq === "monthly" ? this.renderMonthly() : nothing}
      ${this._freq === "weekly" ? this.renderWeekly() : nothing}
      ${this._freq === "daily" ? this.renderDaily() : nothing}
      ${this._freq !== "none" ? this.renderEnd() : nothing}
    `;
  }

  private _onIntervalChange(e: Event) {
    this._interval = (e.target! as any).value;
  }

  private _onRepeatSelected(e: CustomEvent<{ value: string }>) {
    this._freq = e.detail.value as RepeatFrequency;

    if (this._freq === "yearly") {
      this._interval = 1;
    }
    if (this._freq !== "weekly") {
      this._weekday.clear();
      this._computeWeekday();
    }
  }

  private _onMonthlyDetailSelected(e: CustomEvent<{ value: string }>) {
    const selectedItem = this._monthlyRepeatItems.find(
      (item) => item.value === e.detail.value
    );
    if (!selectedItem) {
      return;
    }
    this._monthlyRepeat = selectedItem.value;
    this._monthlyRepeatWeekday = selectedItem.byday;
    this._monthday = selectedItem.bymonthday;
  }

  private _onWeekdayToggle(e: MouseEvent) {
    const target = e.currentTarget as any;
    const value = target.value as WeekdayStr;
    if (this._weekday.has(value)) {
      this._weekday.delete(value);
    } else {
      this._weekday.add(value);
    }
    this.requestUpdate("_weekday");
  }

  private _onEndSelected(e: CustomEvent<{ value: string }>) {
    const end = e.detail.value as RepeatEnd;
    if (end === this._end) {
      return;
    }
    this._end = end;

    switch (this._end) {
      case "after":
        this._count = DEFAULT_COUNT[this._freq!];
        this._untilDay = undefined;
        break;
      case "on":
        this._count = undefined;
        this._untilDay = untilValue(this._freq!);
        break;
      default:
        this._count = undefined;
        this._untilDay = undefined;
    }
    e.stopPropagation();
  }

  private _onCountChange(e: Event) {
    this._count = (e.target! as any).value;
  }

  private _onUntilChange(e: CustomEvent) {
    e.stopPropagation();
    this._untilDay = new Date(
      new TZDate(e.detail.value + "T00:00:00", this.timezone).getTime()
    );
  }

  // Reset the weekday selected when there is only a single value
  private _computeWeekday() {
    if (this.dtstart && this._weekday.size <= 1) {
      const weekdayNum = getWeekday(this.dtstart);
      this._weekday.clear();
      this._weekday.add(new Weekday(weekdayNum).toString() as WeekdayStr);
    }
  }

  private _computeRRule() {
    if (this._freq === undefined || this._freq === "none") {
      return "";
    }
    let byweekday: Weekday[] | undefined;
    let bymonthday: number | undefined;
    if (this._freq === "monthly" && this._monthlyRepeatWeekday !== undefined) {
      byweekday = [this._monthlyRepeatWeekday];
    } else if (this._freq === "monthly" && this._monthday !== undefined) {
      bymonthday = this._monthday;
    } else if (this._freq === "weekly") {
      byweekday = ruleByWeekDay(this._weekday);
    }
    const options: Partial<Options> = {
      freq: convertRepeatFrequency(this._freq!)!,
      interval: this._interval > 1 ? this._interval : undefined,
      count: this._count,
      byweekday: byweekday,
      bymonthday: bymonthday,
    };
    let contentline = RRule.optionsToString(options);
    if (this._untilDay) {
      // The UNTIL value should be inclusive of the last event instance
      const until = new TZDate(
        formatDate(this._untilDay!, this.timezone!) +
          "T" +
          formatTime(this.dtstart!, this.timezone!),
        this.timezone
      );
      // rrule.js can't compute some UNTIL variations so we compute that ourself. Must be
      // in the same format as dtstart.
      let newUntilValue;
      if (this.allDay) {
        // For all-day events, only use the date part
        newUntilValue = until.toISOString().split("T")[0].replace(/-/g, "");
      } else {
        // For timed events, include the time part
        newUntilValue = until.toISOString().replace(/[-:]/g, "").split(".")[0];
      }
      contentline += `;UNTIL=${newUntilValue}`;
    }
    return contentline.slice(6); // Strip "RRULE:" prefix
  }

  // Fire event with an rfc5546 recurrence rule string value
  private _updateRule() {
    const rule = this._computeRRule();
    if (rule === this._computedRRule) {
      return;
    }
    this._computedRRule = rule;

    this.dispatchEvent(
      new CustomEvent("value-changed", {
        detail: { value: rule },
      })
    );
  }

  static styles = css`
    ha-textfield,
    ha-select {
      display: block;
      margin-bottom: 16px;
    }
    .weekdays {
      margin-bottom: 16px;
    }
    ha-textfield:last-child,
    ha-select:last-child,
    .weekdays:last-child {
      margin-bottom: 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-recurrence-rule-editor": RecurrenceRuleEditor;
  }
}
