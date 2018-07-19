import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-icon-button/paper-icon-button.js';

import '../../../components/ha-card.js';
import '../components/hui-image.js';

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

const STATES_OFF = new Set([
  'closed',
  'locked',
  'not_home',
  'off'
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
          padding: 4px 8px;
          font-size: 16px;
          line-height: 40px;
          color: white;
          display: flex;
          justify-content: space-between;
        }
        .box .title {
          font-weight: 500;
          margin-left: 8px;
        }
        paper-icon-button {
          color: #A9A9A9;
        }
        paper-icon-button.state-on {
          color: white;
        }
      </style>

      <ha-card>
        <hui-image
          class$='[[_computeImageClass(_config)]]'
          on-click='_handleImageClick'
          hass="[[hass]]"
          image="[[_config.image]]"
          state-image="[[_config.state_image]]"
          camera-image="[[_config.camera_image]]"
          entity="[[_config.entity]]"
        ></hui-image>
        <div class="box">
          <template is="dom-if" if="[[_config.title]]">
            <div class="title">[[_config.title]]</div>
          </template>
          <template is="dom-if" if="[[_entitiesDialog.length]]">
            <div>
              <template is="dom-repeat" items="[[_entitiesDialog]]">
                <paper-icon-button
                  on-click="_openDialog"
                  class$="[[_computeButtonClass(item.entity, hass.states)]]"
                  icon="[[_computeIcon(item.entity, hass.states)]]"
                  title="[[_computeTooltip(item.entity, hass.states)]]"
                ></paper-icon-button>
              </template>
            </div>
          </template>
          <template is="dom-if" if="[[_entitiesToggle.length]]">
            <div>
              <template is="dom-repeat" items="[[_entitiesToggle]]">
                <paper-icon-button
                  on-click="_callService"
                  class$="[[_computeButtonClass(item.entity, hass.states)]]"
                  icon="[[_computeIcon(item.entity, hass.states)]]"
                  title="[[_computeTooltip(item.entity, hass.states)]]"
                ></paper-icon-button>
              </template>
            </div>
          </template>
        </div>
      </ha-card>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      _config: Object,
      _entitiesDialog: Array,
      _entitiesToggle: Array,
      _visibleEntitiesDialog: {
        type: Array,
        computed: '_computeVisible(_entitiesDialog, hass.states)',
      },
      _visibleEntitiesToggle: {
        type: Array,
        computed: '_computeVisible(_entitiesToggle, hass.states)',
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
    const entities = processConfigEntities(config.entities);
    const dialog = [];
    const toggle = [];

    entities.forEach((item) => {
      if (config.force_dialog || !DOMAINS_TOGGLE.has(computeDomain(item.entity))) {
        dialog.push(item);
      } else {
        toggle.push(item);
      }
    });
    this.setProperties({
      _config: config,
      _entitiesDialog: dialog,
      _entitiesToggle: toggle
    });
  }

  _computeVisible(collection, states) {
    return collection.filter(el => el.entity in states);
  }

  _computeIcon(entityId, states) {
    return stateIcon(states[entityId]);
  }

  _computeButtonClass(entityId, states) {
    return STATES_OFF.has(states[entityId].state) ? '' : 'state-on';
  }

  _computeTooltip(entityId, states) {
    return `${computeStateName(states[entityId])}: ${computeStateDisplay(this.localize, states[entityId])}`;
  }

  _computeImageClass(config) {
    return config.navigation_path || config.camera_image ? 'clickable' : '';
  }

  _openDialog(ev) {
    this.fire('hass-more-info', { entityId: ev.model.item.entity });
  }

  _callService(ev) {
    toggleEntity(this.hass, ev.model.item.entity);
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
