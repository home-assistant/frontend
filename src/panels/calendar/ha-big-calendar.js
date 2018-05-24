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

import React from 'react';
import { render } from 'react-dom'
import BigCalendar from 'react-big-calendar';
import moment from 'moment';

import formatDate from '../../common/datetime/format_date.js';
import LocalizeMixin from '../../mixins/localize-mixin.js';

/*
 * @appliesMixin LocalizeMixin
 */


class HABigCalendar extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
    <template>[[items]]</template>
    `;
  }

  update() {

    BigCalendar.momentLocalizer(moment); 
    var allViews = Object.keys(BigCalendar.Views).map(k => BigCalendar.Views[k])

    this.bc_element = React.createElement(BigCalendar,
                             {events: this.items,
                             views: allViews,
                              step: 60,
                            showMultiDayTimes: false,
                              defaultDate: new Date(2015, 3, 1)
                              })
       render(this.bc_element,
        this.shadowRoot
       );
    // FIXME: should be loaded with webpack...
    var style = document.createElement('link');
    style.setAttribute('href', '/static/images/react-big-calendar/react-big-calendar.css');
    style.setAttribute('rel', 'stylesheet');
    this.shadowRoot.appendChild(style);

  }

  static get properties() {
    return {
      hass: {
        type: Object,
      },

      bc_element: {
        type: Object,
      },

      items: {
       type: Array,
       observer: 'update',
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



customElements.define('ha-big-calendar', HABigCalendar);
