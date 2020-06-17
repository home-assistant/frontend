import Vue from "vue";
import wrap from "@vue/web-component-wrapper";
import DateRangePicker from "vue2-daterange-picker";
// @ts-ignore
import dateRangePickerStyles from "vue2-daterange-picker/dist/vue2-daterange-picker.css";
import { fireEvent } from "../common/dom/fire_event";

const Component = {
  props: {
    lang: {
      type: String,
      default: "en",
    },
    twentyfourHours: {
      type: Boolean,
      default: true,
    },
    disabled: {
      type: Boolean,
      default: false,
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
  },
  computed: {
    dateRange() {
      return {
        // @ts-ignore
        startDate: this.startDate,
        // @ts-ignore
        endDate: this.endDate,
      };
    },
  },
  render(createElement) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const thisWeek = new Date();
    thisWeek.setHours(0, 0, 0, 0);

    const lastWeek = new Date();
    lastWeek.setHours(0, 0, 0, 0);

    return createElement("date-range-picker", {
      props: {
        "time-picker": true,
        "auto-apply": false,
        opens: "right",
        "show-dropdowns": false,
        // @ts-ignore
        "time-picker24-hour": this.twentyfourHours,
        // @ts-ignore
        disabled: this.disabled,
        ranges: {
          Today: [today, today],
          Yesterday: [yesterday, yesterday],
          "This week": [
            new Date(thisWeek.setDate(today.getDate() - today.getDay())),
            new Date(thisWeek.setDate(today.getDate() - today.getDay() + 6)),
          ],
          "Last week": [
            new Date(lastWeek.setDate(today.getDate() - today.getDay() - 7)),
            new Date(lastWeek.setDate(today.getDate() - today.getDay() - 1)),
          ],
        },
      },
      model: {
        // @ts-ignore
        value: this.dateRange,
        callback: (value) => {
          // @ts-ignore
          fireEvent(this.$el, "change", value);
        },
        expression: "dateRange",
      },
      scopedSlots: {
        input: function () {
          return createElement("slot", {
            domProps: { name: "input" },
          });
        },
        header: function () {
          return createElement("slot", {
            domProps: { name: "header" },
          });
        },
        footer: function () {
          return createElement("slot", {
            domProps: { name: "footer" },
          });
        },
      },
    });
  },

  components: { "date-range-picker": DateRangePicker },
};

const WrappedElement = wrap(Vue, Component);

class DateRangePickerElement extends WrappedElement {
  constructor() {
    super();
    const style = document.createElement("style");
    style.innerHTML = `${dateRangePickerStyles}
        .calendars {
          display: flex;
        } 
        .daterangepicker {
            left: 0px !important; top: auto;
            background-color: var(--card-background-color);
            border: none;
            border-radius: var(--ha-card-border-radius, 4px);
            box-shadow: var(
            --ha-card-box-shadow,
            0px 2px 1px -1px rgba(0, 0, 0, 0.2),
            0px 1px 1px 0px rgba(0, 0, 0, 0.14),
            0px 1px 3px 0px rgba(0, 0, 0, 0.12)
            );
            color: var(--primary-text-color);
            min-width: initial !important;
        }
        .daterangepicker:after {
            border-bottom: 6px solid var(--card-background-color);
        }
        .daterangepicker .calendar-table {
            background-color: var(--card-background-color);
              border: none;
        }
        .daterangepicker .calendar-table td, .daterangepicker .calendar-table th {
            background-color: transparent;
            color: var(--secondary-text-color);
            border-radius: 0;
            outline: none;
        }
        .daterangepicker td.off, .daterangepicker td.off.end-date, .daterangepicker td.off.in-range, .daterangepicker td.off.start-date {
            background-color: var(--secondary-background-color);
            color: var(--disabled-text-color);
        }
        .daterangepicker td.in-range {
            background-color: var(--light-primary-color);
            color: var(--primary-text-color);
        }
        .daterangepicker td.active, .daterangepicker td.active:hover {
            background-color: var(--primary-color);
            color: var(--text-primary-color);
        }
        .daterangepicker td.start-date.end-date {
            border-radius: 15px;
        }
        .daterangepicker td.start-date {
            border-radius: 15px 0 0 15px;
        }
        .daterangepicker td.end-date {
            border-radius: 0 15px 15px 0;
        }
        .reportrange-text {
            background: none !important;
            padding: 0 !important;
            border: none !important;
        }
        .daterangepicker .calendar-table .next span, .daterangepicker .calendar-table .prev span {
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
        .daterangepicker select.ampmselect, .daterangepicker select.hourselect, .daterangepicker select.minuteselect, .daterangepicker select.secondselect {
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
        `;
    // @ts-ignore
    this.shadowRoot.appendChild(style);
    // @ts-ignore
    this.shadowRoot.addEventListener("click", (ev) => ev.stopPropagation());
  }
}
// @ts-ignore
window.customElements.define("date-range-picker", DateRangePickerElement);
