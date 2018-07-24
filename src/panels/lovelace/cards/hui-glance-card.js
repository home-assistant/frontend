import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import computeStateDisplay from '../../../common/entity/compute_state_display.js';
import computeStateName from '../../../common/entity/compute_state_name.js';
import processConfigEntities from '../common/process-config-entities';

import toggleEntity from '../common/entity/toggle-entity.js';

import '../../../components/entity/state-badge.js';
import '../../../components/ha-card.js';
import '../../../components/ha-icon.js';

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
        ha-icon {
          padding: 8px;
          color: var(--paper-item-icon-color);
        }
        .entities {
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
          width: var(--glance-column-width, 20%);
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
                <template is="dom-if" if="[[_showInfo(_config.show_name)]]">
                  <div>[[_computeName(item, hass.states)]]</div>
                </template>
                <template is="dom-if" if="[[!item.icon]]">
                  <state-badge state-obj="[[_computeStateObj(item, hass.states)]]"></state-badge>
                </template>
                <template is="dom-if" if="[[item.icon]]">
                  <ha-icon icon="[[item.icon]]"></ha-icon>
                </template>
                <template is="dom-if" if="[[_showInfo(_config.show_state)]]">
                  <div>[[_computeState(item, hass.states)]]</div>
                </template>
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
    this.updateStyles({ '--glance-column-width': (config && config.column_width) || '20%' });
    this._configEntities = processConfigEntities(config.entities);
  }

  _showEntity(item, states) {
    return item.entity in states;
  }

  _showInfo(info) {
    return info !== false;
  }

  _computeName(item, states) {
    return 'name' in item ? item.name : computeStateName(states[item.entity]);
  }

  _computeStateObj(item, states) {
    return states[item.entity];
  }

  _computeState(item, states) {
    return computeStateDisplay(this.localize, states[item.entity]);
  }

  _handleClick(ev) {
    const config = ev.model.item;
    const entityId = config.entity;
    switch (config.tap_action) {
      case 'toggle':
        toggleEntity(this.hass, entityId);
        break;
      case 'call-service': {
        const [domain, service] = config.service.split('.', 2);
        const serviceData = Object.assign(
          {}, { entity_id: entityId },
          config.service_data
        );
        this.hass.callService(domain, service, serviceData);
        break;
      }
      default:
        this.fire('hass-more-info', { entityId });
    }
  }
}

customElements.define('hui-glance-card', HuiGlanceCard);
