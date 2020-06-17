import Vue from "vue";
import wrap from "@vue/web-component-wrapper";
import DateRangePicker from "vue2-daterange-picker";
// @ts-ignore
import dateRangePickerStyles from "vue2-daterange-picker/dist/vue2-daterange-picker.css";
import { fireEvent } from "../common/dom/fire_event";
import { mdiCalendar } from "@mdi/js";
import { formatDateTime } from "../common/datetime/format_date_time";

const Component = {
  props: {
    startDate: {
      type: [String, Date],
      default() {
        const value = new Date();
        value.setHours(value.getHours() - 2);
        value.setMinutes(0);
        value.setSeconds(0);
        return value;
      },
    },
    endDate: {
      type: [String, Date],
      default() {
        const value = new Date();
        value.setHours(value.getHours() + 1);
        value.setMinutes(0);
        value.setSeconds(0);
        return value;
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
    return createElement("date-range-picker", {
      props: {
        "time-picker": true,
        opens: "right",
        "show-dropdowns": false,
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
        input: function (props) {
          return [
            createElement("ha-svg-icon", {
              domProps: {
                path: mdiCalendar,
              },
              style: { "margin-right": "8px" },
            }),
            createElement("paper-input", {
              domProps: {
                value: formatDateTime(props.startDate, "nl"),
                label: "From",
                readonly: true,
              },
              style: { display: "inline-block" },
            }),
            createElement("paper-input", {
              domProps: {
                value: formatDateTime(props.endDate, "nl"),
                label: "Till",
                readonly: true,
              },
              style: { display: "inline-block", "margin-left": "8px" },
            }),
          ];
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
        `;
    this.shadowRoot!.appendChild(style);
    this.shadowRoot!.addEventListener("click", (ev) => ev.stopPropagation());
  }
}

window.customElements.define("date-range-picker", DateRangePickerElement);
