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
        :host(.theme-primary) {
          --paper-card-background-color:var(--primary-color);
          --paper-item-icon-color:var(--text-primary-color);
          color:var(--text-primary-color);
        }
        .entities {
          display: flex;
          padding: 0 16px 4px;
          flex-wrap: wrap;
        }
        .entities.no-header {
          padding-top: 16px;
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
        .name {
          min-height: var(--paper-font-body1_-_line-height, 20px);
        }
      </style>

      <ha-card header="[[_config.title]]">
        <div class$="[[_computeClasses(_config.title)]]">
          <template is="dom-repeat" items="[[_configEntities]]">
            <template is="dom-if" if="[[_showEntity(item, hass.states)]]">
              <div class="entity" on-click="_handleClick">
                <template is="dom-if" if="[[_showInfo(_config.show_name)]]">
                  <div class="name">[[_computeName(item, hass.states)]]</div>
                </template>
                <state-badge
                  state-obj="[[_computeStateObj(item, hass.states)]]"
                  override-icon="[[item.icon]]"
                ></state-badge>
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

    if (config && config.theming) {
      if (typeof (config.theming) !== 'string') {
        throw new Error('Incorrect theming config.');
      }
      this.classList.add(`theme-${config.theming}`);
    }

    this._configEntities = processConfigEntities(config.entities);
  }

  _computeClasses(hasHeader) {
    return `entities ${hasHeader ? '' : 'no-header'}`;
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
