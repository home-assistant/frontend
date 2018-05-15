import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../src/util/hass-mixins.js';

class EventsList extends window.hassMixins.EventsMixin(PolymerElement) {
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
          <span> (</span><span>{{event.listener_count}}</span><span> listeners)</span>
        </li>
      </template>
    </ul>
`;
  }

  static get is() { return 'events-list'; }

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
    this.hass.callApi('GET', 'events').then(function (events) {
      this.events = events;
    }.bind(this));
  }

  eventSelected(ev) {
    ev.preventDefault();
    this.fire('event-selected', { eventType: ev.model.event.event });
  }
}

customElements.define(EventsList.is, EventsList);
