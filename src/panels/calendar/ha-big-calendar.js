import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import moment from "moment";
// eslint-disable-next-line import/no-duplicates,import/no-extraneous-dependencies
import React from "react";
import BigCalendar from "react-big-calendar";
// eslint-disable-next-line import/no-duplicates,import/no-extraneous-dependencies
import { render } from "react-dom";
import { EventsMixin } from "../../mixins/events-mixin";
import "../../resources/ha-style";

BigCalendar.setLocalizer(BigCalendar.momentLocalizer(moment));

const DEFAULT_VIEW = "month";

class HaBigCalendar extends EventsMixin(PolymerElement) {
  static get template() {
    return html`
      <link
        rel="stylesheet"
        href="/static/panels/calendar/react-big-calendar.css"
      />
      <style>
        div#root {
          height: 100%;
          width: 100%;
        }
      </style>
      <div id="root"></div>
    `;
  }

  static get properties() {
    return {
      events: {
        type: Array,
        observer: "_update",
      },
    };
  }

  _update(events) {
    const allViews = BigCalendar.Views.values;

    const BCElement = React.createElement(BigCalendar, {
      events: events,
      views: allViews,
      popup: true,
      onNavigate: (date, viewName) => this.fire("navigate", { date, viewName }),
      onView: (viewName) => this.fire("view-changed", { viewName }),
      eventPropGetter: this._setEventStyle,
      defaultView: DEFAULT_VIEW,
      defaultDate: new Date(),
    });
    render(BCElement, this.$.root);
  }

  _setEventStyle(event) {
    // https://stackoverflow.com/questions/34587067/change-color-of-react-big-calendar-events
    const newStyle = {};
    if (event.color) {
      newStyle.backgroundColor = event.color;
    }
    return { style: newStyle };
  }
}

customElements.define("ha-big-calendar", HaBigCalendar);
