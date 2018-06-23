import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import computeStateDisplay from '../../../common/entity/compute_state_display.js';
import computeStateName from '../../../common/entity/compute_state_name.js';

import '../../../components/entity/state-badge.js';
import '../../../components/ha-card.js';

import EventsMixin from '../../../mixins/events-mixin.js';
import LocalizeMixin from '../../../mixins/localize-mixin.js';

/*
 * @appliesMixin EventsMixin
 * @appliesMixin LocalizeMixin
 */
class HuiGlanceCard extends LocalizeMixin(EventsMixin(PolymerElement)) {
  static get template() {
    return html`
      <style>
        ha-card {
          padding: 16px;
        }
        .header {
          @apply --paper-font-headline;
          /* overwriting line-height +8 because entity-toggle can be 40px height,
            compensating this with reduced padding */
          line-height: 40px;
          color: var(--primary-text-color);
          padding: 4px 0 12px;
        }
        .header .name {
          @apply --paper-font-common-nowrap;
        }
        .entities {
          padding: 4px 0;
          display: flex;
          margin-bottom: -12px;
          flex-wrap: wrap;
        }
        .entity {
          box-sizing: border-box;
          padding: 0 4px;
          display: flex;
          flex-direction: column;
          cursor: pointer;
          margin-bottom: 12px;
          width: 20%;
        }
        .entity div, .entity state-badge {
          width: 100%;
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .error {
          background-color: red;
          color: white;
          text-align: center;
        }
      </style>

      <ha-card>
        <div class="header">
          <div class="name">[[_computeTitle(config)]]</div>
        </div>
        <div class="entities">
          <template is="dom-repeat" items="[[_entities]]">
            <template is="dom-if" if="[[_showEntity(item, hass.states)]]">
              <div class="entity" on-click="_openDialog">
                <div>[[_computeName(item, hass.states)]]</div>
                <state-badge state-obj="[[_computeStateObj(item, hass.states)]]"></state-badge>
                <div>[[_computeState(item, hass.states)]]</div>
              </div>
            </template>
          </template>
        </div>
        <template is="dom-if" if="[[_error]]">
          <div class="error">[[_error]]</div>
        </template>
      </ha-card>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      config: Object,
      _entities: {
        type: Array,
        computed: '_computeEntities(config)'
      },
      _error: String
    };
  }

  getCardSize() {
    return 3;
  }

  _computeTitle(config) {
    return config.title;
  }

  _computeEntities(config) {
    if (config && config.entities && Array.isArray(config.entities)) {
      this._error = null;
      return config.entities;
    }
    this._error = 'Error in card configuration.';
    return [];
  }

  _showEntity(item, states) {
    return item in states;
  }

  _computeName(item, states) {
    return computeStateName(states[item]);
  }

  _computeStateObj(item, states) {
    return states[item];
  }

  _computeState(item, states) {
    return computeStateDisplay(this.localize, states[item]);
  }

  _openDialog(ev) {
    this.fire('hass-more-info', { entityId: ev.model.item });
  }
}

customElements.define('hui-glance-card', HuiGlanceCard);
