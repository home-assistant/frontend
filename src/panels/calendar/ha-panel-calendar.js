import '@polymer/app-layout/app-header-layout/app-header-layout.js';
import '@polymer/app-layout/app-header/app-header.js';
import '@polymer/app-layout/app-toolbar/app-toolbar.js';
import '@polymer/paper-listbox/paper-listbox.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../components/ha-menu-button.js';
import '../../resources/ha-style.js';
import './ha-big-calendar.js';

import LocalizeMixin from '../../mixins/localize-mixin.js';

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
          <ha-big-calendar date-Updated="[[dateUpdated()]]" events="[[events]]"></ha-big-calendar>
        </div>
      </div>
    </app-header-layout>
    `;
  }

  connectedCallback() {
    super.connectedCallback();
    this._fetchData = this._fetchData.bind(this);
    // TODO implement calendar_updated event
    // this.hass.connection.subscribeEvents(this._fetchData, 'calendar_updated')
    //  .then(function (unsub) { this._unsubEvents = unsub; }.bind(this));
    const now = new Date();
    this.start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    this.end = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

    this._fetchData();
  }

  _fetchData() {
    if (this.start == null || this.end == null) {
      return;
    }
    // Fetch calendar list
    this.hass.callApi('get', 'calendars')
      .then((result) => {
        this.calendars = result;
      });
    // Fetch events for selected calendar
    const params = encodeURI(`?start=${this.start}&end=${this.end}`);
    const calls = this.selectedCalendars.map(cal => this.hass.callApi('get', `calendar/${cal}${params}`));
    Promise.all(calls).then((results) => {
      var tmpEvents = [];

      for (let i = 0; i < results.length; i++) {
        tmpEvents = tmpEvents.concat(results[i]);
      }

      for (let i = 0; i < tmpEvents.length; i++) {
        tmpEvents[i].start = new Date(tmpEvents[i].start);
        if (tmpEvents[i].end) {
          tmpEvents[i].end = new Date(tmpEvents[i].end);
        } else {
          tmpEvents[i].end = null;
        }
      }
      this.events = tmpEvents;
    });
  }

  checkAll() {
    // Check all calendars
    if (this.$.all_calendars.checked) {
      const selectedIndex = this.$.calendar_list.selectedItems
        .map(x => this.$.calendar_list.indexOf(x));
      for (let i = 0; i < this.calendars.length; i++) {
        if (selectedIndex.indexOf(i) === -1) {
          this.$.calendar_list.selectIndex(i);
        }
      }
    }
  }

  dateUpdated() {
    var pol = this;
    return function (startDate) {
      pol.start = new Date(startDate.getFullYear(), startDate.getMonth(), 1).toISOString();
      pol.end = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1).toISOString();
      pol._fetchData();
    };
  }

  static get properties() {
    return {
      hass: Object,

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
