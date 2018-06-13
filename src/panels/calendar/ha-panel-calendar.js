import '@polymer/app-layout/app-header-layout/app-header-layout.js';
import '@polymer/app-layout/app-header/app-header.js';
import '@polymer/app-layout/app-toolbar/app-toolbar.js';
import '@polymer/paper-listbox/paper-listbox.js';
import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-checkbox/paper-checkbox.js';
import '@polymer/paper-item/paper-item.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import moment from 'moment';

import '../../components/ha-menu-button.js';
import '../../resources/ha-style.js';
import './ha-big-calendar.js';

import LocalizeMixin from '../../mixins/localize-mixin.js';


const DEFAULT_VIEW = 'month';

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
        }

        div.all_calendars {
    ￼     height: 20px;
    ￼     text-align: center;
        }

        .iron-selected {
          background-color: #e5e5e5;
          font-weight: normal;
        }

      </style>

      <app-header-layout has-scrolling-region>
        <app-header slot="header" fixed>
          <app-toolbar>
            <ha-menu-button narrow='[[narrow]]' show-menu='[[showMenu]]'></ha-menu-button>
            <div main-title>[[localize('panel.calendar')]]</div>
          </app-toolbar>
        </app-header>

        <div class="flex content">
          <div id="calendars" class="layout vertical wrap">
            <paper-card heading="Calendars">
              <div class="all_calendars">
                <paper-checkbox id="all_calendars" on-change="checkAll" checked>All calendars</paper-checkbox>
              </div>
              <paper-listbox id="calendar_list" multi on-selected-items-changed="_fetchData" selected-values="{{selectedCalendars}}" attr-for-selected="item-name">
                <template is="dom-repeat" items="[[calendars]]">
                  <paper-item item-name="[[item.entity_id]]">
                    <span class="calendar_color" style$="background-color: [[item.color]]"></span>
                    <span class="calendar_color_spacer"></span>
                    [[item.name]]
                  </paper-item>
                </template>
              </paper-listbox>
            </paper-card>
          </div>
          <div class="flex layout horizontal wrap">
            <ha-big-calendar
              default-date="[[currentDate]]"
              default-view="[[currentView]]"
              view-updated="[[viewUpdated()]]"
              date-updated="[[dateUpdated()]]"
              events="[[events]]">
            </ha-big-calendar>
          </div>
        </div>
      </app-header-layout>`;
  }

  connectedCallback() {
    super.connectedCallback();
    this._fetchData = this._fetchData.bind(this);
    // TODO implement calendar_updated event
    // this.hass.connection.subscribeEvents(this._fetchData, 'calendar_updated')
    //  .then(function (unsub) { this._unsubEvents = unsub; }.bind(this));
    this._fetchCalendar();
  }

  _fetchCalendar() {
    // Fetch calendar list
    this.hass.callApi('get', 'calendars')
      .then((result) => {
        this.calendars = result;
      });
  }

  _fetchData() {
    var dates = this._getDateRange();
    var start = dates[0];
    var end = dates[1];
    // Fetch calendar list
    this._fetchCalendar();
    // Fetch events for selected calendar
    const params = encodeURI(`?start=${start}&end=${end}`);
    const calls = this.selectedCalendars.map(cal => this.hass.callApi('get', `calendar/${cal}${params}`));
    Promise.all(calls).then((results) => {
      var tmpEvents = [];

      results.map((res) => {
        res.map((ev) => {
          ev.start = new Date(ev.start);
          if (ev.end) {
            ev.end = new Date(ev.end);
          } else {
            ev.end = null;
          }
          tmpEvents.push(ev);
          return null;
        });
        return null;
      });
      this.events = tmpEvents;
    });
  }

  _getDateRange() {
    var startDate;
    var endDate;
    if (this.currentView === 'day') {
      startDate = moment(this.currentDate).startOf('day');
      endDate = moment(this.currentDate).startOf('day');
    } else if (this.currentView === 'isoWeek') {
      startDate = moment(this.currentDate).startOf('isoWeek');
      endDate = moment(this.currentDate).endOf('isoWeek');
    } else if (this.currentView === 'month') {
      startDate = moment(this.currentDate).startOf('month').subtract(7, 'days');
      endDate = moment(this.currentDate).endOf('month').add(7, 'days');
    } else if (this.currentView === 'agenda') {
      startDate = moment(this.currentDate).startOf('day');
      endDate = moment(this.currentDate).endOf('day').add(1, 'month');
    }
    return [startDate.toISOString(), endDate.toISOString()];
  }

  viewUpdated() {
    // Calendar view changed
    var pol = this;
    return function (viewName) {
      this.currentView = viewName;
      pol._fetchData();
    };
  }

  dateUpdated() {
    // Calendar date range changed
    var pol = this;
    return function (date, viewName) {
      this.currentDate = date;
      this.currentView = viewName;
      pol._fetchData();
    };
  }

  checkAll(ev) {
    // Check all calendars
    if (ev.target.checked) {
      const selectedIndex = this.selectedCalendars
        .map(x => this.calendars.map(y => y.entity_id).indexOf(x));
      for (let i = 0; i < this.calendars.length; i++) {
        if (selectedIndex.indexOf(i) === -1) {
          this.$.calendar_list.selectIndex(i);
        }
      }
    }
  }

  static get properties() {
    return {
      hass: Object,

      currentView: {
        type: String,
        value: DEFAULT_VIEW
      },

      currentDate: {
        type: Object,
        value: new Date()
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
        value: false,
      },

      showMenu: {
        type: Boolean,
        value: false,
      },

    };
  }
}

customElements.define('ha-panel-calendar', HaPanelCalendar);
