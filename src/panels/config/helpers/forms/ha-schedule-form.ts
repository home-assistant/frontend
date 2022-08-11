// @ts-ignore
import fullcalendarStyle from "@fullcalendar/common/main.css";
import { Calendar, CalendarOptions } from "@fullcalendar/core";
import allLocales from "@fullcalendar/core/locales-all";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
// @ts-ignore
import timegridStyle from "@fullcalendar/timegrid/main.css";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
  unsafeCSS,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { useAmPm } from "../../../../common/datetime/use_am_pm";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-icon-picker";
import "../../../../components/ha-textfield";
import { Schedule, ScheduleDay, weekdays } from "../../../../data/schedule";
import { haStyle } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";

const defaultFullCalendarConfig: CalendarOptions = {
  plugins: [timeGridPlugin, interactionPlugin],
  headerToolbar: false,
  initialView: "timeGridWeek",
  editable: true,
  selectable: true,
  selectMirror: true,
  selectOverlap: false,
  eventOverlap: false,
  allDaySlot: false,
  height: "parent",
  locales: allLocales,
  dayHeaderFormat: { weekday: "short", month: undefined, day: undefined },
  slotLabelFormat: { hour: "numeric", minute: undefined, meridiem: "narrow" },
};

@customElement("ha-schedule-form")
class HaScheduleForm extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public new?: boolean;

  @state() private _name!: string;

  @state() private _icon!: string;

  // @ts-ignore
  @state() private _monday!: ScheduleDay[];

  // @ts-ignore
  @state() private _tuesday!: ScheduleDay[];

  // @ts-ignore
  @state() private _wednesday!: ScheduleDay[];

  // @ts-ignore
  @state() private _thursday!: ScheduleDay[];

  // @ts-ignore
  @state() private _friday!: ScheduleDay[];

  // @ts-ignore
  @state() private _saturday!: ScheduleDay[];

  // @ts-ignore
  @state() private _sunday!: ScheduleDay[];

  @state() private calendar?: Calendar;

  private _item?: Schedule;

  set item(item: Schedule) {
    this._item = item;
    if (item) {
      this._name = item.name || "";
      this._icon = item.icon || "";
      this._monday = item.monday || [];
      this._tuesday = item.tuesday || [];
      this._wednesday = item.wednesday || [];
      this._thursday = item.thursday || [];
      this._friday = item.friday || [];
      this._saturday = item.saturday || [];
      this._sunday = item.sunday || [];
    } else {
      this._name = "";
      this._icon = "";
      this._monday = [];
      this._tuesday = [];
      this._wednesday = [];
      this._thursday = [];
      this._friday = [];
      this._saturday = [];
      this._sunday = [];
    }
  }

  public focus() {
    this.updateComplete.then(() =>
      (
        this.shadowRoot?.querySelector("[dialogInitialFocus]") as HTMLElement
      )?.focus()
    );
  }

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }
    const nameInvalid = !this._name || this._name.trim() === "";

    return html`
      <div class="form">
        <ha-textfield
          .value=${this._name}
          .configValue=${"name"}
          @input=${this._valueChanged}
          .label=${this.hass!.localize(
            "ui.dialogs.helper_settings.generic.name"
          )}
          .errorMessage=${this.hass!.localize(
            "ui.dialogs.helper_settings.required_error_msg"
          )}
          .invalid=${nameInvalid}
          dialogInitialFocus
        ></ha-textfield>
        <ha-icon-picker
          .value=${this._icon}
          .configValue=${"icon"}
          @value-changed=${this._valueChanged}
          .label=${this.hass!.localize(
            "ui.dialogs.helper_settings.generic.icon"
          )}
        ></ha-icon-picker>
        <div id="calendar"></div>
      </div>
    `;
  }

  public willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (!this.calendar) {
      return;
    }

    if (
      changedProps.has("_sunday") ||
      changedProps.has("_monday") ||
      changedProps.has("_tuesday") ||
      changedProps.has("_wednesday") ||
      changedProps.has("_thursday") ||
      changedProps.has("_friday") ||
      changedProps.has("_saturday") ||
      changedProps.has("calendar")
    ) {
      this.calendar.removeAllEventSources();
      this.calendar.addEventSource(this._events);
    }

    const oldHass = changedProps.get("hass") as HomeAssistant;

    if (oldHass && oldHass.language !== this.hass.language) {
      this.calendar.setOption("locale", this.hass.language);
    }
  }

  protected firstUpdated(): void {
    const config: CalendarOptions = {
      ...defaultFullCalendarConfig,
      locale: this.hass.language,
      eventTimeFormat: {
        hour: useAmPm(this.hass.locale) ? "numeric" : "2-digit",
        minute: useAmPm(this.hass.locale) ? "numeric" : "2-digit",
        hour12: useAmPm(this.hass.locale),
      },
    };

    config.eventClick = (info) => this._handleEventClick(info);
    config.select = (info) => this._handleSelect(info);
    config.eventResize = (info) => this._handleEventResize(info);
    config.eventDrop = (info) => this._handleEventDrop(info);

    this.calendar = new Calendar(
      this.shadowRoot!.getElementById("calendar")!,
      config
    );

    this.calendar!.render();
    this.updateComplete.then(() => this.calendar!.updateSize());
  }

  private get _events() {
    const events: any[] = [];
    const currentDay = new Date().getDay();

    for (const [i, day] of weekdays.entries()) {
      if (!this[`_${day}`].length) {
        continue;
      }

      this[`_${day}`].forEach((item: ScheduleDay, index: number) => {
        const distance = i - currentDay;

        const start = new Date();
        start.setDate(start.getDate() + distance);
        start.setHours(
          parseInt(item.from.slice(0, 2)),
          parseInt(item.from.slice(-2))
        );

        const end = new Date();
        end.setDate(end.getDate() + distance);
        end.setHours(
          parseInt(item.to.slice(0, 2)),
          parseInt(item.to.slice(-2))
        );

        events.push({
          id: `${day}-${index}`,
          start: start.toISOString(),
          end: end.toISOString(),
        });
      });
    }

    return events;
  }

  private _handleSelect(info: { start: Date; end: Date }) {
    const { start, end } = info;

    if (start.getDay() !== end.getDay()) {
      this.calendar!.unselect();
      return;
    }

    const day = weekdays[start.getDay()];
    const value = [...this[`_${day}`]];
    const newValue = { ...this._item };

    const from = `${("0" + start.getHours()).slice(-2)}:${(
      "0" + start.getMinutes()
    ).slice(-2)}`;
    const to = `${("0" + end.getHours()).slice(-2)}:${(
      "0" + end.getMinutes()
    ).slice(-2)}`;

    value.push({
      from,
      to,
    });

    if (!value) {
      delete newValue[day];
    } else {
      newValue[day] = value;
    }

    fireEvent(this, "value-changed", {
      value: newValue,
    });
  }

  private _handleEventResize(info: any) {
    const { start, end } = info.event;

    if (start.getDay() !== end.getDay()) {
      info.revert();
      return;
    }

    const [day, index] = info.event.id.split("-");
    let value = this[`_${day}`][parseInt(index)];
    const newValue = { ...this._item };

    const from = value.from;
    const to = `${("0" + end.getHours()).slice(-2)}:${(
      "0" + end.getMinutes()
    ).slice(-2)}`;

    value = {
      from,
      to,
    };

    newValue[day][index] = value;

    fireEvent(this, "value-changed", {
      value: newValue,
    });
  }

  private _handleEventDrop(info: any) {
    const { start, end } = info.event;

    if (start.getDay() !== end.getDay()) {
      info.revert();
      return;
    }

    const [day, index] = info.event.id.split("-");
    const newDay = weekdays[start.getDay()];
    const newValue = { ...this._item };

    const from = `${("0" + start.getHours()).slice(-2)}:${(
      "0" + start.getMinutes()
    ).slice(-2)}`;
    const to = `${("0" + end.getHours()).slice(-2)}:${(
      "0" + end.getMinutes()
    ).slice(-2)}`;

    const event = {
      from,
      to,
    };

    if (newDay === day) {
      newValue[day][index] = event;
    } else {
      newValue[day].splice(index, 1);
      const value = [...this[`_${newDay}`]];
      value.push(event);
      newValue[newDay] = value;
    }

    fireEvent(this, "value-changed", {
      value: newValue,
    });
  }

  private _handleEventClick(info: any) {
    const [day, index] = info.event.id.split("-");
    const value = [...this[`_${day}`]];

    const newValue = { ...this._item };
    value.splice(parseInt(index), 1);
    newValue[day] = value;

    fireEvent(this, "value-changed", {
      value: newValue,
    });
  }

  private _valueChanged(ev: CustomEvent) {
    if (!this.new && !this._item) {
      return;
    }

    ev.stopPropagation();
    const configValue = (ev.target as any).configValue;
    const value = ev.detail?.value || (ev.target as any).value;
    if (this[`_${configValue}`] === value) {
      return;
    }
    const newValue = { ...this._item };
    if (!value) {
      delete newValue[configValue];
    } else {
      newValue[configValue] = value;
    }
    fireEvent(this, "value-changed", {
      value: newValue,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ${unsafeCSS(fullcalendarStyle)}
        ${unsafeCSS(timegridStyle)}
        .form {
          color: var(--primary-text-color);
        }

        ha-textfield {
          display: block;
          margin: 8px 0;
        }

        #calendar {
          margin: 8px 0;
          height: 500px;
          width: 100%;
        }
        .fc-scroller {
          overflow-x: visible !important;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-schedule-form": HaScheduleForm;
  }
}
