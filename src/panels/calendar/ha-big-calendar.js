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

const DEFAULT_VIEW = 'month';

class HaBigCalendar extends PolymerElement {
  static get template() {
    return html`
      <link rel="stylesheet" href="/static/panels/calendar/react-big-calendar.css">
      <style>
        div#root {
          height: 100%;
          width: 100%;
        }
      </style>
      <div id="root"></div>`;
  }

  update(events) {
    const allViews = BigCalendar.Views.values;

    const BCElement = React.createElement(
      BigCalendar,
      { events: events,
        views: allViews,
        popup: true,
        onNavigate: this.dateUpdated,
        onView: this.viewUpdated,
        eventPropGetter: this.setEventStyle,
        defaultView: this.defaultView,
        defaultDate: new Date(),
      }
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

      viewUpdated: Object,

      defaultView: {
        type: String,
        value: DEFAULT_VIEW
      },

      defaultDate: {
        type: Object,
        value: new Date()
      },

      events: {
        type: Array,
        observer: 'update',
      },

    };
  }
}

customElements.define('ha-big-calendar', HaBigCalendar);
