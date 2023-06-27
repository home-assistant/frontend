import wrap from "@vue/web-component-wrapper";
import { customElement } from "lit/decorators";
import Vue from "vue";
import DateRangePicker from "vue2-daterange-picker";
// @ts-ignore
import dateRangePickerStyles from "vue2-daterange-picker/dist/vue2-daterange-picker.css";
import { fireEvent } from "../common/dom/fire_event";

// Set the current date to the left picker instead of the right picker because the right is hidden
const CustomDateRangePicker = Vue.extend({
  mixins: [DateRangePicker],
  methods: {
    selectMonthDate() {
      const dt: Date = this.end || new Date();
      // @ts-ignore
      this.changeLeftMonth({
        year: dt.getFullYear(),
        month: dt.getMonth() + 1,
      });
    },
  },
});

const Component = Vue.extend({
  props: {
    timePicker: {
      type: Boolean,
      default: true,
    },
    twentyfourHours: {
      type: Boolean,
      default: true,
    },
    openingDirection: {
      type: String,
      default: "right",
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    ranges: {
      type: Boolean,
      default: true,
    },
    startDate: {
      type: [String, Date],
      default() {
        return new Date();
      },
    },
    endDate: {
      type: [String, Date],
      default() {
        return new Date();
      },
    },
    firstDay: {
      type: Number,
      default: 1,
    },
    autoApply: {
      type: Boolean,
      default: false,
    },
  },
  render(createElement) {
    // @ts-expect-error
    return createElement(CustomDateRangePicker, {
      props: {
        "time-picker": this.timePicker,
        "auto-apply": this.autoApply,
        opens: this.openingDirection,
        "show-dropdowns": false,
        "time-picker24-hour": this.twentyfourHours,
        disabled: this.disabled,
        ranges: this.ranges ? {} : false,
        "locale-data": {
          firstDay: this.firstDay,
        },
      },
      model: {
        value: {
          startDate: this.startDate,
          endDate: this.endDate,
        },
        callback: (value) => {
          fireEvent(this.$el as HTMLElement, "change", value);
        },
        expression: "dateRange",
      },
      scopedSlots: {
        input() {
          return createElement("slot", {
            domProps: { name: "input" },
          });
        },
        header() {
          return createElement("slot", {
            domProps: { name: "header" },
          });
        },
        ranges() {
          return createElement("slot", {
            domProps: { name: "ranges" },
          });
        },
        footer() {
          return createElement("slot", {
            domProps: { name: "footer" },
          });
        },
      },
    });
  },
});

// Assertion corrects HTMLElement type from package
const WrappedElement = wrap(
  Vue,
  Component
) as unknown as CustomElementConstructor;

@customElement("date-range-picker")
class DateRangePickerElement extends WrappedElement {
  constructor() {
    super();
    const style = document.createElement("style");
    style.innerHTML = `
          ${dateRangePickerStyles}
          .calendars {
            display: flex;
            flex-wrap: nowrap !important;
          }
          .daterangepicker {
            top: auto;
            box-shadow: var(--ha-card-box-shadow, none);
            background-color: var(--card-background-color);
            border-radius: var(--ha-card-border-radius, 12px);
            border-width: var(--ha-card-border-width, 1px);
            border-style: solid;
            border-color: var(
              --ha-card-border-color,
              var(--divider-color, #e0e0e0)
            );
            color: var(--primary-text-color);
            min-width: initial !important;
          }
          .daterangepicker:before {
            display: none;
          }
          .daterangepicker:after {
            border-bottom: 6px solid var(--card-background-color);
          }
          .daterangepicker .calendar-table {
            background-color: var(--card-background-color);
            border: none;
          }
          .daterangepicker .calendar-table td,
          .daterangepicker .calendar-table th {
            background-color: transparent;
            color: var(--secondary-text-color);
            border-radius: 0;
            outline: none;
            width: 32px;
            height: 32px;
          }
          .daterangepicker td.off,
          .daterangepicker td.off.end-date,
          .daterangepicker td.off.in-range,
          .daterangepicker td.off.start-date {
            background-color: var(--secondary-background-color);
            color: var(--disabled-text-color);
          }
          .daterangepicker td.in-range {
            background-color: var(--light-primary-color);
            color: var(--text-light-primary-color, var(--primary-text-color));
          }
          .daterangepicker td.active,
          .daterangepicker td.active:hover {
            background-color: var(--primary-color);
            color: var(--text-primary-color);
          }
          .daterangepicker td.start-date.end-date {
            border-radius: 50%;
          }
          .daterangepicker td.start-date {
            border-radius: 50% 0 0 50%;
          }
          .daterangepicker td.end-date {
            border-radius: 0 50% 50% 0;
          }
          .reportrange-text {
            background: none !important;
            padding: 0 !important;
            border: none !important;
          }
          .daterangepicker .calendar-table .next span,
          .daterangepicker .calendar-table .prev span {
            border: solid var(--primary-text-color);
            border-width: 0 2px 2px 0;
          }
          .daterangepicker .ranges li {
            outline: none;
          }
          .daterangepicker .ranges li:hover {
            background-color: var(--secondary-background-color);
          }
          .daterangepicker .ranges li.active {
            background-color: var(--primary-color);
            color: var(--text-primary-color);
          }
          .daterangepicker select.ampmselect,
          .daterangepicker select.hourselect,
          .daterangepicker select.minuteselect,
          .daterangepicker select.secondselect {
            background: transparent;
            border: 1px solid var(--divider-color);
            color: var(--primary-color);
          }
          .daterangepicker .drp-buttons .btn {
            border: 1px solid var(--primary-color);
            background-color: transparent;
            color: var(--primary-color);
            border-radius: 4px;
            padding: 8px;
            cursor: pointer;
          }
          .calendars-container {
            flex-direction: column;
            align-items: center;
          }
          .drp-calendar.col.right .calendar-table {
            display: none;
          }
          .daterangepicker.show-ranges .drp-calendar.left {
            border-left: 0px;
          }
          .daterangepicker .drp-calendar.left {
            padding: 8px;
          }
          .daterangepicker.show-calendar .ranges {
            margin-top: 0;
            padding-top: 8px;
            border-right: 1px solid var(--divider-color);
          }
          @media only screen and (max-width: 800px) {
            .calendars {
              flex-direction: column;
            }
          }
          .calendar-table {
            padding: 0 !important;
          }
          .daterangepicker.ltr {
            direction: ltr;
            text-align: left;
          }
          .vue-daterange-picker{
            min-width: unset !important;
            display: block !important;
          }
        `;
    const shadowRoot = this.shadowRoot!;
    shadowRoot.appendChild(style);
    // Stop click events from reaching the document, otherwise it will close the picker immediately.
    shadowRoot.addEventListener("click", (ev) => ev.stopPropagation());
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "date-range-picker": DateRangePickerElement;
  }
}
