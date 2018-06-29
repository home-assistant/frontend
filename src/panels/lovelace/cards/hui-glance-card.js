import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import computeStateDisplay from '../../../common/entity/compute_state_display.js';
import computeStateName from '../../../common/entity/compute_state_name.js';
import createErrorCardConfig from '../common/create-error-card-config.js';

import './hui-error-card.js';
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
          align-items: center;
          cursor: pointer;
          margin-bottom: 12px;
          width: 20%;
        }
        .entity div {
          width: 100%;
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      </style>

      <ha-card header="[[config.title]]">
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
          <hui-error-card config="[[_error]]"></hui-error-card>
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
      _error: Object
    };
  }

  getCardSize() {
    return 3;
  }

  _computeEntities(config) {
    if (!config || !config.entities || !Array.isArray(config.entities)) {
      const error = 'Error in card configuration.';
      _error = createErrorCardConfig(error, config);
      return [];
    }

    this._error = null;
    return config.entities;
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
