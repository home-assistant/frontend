import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import { EventsMixin } from "../../../mixins/events-mixin";
import LocalizeMixin from "../../../mixins/localize-mixin";

/*
 * @appliesMixin EventsMixin
 * @appliesMixin LocalizeMixin
 */
class EventsList extends EventsMixin(LocalizeMixin(PolymerElement)) {
  static get template() {
    return html`
      <style>
        ul {
          margin: 0;
          padding: 0;
        }

        li {
          list-style: none;
          line-height: 2em;
        }

        a {
          color: var(--dark-primary-color);
        }
      </style>

      <ul>
        <template is="dom-repeat" items="[[events]]" as="event">
          <li>
            <a href="#" on-click="eventSelected">{{event.event}}</a>
            <span>
              [[localize(
              "ui.panel.developer-tools.tabs.events.count_listeners", "count",
              event.listener_count )]]</span
            >
          </li>
        </template>
      </ul>
    `;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
      },

      events: {
        type: Array,
      },
    };
  }

  connectedCallback() {
    super.connectedCallback();
    this.hass.callApi("GET", "events").then(
      function(events) {
        this.events = events;
      }.bind(this)
    );
  }

  eventSelected(ev) {
    ev.preventDefault();
    this.fire("event-selected", { eventType: ev.model.event.event });
  }
}

customElements.define("events-list", EventsList);
