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

import React from 'react';
import { render } from 'react-dom';
import BigCalendar from 'react-big-calendar';
import moment from 'moment';

import '../../resources/ha-style.js';
import LocalizeMixin from '../../mixins/localize-mixin.js';

/*
 * @appliesMixin LocalizeMixin
 */

class HABigCalendar extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
    <template>[[events]]</template>
    `;
  }

  update() {
    BigCalendar.momentLocalizer(moment);
    const allViews = Object.keys(BigCalendar.Views).map(k => BigCalendar.Views[k]);

    this.bc_element = React.createElement(
      BigCalendar,
      { events: this.events,
        views: allViews,
        eventPropGetter: this.setEventStyle,
        defaultDate: new Date(), }
    );
    render(this.bc_element, this.shadowRoot);
    // Add react big calendar css
    const style = document.createElement('link');
    style.setAttribute('href', '/static/images/react-big-calendar/react-big-calendar.css');
    style.setAttribute('rel', 'stylesheet');
    this.shadowRoot.appendChild(style);
  }

  setEventStyle(event) {
    // https://stackoverflow.com/questions/34587067/change-color-of-react-big-calendar-events
    const newStyle = {};
    if (event.color) {
      newStyle.backgroundColor = event.color;
    }
    return { style: newStyle };
  }

  static get properties() {
    return {
      hass: Object,

      bc_element: Object,

      events: {
        type: Array,
        observer: 'update',
      },

    };
  }
}

customElements.define('ha-big-calendar', HABigCalendar);
