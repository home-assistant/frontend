import type { SelectedDetail } from "@material/mwc-list";
import { css, html, LitElement, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import type { Options, WeekdayStr } from "rrule";
import { ByWeekday, RRule, Weekday } from "rrule";
import { firstWeekdayIndex } from "../../common/datetime/first_weekday";
import { stopPropagation } from "../../common/dom/stop_propagation";
import "../../components/ha-chip";
import "../../components/ha-list-item";
import "../../components/ha-select";
import type { HaSelect } from "../../components/ha-select";
import "../../components/ha-textfield";
import { HomeAssistant } from "../../types";
import {
  convertFrequency,
  convertRepeatFrequency,
  DEFAULT_COUNT,
  getWeekday,
  getWeekdays,
  getMonthlyRepeatItems,
  getMonthlyRepeatFromRule,
  intervalSuffix,
  RepeatEnd,
  RepeatFrequency,
  ruleByWeekDay,
  untilValue,
  WEEKDAY_NAME,
  MonthlyRepeatItem,
} from "./recurrence";
import "../../components/ha-date-input";

@customElement("ha-recurrence-rule-editor")
export class RecurrenceRuleEditor extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public disabled = false;

  @property() public value = "";

  @property() public dtstart?: Date;

  @property({ attribute: false }) public locale!: HomeAssistant["locale"];

  @property() public timezone?: string;

  @state() private _computedRRule = "";

  @state() private _freq?: RepeatFrequency = "none";

  @state() private _interval = 1;

  @state() private _weekday: Set<WeekdayStr> = new Set<WeekdayStr>();

  @state() private _monthlyRepeat?: Weekday;

  @state() private _end: RepeatEnd = "never";

  @state() private _count?: number;

  @state() private _until?: Date;

  private _allWeekdays?: WeekdayStr[];

  private _monthlyRepeatItems: MonthlyRepeatItem[] = [];

  protected willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);

    if (changedProps.has("locale")) {
      this._allWeekdays = getWeekdays(firstWeekdayIndex(this.locale)).map(
        (day: Weekday) => day.toString() as WeekdayStr
      );
    }

    if (
      !changedProps.has("value") &&
      !changedProps.has("dtstart") &&
      this._computedRRule === this.value
    ) {
      return;
    }

    this._interval = 1;
    this._weekday.clear();
    this._monthlyRepeat = undefined;
    this._end = "never";
    this._count = undefined;
    this._until = undefined;

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
    this._monthlyRepeat = getMonthlyRepeatFromRule(rrule);
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
      this._until = rrule.until;
    } else if (rrule.count) {
      this._end = "after";
      this._count = rrule.count;
    }

    this._monthlyRepeatItems = this.dtstart
      ? getMonthlyRepeatItems(this.hass, this._interval, this.dtstart)
      : [];
    this._computeWeekday();
  }

  renderRepeat() {
    return html`
      <ha-select
        id="freq"
        label="Repeat"
        @selected=${this._onRepeatSelected}
        @closed=${stopPropagation}
        fixedMenuPosition
        naturalMenuWidth
        .value=${this._freq}
      >
        <ha-list-item value="none">None</ha-list-item>
        <ha-list-item value="yearly">Yearly</ha-list-item>
        <ha-list-item value="monthly">Monthly</ha-list-item>
        <ha-list-item value="weekly">Weekly</ha-list-item>
        <ha-list-item value="daily">Daily</ha-list-item>
      </ha-select>
    `;
  }

  renderMonthly() {
    return html`
      ${this.renderInterval()}
      ${this._monthlyRepeatItems.length > 0
        ? html`<ha-select
            id="monthly"
            label="Repeat Monthly"
            @selected=${this._onMonthlyDetailSelected}
            @closed=${stopPropagation}
            fixedMenuPosition
            naturalMenuWidth
          >
            ${this._monthlyRepeatItems!.map(
              (item) => html`
                <ha-list-item
                  .value=${item.value}
                  .selected=${item.byday === this._monthlyRepeat}
                >
                  ${item.label}
                </ha-list-item>
              `
            )}
          </ha-select>`
        : html``}
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
              >${WEEKDAY_NAME[item]}</ha-chip
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
        label="Repeat interval"
        type="number"
        min="1"
        .value=${this._interval}
        .suffix=${intervalSuffix(this._freq!)}
        @change=${this._onIntervalChange}
      ></ha-textfield>
    `;
  }

  renderEnd() {
    return html`
      <ha-select
        id="end"
        label="Ends"
        .value=${this._end}
        @selected=${this._onEndSelected}
        @closed=${stopPropagation}
        fixedMenuPosition
        naturalMenuWidth
      >
        <ha-list-item value="never">Never</ha-list-item>
        <ha-list-item value="after">After</ha-list-item>
        <ha-list-item value="on">On</ha-list-item>
      </ha-select>
      ${this._end === "after"
        ? html`
            <ha-textfield
              id="after"
              label="End after"
              type="number"
              min="1"
              .value=${this._count!}
              suffix="ocurrences"
              @change=${this._onCountChange}
            ></ha-textfield>
          `
        : html``}
      ${this._end === "on"
        ? html`
            <ha-date-input
              id="on"
              label="End on"
              .locale=${this.locale}
              .value=${this._until!.toISOString()}
              @value-changed=${this._onUntilChange}
            ></ha-date-input>
          `
        : html``}
    `;
  }

  render() {
    return html`
      ${this.renderRepeat()}
      ${this._freq === "monthly" ? this.renderMonthly() : html``}
      ${this._freq === "weekly" ? this.renderWeekly() : html``}
      ${this._freq === "daily" ? this.renderDaily() : html``}
      ${this._freq !== "none" ? this.renderEnd() : html``}
    `;
  }

  private _onIntervalChange(e: Event) {
    this._interval = (e.target! as any).value;
    this._updateRule();
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
    this._updateRule();
  }

  private _onMonthlyDetailSelected(e: CustomEvent<SelectedDetail<number>>) {
    this._monthlyRepeat = this._monthlyRepeatItems[e.detail.index].byday;
    e.stopPropagation();
    this._updateRule();
  }

  private _onWeekdayToggle(e: MouseEvent) {
    const target = e.currentTarget as any;
    const value = target.value as WeekdayStr;
    if (!target.classList.contains("active")) {
      this._weekday.add(value);
    } else {
      this._weekday.delete(value);
    }
    this._updateRule();
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
        this._until = undefined;
        break;
      case "on":
        this._count = undefined;
        this._until = untilValue(this._freq!);
        break;
      default:
        this._count = undefined;
        this._until = undefined;
    }
    e.stopPropagation();
    this._updateRule();
  }

  private _onCountChange(e: Event) {
    this._count = (e.target! as any).value;
    this._updateRule();
  }

  private _onUntilChange(e: CustomEvent) {
    e.stopPropagation();
    this._until = new Date(e.detail.value);
    this._updateRule();
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
    if (this._freq === "monthly" && this._monthlyRepeat !== undefined) {
      byweekday = [this._monthlyRepeat];
    } else if (this._freq === "weekly") {
      byweekday = ruleByWeekDay(this._weekday);
    }
    const options = {
      freq: convertRepeatFrequency(this._freq!)!,
      interval: this._interval > 1 ? this._interval : undefined,
      count: this._count,
      until: this._until,
      tzid: this.timezone,
      byweekday: byweekday,
    };
    const contentline = RRule.optionsToString(options);
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
