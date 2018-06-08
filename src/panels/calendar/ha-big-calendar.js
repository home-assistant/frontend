import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

/* polymer-lint disable */
import { render } from 'react-dom';
import React from 'react';
/* polymer-lint enable */
import BigCalendar from 'react-big-calendar';
import moment from 'moment';

import '../../resources/ha-style.js';

class HABigCalendar extends PolymerElement {
  static get template() {
    return html``;
  }

  update(events) {
    BigCalendar.setLocalizer(BigCalendar.momentLocalizer(moment));
    const allViews = Object.keys(BigCalendar.Views).map(k => BigCalendar.Views[k]);

    const BCElement = React.createElement(
      BigCalendar,
      { events: events,
        views: allViews,
        popup: true,
        onNavigate: this.dateUpdated,
        eventPropGetter: this.setEventStyle,
        defaultDate: new Date(), }
    );
    render(BCElement, this.shadowRoot);
    // Add react big calendar css
    const style = document.createElement('link');
    style.setAttribute('href', '/static/panels/calendar/react-big-calendar.css');
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
      dateUpdated: Object,

      events: {
        type: Array,
        observer: 'update',
      },

    };
  }
}

customElements.define('ha-big-calendar', HABigCalendar);
