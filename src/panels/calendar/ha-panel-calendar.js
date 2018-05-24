import '@polymer/app-layout/app-header-layout/app-header-layout.js';
import '@polymer/app-layout/app-header/app-header.js';
import '@polymer/app-layout/app-toolbar/app-toolbar.js';
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-listbox/paper-listbox.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@vaadin/vaadin-date-picker/vaadin-date-picker.js';

import '../../components/ha-menu-button.js';
import '../../components/state-history-charts.js';
import '../../data/ha-state-history-data.js';
import '../../resources/ha-date-picker-style.js';
import '../../resources/ha-style.js';

import HABigCalendar from './ha-big-calendar.js';

import formatDate from '../../common/datetime/format_date.js';
import LocalizeMixin from '../../mixins/localize-mixin.js';

/*
 * @appliesMixin LocalizeMixin
 */
class HaPanelCalendar extends LocalizeMixin(PolymerElement) {
  static get template() { 
    return html`
        <style include="iron-flex ha-style">
      .content {
        padding: 0 16px 16px;
      }
      ha-big-calendar {
        min-height: 500px;
        min-width: 100%;
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
        <div class="flex layout horizontal wrap">
            sdg
            <template is="dom-repeat" items="[[items]]">
                {{item.title}}
            </template>
            sdg
            <ha-big-calendar items=[[items]]></ha-big-calendar>
        </div>
      </div>
    </app-header-layout>
    `;
  }


  connectedCallback() {
    super.connectedCallback();

    this._fetchData = this._fetchData.bind(this);
    this.hass.connection.subscribeEvents(this._fetchData, 'calendar_updated')
      .then(function (unsub) { this._unsubEvents = unsub; }.bind(this));
    this._fetchData();
  }


  _fetchData() {
    this.hass.callApi('get', 'calendar')
      .then(function (items) {
        items.reverse();
        for (let i = 0; i < items.length; i++) {
            var item = items[i];
            console.log(item.end[0]);
            item.end = new Date(item.end[0], item.end[1], item.end[2]);
            item.start = new Date(item.start[0], item.start[1], item.start[2]);
        }
        this.items = items;
      }.bind(this));
  }

  static get properties() {
    return {
      hass: {
        type: Object,
      },


      items: {
        type: Array,
        value:   [{
    id: 0,
    title: 'All Day Event very long title1111',
    allDay: true,
    start: new Date(2015, 4, 0),
    end: new Date(2015, 4, 1),
  }],
      },
        
      narrow: {
        type: Boolean,
        value: false,
      },

      showMenu: {
        type: Boolean,
        value: false,
      },

      platforms: {
        type: Array,
      },

      _messages: {
        type: Array,
      },

      currentMessage: {
        type: Object,
      },
    };
  }




}

customElements.define('ha-panel-calendar', HaPanelCalendar);
