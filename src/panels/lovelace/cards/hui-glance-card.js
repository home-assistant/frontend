import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import computeStateDisplay from '../../../common/entity/compute_state_display.js';
import computeStateName from '../../../common/entity/compute_state_name.js';
import processConfigEntities from '../common/process-config-entities';

import toggleEntity from '../common/entity/toggle-entity.js';
import turnOnOffEntity from '../common/entity/turn-on-off-entity.js';

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
        ha-card[header] {
          padding-top: 0;
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

      <ha-card header$="[[_config.title]]">
        <div class="entities">
          <template is="dom-repeat" items="[[_configEntities]]">
            <template is="dom-if" if="[[_showEntity(item, hass.states)]]">
              <div class="entity" on-click="_handleClick">
                <div>[[_computeName(item, hass.states)]]</div>
                <state-badge state-obj="[[_computeStateObj(item, hass.states)]]"></state-badge>
                <div>[[_computeState(item, hass.states)]]</div>
              </div>
            </template>
          </template>
        </div>
      </ha-card>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      _config: Object,
      _configEntities: Array,
    };
  }

  getCardSize() {
    return 3;
  }

  setConfig(config) {
    this._config = config;
    this._configEntities = processConfigEntities(config.entities);
  }

  _showEntity(item, states) {
    return item.entity in states;
  }

  _computeName(item, states) {
    return item.name || computeStateName(states[item.entity]);
  }

  _computeStateObj(item, states) {
    return states[item.entity];
  }

  _computeState(item, states) {
    return computeStateDisplay(this.localize, states[item.entity]);
  }

  _handleClick(ev) {
    const entityId = ev.model.item.entity;
    switch (ev.model.item.tap_action) {
      case 'toggle':
        toggleEntity(this.hass, entityId);
        break;
      case 'turn_on':
        turnOnOffEntity(this.hass, entityId, true);
        break;
      default:
        this.fire('hass-more-info', { entityId });
    }
  }
}

customElements.define('hui-glance-card', HuiGlanceCard);
