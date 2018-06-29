import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-icon-button/paper-icon-button.js';

import '../../../components/ha-card.js';
import '../components/hui-image.js';

import { STATES_OFF } from '../../../common/const.js';
import canToggleState from '../../../common/entity/can_toggle_state.js';
import computeStateDisplay from '../../../common/entity/compute_state_display.js';
import computeStateName from '../../../common/entity/compute_state_name.js';
import stateIcon from '../../../common/entity/state_icon.js';
import toggleEntity from '../common/entity/toggle-entity.js';

import EventsMixin from '../../../mixins/events-mixin.js';
import LocalizeMixin from '../../../mixins/localize-mixin.js';

/*
 * @appliesMixin EventsMixin
 * @appliesMixin LocalizeMixin
 */
class HuiPictureGlanceCard extends LocalizeMixin(EventsMixin(PolymerElement)) {
  static get template() {
    return html`
      <style>
        ha-card {
          position: relative;
          min-height: 48px;
          overflow: hidden;
        }
        .box {
          @apply --paper-font-common-nowrap;
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.3);
          padding: 4px 16px;
          font-size: 16px;
          line-height: 40px;
          color: white;
          display: flex;
          justify-content: space-between;
        }
        .box .title {
          font-weight: 500;
        }
        paper-icon-button, iron-icon {
          color: #A9A9A9;
        }
        paper-icon-button.state-on, iron-icon.state-on {
          color: white;
        }
        iron-icon {
          padding: 8px;
        }
      </style>

      <ha-card>
        <hui-image hass="[[hass]]" image="[[config.image]]" camera-image="[[config.camera_image]]"></hui-image>
        <div class="box">
          <div class="title">[[_config.title]]</div>
          <div>
            <template is="dom-repeat" items="[[_entitiesDialog]]">
              <template is="dom-if" if="[[_showEntity(item, hass.states)]]">
                <paper-icon-button
                  on-click="_openDialog"
                  class$="[[_computeClass(item, hass.states)]]"
                  icon="[[_computeIcon(item, hass.states)]]"
                  title="[[_computeTooltip(item, hass.states)]]"
                ></paper-icon-button>
              </template>
            </template>
          </div>
          <div>
            <template is="dom-repeat" items="[[_entitiesService]]">
              <template is="dom-if" if="[[_showEntity(item, hass.states)]]">
                <paper-icon-button
                  on-click="_callService"
                  class$="[[_computeClass(item, hass.states)]]"
                  icon="[[_computeIcon(item, hass.states)]]"
                  title="[[_computeTooltip(item, hass.states)]]"
                ></paper-icon-button>
              </template>
            </template>
          </div>
        </div>
      </ha-card>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      _config: Object,
      _entitiesDialog: {
        type: Array,
        computed: '_computeEntitiesDialog(hass, _config, _entitiesService)',
      },
      _entitiesService: {
        type: Array,
        value: [],
        computed: '_computeEntitiesService(hass, _config)',
      },
    };
  }

  getCardSize() {
    return 3;
  }

  setConfig(config) {
    if (!config || !config.entities || !Array.isArray(config.entities) ||
      !(config.image || config.camera_image)) {
      throw new Error('Invalid card configuration');
    }

    this._config = config;
  }

  _computeEntitiesDialog(hass, config, entitiesService) {
    if (config.force_dialog) {
      return config.entities;
    }

    return config.entities.filter(entity => !entitiesService.includes(entity));
  }

  _computeEntitiesService(hass, config) {
    if (config.force_dialog) {
      return [];
    }

    return config.entities.filter(entity =>
      canToggleState(this.hass, this.hass.states[entity]));
  }

  _showEntity(entityId, states) {
    return entityId in states;
  }

  _computeIcon(entityId, states) {
    return stateIcon(states[entityId]);
  }

  _computeClass(entityId, states) {
    return STATES_OFF.includes(states[entityId].state) ? '' : 'state-on';
  }

  _computeTooltip(entityId, states) {
    return `${computeStateName(states[entityId])}: ${computeStateDisplay(this.localize, states[entityId])}`;
  }

  _openDialog(ev) {
    this.fire('hass-more-info', { entityId: ev.model.item });
  }

  _callService(ev) {
    const entityId = ev.model.item;
    toggleEntity(this.hass, entityId);
  }
}

customElements.define('hui-picture-glance-card', HuiPictureGlanceCard);
