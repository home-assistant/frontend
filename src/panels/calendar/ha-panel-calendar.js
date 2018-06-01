import '@polymer/app-layout/app-header-layout/app-header-layout.js';
import '@polymer/app-layout/app-header/app-header.js';
import '@polymer/app-layout/app-toolbar/app-toolbar.js';
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-dialog/paper-dialog.js';
import '@polymer/paper-listbox/paper-listbox.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@vaadin/vaadin-date-picker/vaadin-date-picker.js';

import '../../components/ha-menu-button.js';
import '../../components/state-history-charts.js';
import '../../data/ha-state-history-data.js';
import '../../resources/ha-date-picker-style.js';
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

        span.calendar_color {
          width: 15px;
          height: 5px;
     ￼    margin: 0px 10px 2px 0px;
     ￼    display: inline-block;
          background-color: #3174ad;
        }
     
        span.calendar_color_spacer {
          width: 15px;
        }

        .iron-selected {
          background-color: #e5e5e5;
          font-weight: normal;
        }

        paper-dialog > div.eventContent {
          margin: 0px 5px 15px 5px;
        }

        paper-icon-item {
          padding: 0px; 
        }

        paper-item-body.start {
            padding: 0px 30px 0px 0px;
        }

        paper-dialog {
            padding: 0px;
        }

        paper-dialog > h2 {
            margin: 0;
            padding: 20px;
            background-color: #03A9F4;
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
                  <span class="calendar_color" style="background-color: [[item.color]]"></span>
                  <span class="calendar_color_spacer"></span>
                  [[item.name]]
                </paper-item>
              </template>
            </paper-listbox>
          </paper-card>
        </div>
        <div class="flex layout horizontal wrap">
          <ha-big-calendar hass='[[hass]]' events="[[items]]"></ha-big-calendar>
        </div>
      </div>
    </app-header-layout>

    <paper-dialog id="eventDetails" entry-animation="fade-in-animation" exit-animation="fade-out-animation" >
      <h2>[[selectedEvent.title]]</h2>

      <div id="eventContent">
      <template is="dom-if" if="[[selectedEvent.location]]"> 
        <paper-icon-item>
          <iron-icon icon="mdi:map-marker" slot="item-icon"></iron-icon>
          [[selectedEvent.location]]
        </paper-icon-item>
      </template>

      <paper-icon-item>
        <iron-icon icon="mdi:clock-outline" slot="item-icon"></iron-icon>
        <paper-item-body two-line class="start">
          <div secondary>Start</div>
          <div>[[selectedEvent.start]]</div>
        </paper-item-body>
        <template is="dom-if" if="[[selectedEvent.end]]">
          <paper-item-body two-line>
            <div secondary>End</div>
            <div>[[selectedEvent.end]]</div>
          </paper-item-body>
        </template>
      </paper-icon-item>

      <template is="dom-if" if="[[selectedEvent.description]]"> 
        <paper-icon-item>
          <iron-icon icon="mdi:message-reply-text" slot="item-icon"></iron-icon>
          [[selectedEvent.description]]
        </paper-icon-item>
      </template>

      <template is="dom-if" if="[[selectedEvent.url]]"> 
        <paper-icon-item if="">
          <iron-icon icon="mdi:link-variant" slot="item-icon"></iron-icon>
          <a href="[[selectedEvent.url]]">[[selectedEvent.url]]</a>
        </paper-icon-item>
      </template>
      </div>

    </paper-dialog>

    `;
  }

  connectedCallback() {
    super.connectedCallback();
    this._fetchData = this._fetchData.bind(this);
    // TODO implement calendar_updated event
    // this.hass.connection.subscribeEvents(this._fetchData, 'calendar_updated')
    //  .then(function (unsub) { this._unsubEvents = unsub; }.bind(this));
    this._fetchData();
    this.hass.eventSelected = this.eventSelected;

    this.$.eventDetails.addEventListener('iron-overlay-closed', e => this.eventDetailsClosed(e));
  }

  _fetchData() {
    // Fetch data
    // Fetch calendar list
    this.hass.callApi('get', 'calendars')
      .then((items) => {
        this.calendars = items;
      });
    // Fetch events for selected calendar
    var calls = [];
    for (let i = 0; i < this.selectedCalendars.length; i++) {
      calls.push(this.hass.callApi('get', 'calendar/' + this.selectedCalendars[i]));
    }
    Promise.all(calls).then((items) => {
      this.items = [];
      for (let i = 0; i < items.length; i++) {
        this.items = this.items.concat(items[i]);
      }
      for (let i = 0; i < this.items.length; i++) {
        this.items[i].pol = this;
        this.items[i].start = new Date(this.items[i].start);
        if (this.items[i].end) {
          this.items[i].end = new Date(this.items[i].end);
        } else {
          this.items[i].end = null;
        }
      }
    });
  }

  eventDetailsClosed() {
    this.selectedEvent = null;
  }

  eventSelected(event_) {
    event_.pol.selectedEvent = event_;
  }

  openEventDetails() {
    if (this.selectedEvent != null) {
      this.$.eventDetails.open();
    }
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

  static get properties() {
    return {
      hass: Object,

      items: {
        type: Array,
        value: [],
      },

      selectedEvent: {
        type: Array,
        value: null,
        observer: 'openEventDetails',
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

      platforms: Array,

      _messages: Array,

      currentMessage: Object,

    };
  }
}

customElements.define('ha-panel-calendar', HaPanelCalendar);
