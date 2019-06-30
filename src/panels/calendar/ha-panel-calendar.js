import "@polymer/app-layout/app-header-layout/app-header-layout";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-listbox/paper-listbox";
import "@polymer/paper-checkbox/paper-checkbox";
import "@polymer/paper-item/paper-item";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";
import moment from "moment";
import dates from "react-big-calendar/lib/utils/dates";

import "../../components/ha-menu-button";
import "../../components/ha-card";
import "../../resources/ha-style";
import "./ha-big-calendar";

import LocalizeMixin from "../../mixins/localize-mixin";

const DEFAULT_VIEW = "month";

/*
 * @appliesMixin LocalizeMixin
 */
class HaPanelCalendar extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      <style include="iron-flex ha-style">
        .content {
          padding: 16px;
          @apply --layout-horizontal;
        }

        ha-big-calendar {
          min-height: 500px;
          min-width: 100%;
        }

        #calendars {
          padding-right: 16px;
          width: 15%;
          min-width: 170px;
        }

        paper-item {
          cursor: pointer;
        }

        div.all_calendars {
          ￼height: 20px;
          ￼text-align: center;
        }

        .iron-selected {
          background-color: #e5e5e5;
          font-weight: normal;
        }

        :host([narrow]) .content {
          flex-direction: column;
        }
        :host([narrow]) #calendars {
          margin-bottom: 24px;
          width: 100%;
        }
      </style>

      <app-header-layout has-scrolling-region>
        <app-header slot="header" fixed>
          <app-toolbar>
            <ha-menu-button
              hass="[[hass]]"
              narrow="[[narrow]]"
            ></ha-menu-button>
            <div main-title>[[localize('panel.calendar')]]</div>
          </app-toolbar>
        </app-header>

        <div class="flex content">
          <div id="calendars" class="layout vertical wrap">
            <ha-card header="Calendars">
              <paper-listbox
                id="calendar_list"
                multi
                on-selected-items-changed="_fetchData"
                selected-values="{{selectedCalendars}}"
                attr-for-selected="item-name"
              >
                <template is="dom-repeat" items="[[calendars]]">
                  <paper-item item-name="[[item.entity_id]]">
                    <span
                      class="calendar_color"
                      style$="background-color: [[item.color]]"
                    ></span>
                    <span class="calendar_color_spacer"></span> [[item.name]]
                  </paper-item>
                </template>
              </paper-listbox>
            </ha-card>
          </div>
          <div class="flex layout horizontal wrap">
            <ha-big-calendar
              default-date="[[currentDate]]"
              default-view="[[currentView]]"
              on-navigate="_handleNavigate"
              on-view="_handleViewChanged"
              events="[[events]]"
            >
            </ha-big-calendar>
          </div>
        </div>
      </app-header-layout>
    `;
  }

  static get properties() {
    return {
      hass: Object,

      currentView: {
        type: String,
        value: DEFAULT_VIEW,
      },

      currentDate: {
        type: Object,
        value: new Date(),
      },

      events: {
        type: Array,
        value: [],
      },

      calendars: {
        type: Array,
        value: [],
      },

      selectedCalendars: {
        type: Array,
        value: [],
      },

      narrow: {
        type: Boolean,
        reflectToAttribute: true,
      },
    };
  }

  connectedCallback() {
    super.connectedCallback();
    this._fetchCalendars();
  }

  _fetchCalendars() {
    this.hass.callApi("get", "calendars").then((result) => {
      this.calendars = result;
      this.selectedCalendars = result.map((cal) => cal.entity_id);
    });
  }

  _fetchData() {
    const start = dates.firstVisibleDay(this.currentDate).toISOString();
    const end = dates.lastVisibleDay(this.currentDate).toISOString();
    const params = encodeURI(`?start=${start}&end=${end}`);
    const calls = this.selectedCalendars.map((cal) =>
      this.hass.callApi("get", `calendars/${cal}${params}`)
    );
    Promise.all(calls).then((results) => {
      const tmpEvents = [];

      results.forEach((res) => {
        res.forEach((ev) => {
          ev.start = new Date(ev.start);
          if (ev.end) {
            ev.end = new Date(ev.end);
          } else {
            ev.end = null;
          }
          tmpEvents.push(ev);
        });
      });
      this.events = tmpEvents;
    });
  }

  _getDateRange() {
    let startDate;
    let endDate;
    if (this.currentView === "day") {
      startDate = moment(this.currentDate).startOf("day");
      endDate = moment(this.currentDate).startOf("day");
    } else if (this.currentView === "week") {
      startDate = moment(this.currentDate).startOf("isoWeek");
      endDate = moment(this.currentDate).endOf("isoWeek");
    } else if (this.currentView === "month") {
      startDate = moment(this.currentDate)
        .startOf("month")
        .subtract(7, "days");
      endDate = moment(this.currentDate)
        .endOf("month")
        .add(7, "days");
    } else if (this.currentView === "agenda") {
      startDate = moment(this.currentDate).startOf("day");
      endDate = moment(this.currentDate)
        .endOf("day")
        .add(1, "month");
    }
    return [startDate.toISOString(), endDate.toISOString()];
  }

  _handleViewChanged(ev) {
    // Calendar view changed
    this.currentView = ev.detail.viewName;
    this._fetchData();
  }

  _handleNavigate(ev) {
    // Calendar date range changed
    this.currentDate = ev.detail.date;
    this.currentView = ev.detail.viewName;
    this._fetchData();
  }
}

customElements.define("ha-panel-calendar", HaPanelCalendar);
