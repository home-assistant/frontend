import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../src/components/domain-icon.js';
import '../../src/util/hass-mixins.js';

class HaLogbook extends window.hassMixins.EventsMixin(PolymerElement) {
  static get template() {
    return html`
    <style is="custom-style" include="iron-flex"></style>
    <style>
      :host {
        display: block;
      }

      .entry {
        @apply --paper-font-body1;
        line-height: 2em;
      }

      .time {
        width: 55px;
        font-size: .8em;
        color: var(--secondary-text-color);
      }

      domain-icon {
        margin: 0 8px 0 16px;
        color: var(--primary-text-color);
      }

      .message {
        color: var(--primary-text-color);
      }

      a {
        color: var(--primary-color);
      }
    </style>

    <template is="dom-if" if="[[!entries.length]]">
      No logbook entries found.
    </template>

    <template is="dom-repeat" items="[[entries]]">
      <div class="horizontal layout entry">
        <div class="time">[[formatTime(item.when)]]</div>
        <domain-icon domain="[[item.domain]]" class="icon"></domain-icon>
        <div class="message" flex="">
          <template is="dom-if" if="[[!item.entity_id]]">
            <span class="name">[[item.name]]</span>
          </template>
          <template is="dom-if" if="[[item.entity_id]]">
            <a href="#" on-click="entityClicked" class="name">[[item.name]]</a>
          </template>
          <span> </span>
          <span>[[item.message]]</span>
        </div>
      </div>
    </template>
`;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
      },

      entries: {
        type: Array,
        value: [],
      },
    };
  }

  formatTime(date) {
    return window.hassUtil.formatTime(new Date(date));
  }

  entityClicked(ev) {
    ev.preventDefault();
    this.fire('hass-more-info', { entityId: ev.model.item.entity_id });
  }
}

customElements.define('ha-logbook', HaLogbook);
