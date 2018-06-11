import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

/* eslint-disable */
import { render } from 'react-dom';
import React from 'react';
/* eslint-enable */
import BigCalendar from 'react-big-calendar';
import moment from 'moment';

import '../../resources/ha-style.js';

BigCalendar.setLocalizer(BigCalendar.momentLocalizer(moment));

class HABigCalendar extends PolymerElement {
  static get template() {
    return html`
      <link rel="stylesheet" href="/static/panels/calendar/react-big-calendar.css">
      <style include="iron-flex ha-style">
        div#root {
          height: 100%;
          width: 100%;
        }
      </style>
      <div id="root"></div>`;
  }

  update(events) {
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
    render(BCElement, this.$.root);
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
