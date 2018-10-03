import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../components/domain-icon.js';


import formatDateTime from '../../common/datetime/format_date_time.js';
import EventsMixin from '../../mixins/events-mixin.js';

/*
 * @appliesMixin EventsMixin
 */
class HaLogbook extends EventsMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="iron-flex"></style>
    <style>
      :host {
        display: block;
      }

      .entry {
        @apply --paper-font-body1;
        line-height: 2em;
      }

      .date {
        width: 130px;
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
        <div class="date">[[_formatDateTime(item.when)]]</div>
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

  _formatDateTime(date) {
    return formatDateTime(new Date(date), this.language);
  }

  entityClicked(ev) {
    ev.preventDefault();
    this.fire('hass-more-info', { entityId: ev.model.item.entity_id });
  }
}

customElements.define('ha-logbook', HaLogbook);
