import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-icon-button/paper-icon-button.js';

import '../../../components/ha-card.js';
import '../components/hui-image.js';

import { STATES_OFF } from '../../../common/const.js';
import computeStateDisplay from '../../../common/entity/compute_state_display.js';
import computeStateName from '../../../common/entity/compute_state_name.js';
import stateIcon from '../../../common/entity/state_icon.js';
import toggleEntity from '../common/entity/toggle-entity.js';
import processConfigEntities from '../common/process-config-entities';

import EventsMixin from '../../../mixins/events-mixin.js';
import LocalizeMixin from '../../../mixins/localize-mixin.js';
import NavigateMixin from '../../../mixins/navigate-mixin.js';
import computeDomain from '../../../common/entity/compute_domain';

const DOMAINS_TOGGLE = new Set([
  'input_boolean',
  'light',
  'switch'
]);

/*
 * @appliesMixin EventsMixin
 * @appliesMixin LocalizeMixin
 * @appliesMixin NavigateMixin
 */
class HuiPictureGlanceCard extends NavigateMixin(LocalizeMixin(EventsMixin(PolymerElement))) {
  static get template() {
    return html`
      <style>
        ha-card {
          position: relative;
          min-height: 48px;
          overflow: hidden;
        }
        hui-image.clickable {
          cursor: pointer;
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
        <hui-image
          class$='[[_computeImageClass]]'
          on-click='_handleImageClick'
          hass="[[hass]]"
          image="[[_config.image]]"
          state-image="[[_config.state_image]]"
          camera-image="[[_config.camera_image]]"
          entity="[[_config.entity]]"
        ></hui-image>
        <div class="box">
          <div class="title">[[_config.title]]</div>
          <div>
            <template is="dom-repeat" items="[[_entitiesDialog]]">
              <template is="dom-if" if="[[_showEntity(item, hass.states)]]">
                <paper-icon-button
                  on-click="_openDialog"
                  class$="[[_computeButtonClass(item, hass.states)]]"
                  icon="[[_computeIcon(item, hass.states)]]"
                  title="[[_computeTooltip(item, hass.states)]]"
                ></paper-icon-button>
              </template>
            </template>
          </div>
          <div>
            <template is="dom-repeat" items="[[_entitiesToggle]]">
              <template is="dom-if" if="[[_showEntity(item, hass.states)]]">
                <paper-icon-button
                  on-click="_callService"
                  class$="[[_computeButtonClass(item, hass.states)]]"
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
      _configEntities: Array,
      _entitiesDialog: {
        type: Array,
        computed: '_computeEntitiesDialog(hass, _entitiesToggle)',
      },
      _entitiesToggle: {
        type: Array,
        value: [],
        computed: '_computeEntitiesToggle(hass)',
      },
    };
  }

  getCardSize() {
    return 3;
  }

  setConfig(config) {
    if (!config || !config.entities || !Array.isArray(config.entities) ||
      !(config.image || config.camera_image || config.state_image) ||
      (config.state_image && !config.entity)) {
      throw new Error('Invalid card configuration');
    }
    this.setProperties({
      _configEntities: processConfigEntities(config.entities),
      _config: config,
    });
  }

  _computeEntitiesDialog(hass, entitiesService) {
    if (this._config.force_dialog) {
      return this._configEntities;
    }

    return this._configEntities.filter(item => !entitiesService.includes(item.entity) &&
                                  (item.entity in hass.states));
  }

  _computeEntitiesToggle(hass) {
    if (this._config.force_dialog) {
      return [];
    }

    return this._configEntities.filter(item =>
      (item.entity in hass.states) && DOMAINS_TOGGLE.has(computeDomain(item.entity)));
  }

  _showEntity(item, states) {
    return item.entity in states;
  }

  _computeIcon(item, states) {
    return stateIcon(states[item.entity]);
  }

  _computeButtonClass(item, states) {
    return STATES_OFF.includes(states[item.entity].state) ? '' : 'state-on';
  }

  _computeTooltip(item, states) {
    return `${computeStateName(states[item.entity])}: ${computeStateDisplay(this.localize, states[item.entity])}`;
  }

  _computeImageClass() {
    return this._config.navigation_path || this._config.camera_image ? 'clickable' : '';
  }

  _openDialog(ev) {
    this.fire('hass-more-info', { entityId: ev.model.item.entity });
  }

  _callService(ev) {
    const entityId = ev.model.item.entity;
    toggleEntity(this.hass, entityId);
  }

  _handleImageClick() {
    if (this._config.navigation_path) {
      this.navigate(this._config.navigation_path);
      return;
    }

    if (this._config.camera_image) {
      this.fire('hass-more-info', { entityId: this._config.camera_image });
    }
  }
}

customElements.define('hui-picture-glance-card', HuiPictureGlanceCard);
