import type { SelectedDetail } from "@material/mwc-list";
import { formatInTimeZone, toDate } from "date-fns-tz";
import { css, html, LitElement, PropertyValues, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import type { Options, WeekdayStr } from "rrule";
import { ByWeekday, RRule, Weekday } from "rrule";
import { firstWeekdayIndex } from "../../common/datetime/first_weekday";
import { stopPropagation } from "../../common/dom/stop_propagation";
import { LocalizeKeys } from "../../common/translations/localize";
import "../../components/ha-chip";
import "../../components/ha-date-input";
import "../../components/ha-list-item";
import "../../components/ha-select";
import type { HaSelect } from "../../components/ha-select";
import "../../components/ha-textfield";
import { HomeAssistant } from "../../types";
import {
  convertFrequency,
  convertRepeatFrequency,
  DEFAULT_COUNT,
  getMonthdayRepeatFromRule,
  getMonthlyRepeatItems,
  getMonthlyRepeatWeekdayFromRule,
  getWeekday,
  getWeekdays,
  MonthlyRepeatItem,
  RepeatEnd,
  RepeatFrequency,
  ruleByWeekDay,
  untilValue,
} from "./recurrence";

@customElement("ha-recurrence-rule-editor")
export class RecurrenceRuleEditor extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public disabled = false;

  @property() public value = "";

  @property() public dtstart?: Date;

  @property() public allDay?: boolean;

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

  @query("#monthly") private _monthlyRepeatSelect!: HaSelect;

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
      const selectElement = this._monthlyRepeatSelect;
      if (selectElement) {
        const oldSelected = selectElement.index;
        selectElement.select(-1);
        this.updateComplete.then(() => {
          selectElement.select(changedProps.has("dtstart") ? 0 : oldSelected);
        });
      }
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
    } catch (ex) {
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
      this._untilDay = toDate(rrule.until, { timeZone: this.timezone });
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
        @closed=${stopPropagation}
        fixedMenuPosition
        naturalMenuWidth
        .value=${this._freq}
      >
        <ha-list-item value="none">
          ${this.hass.localize("ui.components.calendar.event.repeat.freq.none")}
        </ha-list-item>
        <ha-list-item value="yearly">
          ${this.hass.localize(
            "ui.components.calendar.event.repeat.freq.yearly"
          )}
        </ha-list-item>
        <ha-list-item value="monthly">
          ${this.hass.localize(
            "ui.components.calendar.event.repeat.freq.monthly"
          )}
        </ha-list-item>
        <ha-list-item value="weekly">
          ${this.hass.localize(
            "ui.components.calendar.event.repeat.freq.weekly"
          )}
        </ha-list-item>
        <ha-list-item value="daily">
          ${this.hass.localize(
            "ui.components.calendar.event.repeat.freq.daily"
          )}
        </ha-list-item>
      </ha-select>
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
            @closed=${stopPropagation}
            fixedMenuPosition
            naturalMenuWidth
          >
            ${this._monthlyRepeatItems!.map(
              (item) => html`
                <ha-list-item .value=${item.value} .item=${item}>
                  ${item.label}
                </ha-list-item>
              `
            )}
          </ha-select>`
        : nothing}
    `;
  }

  renderWeekly() {
    return html`
      ${this.renderInterval()}
      <div class="weekdays">
        ${this._allWeekdays!.map(
          (item) => html`
            <ha-chip
              .value=${item}
              class=${classMap({ active: this._weekday.has(item) })}
              @click=${this._onWeekdayToggle}
              >${this.hass.localize(
                `ui.components.calendar.event.repeat.weekly.weekday.${
                  item.toLowerCase() as Lowercase<WeekdayStr>
                }`
              )}</ha-chip
            >
          `
        )}
      </div>
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
        @closed=${stopPropagation}
        fixedMenuPosition
        naturalMenuWidth
      >
        <ha-list-item value="never">
          ${this.hass.localize("ui.components.calendar.event.repeat.end.never")}
        </ha-list-item>
        <ha-list-item value="after">
          ${this.hass.localize("ui.components.calendar.event.repeat.end.after")}
        </ha-list-item>
        <ha-list-item value="on">
          ${this.hass.localize("ui.components.calendar.event.repeat.end.on")}
        </ha-list-item>
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
              .value=${this._formatDate(this._untilDay!)}
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

  private _onRepeatSelected(e: CustomEvent<SelectedDetail<number>>) {
    this._freq = (e.target as HaSelect).value as RepeatFrequency;

    if (this._freq === "yearly") {
      this._interval = 1;
    }
    if (this._freq !== "weekly") {
      this._weekday.clear();
      this._computeWeekday();
    }
    e.stopPropagation();
  }

  private _onMonthlyDetailSelected(e: CustomEvent<SelectedDetail<number>>) {
    e.stopPropagation();
    const selectedItem = this._monthlyRepeatItems[e.detail.index];
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
    if (!target.classList.contains("active")) {
      this._weekday.add(value);
    } else {
      this._weekday.delete(value);
    }
    this.requestUpdate("_weekday");
  }

  private _onEndSelected(e: CustomEvent<SelectedDetail<number>>) {
    const end = (e.target as HaSelect).value as RepeatEnd;
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
    this._untilDay = toDate(e.detail.value + "T00:00:00", {
      timeZone: this.timezone,
    });
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
      const until = toDate(
        this._formatDate(this._untilDay!) +
          "T" +
          this._formatTime(this.dtstart!),
        { timeZone: this.timezone }
      );
      // rrule.js can't compute some UNTIL variations so we compute that ourself. Must be
      // in the same format as dtstart.
      const format = this.allDay ? "yyyyMMdd" : "yyyyMMdd'T'HHmmss";
      const newUntilValue = formatInTimeZone(
        until,
        this.hass.config.time_zone,
        format
      );
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

  // Formats a date in browser display timezone
  private _formatDate(date: Date): string {
    return formatInTimeZone(date, this.timezone!, "yyyy-MM-dd");
  }

  // Formats a time in browser display timezone
  private _formatTime(date: Date): string {
    return formatInTimeZone(date, this.timezone!, "HH:mm:ss");
  }

  static styles = css`
    ha-textfield,
    ha-select {
      display: block;
      margin-bottom: 16px;
    }
    .weekdays {
      display: flex;
      justify-content: space-between;
      margin-bottom: 16px;
    }
    ha-textfield:last-child,
    ha-select:last-child,
    .weekdays:last-child {
      margin-bottom: 0;
    }

    .active {
      --ha-chip-background-color: var(--primary-color);
      --ha-chip-text-color: var(--text-primary-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-recurrence-rule-editor": RecurrenceRuleEditor;
  }
}
