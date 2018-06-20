import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../components/ha-card.js';

import computeDomain from '../../common/entity/compute_domain.js';
import computeStateName from '../../common/entity/compute_state_name.js';

import LocalizeMixin from '../../mixins/localize-mixin.js';

/*
 * @appliesMixin LocalizeMixin
 */
class HuiSceneCard extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      <style>
        ha-card {
          position: relative;
          cursor: pointer;
          min-height: 48px;
          line-height: 0;
        }
        img {
          width: 100%;
          height: auto;
          border-radius: 2px;
        }
        .text {
          @apply --paper-font-common-nowrap;
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.3);
          padding: 16px;
          font-size: 16px;
          line-height: 16px;
          color: white;
          border-bottom-left-radius: 2px;
          border-bottom-right-radius: 2px;
          display: flex;
          justify-content: space-between;
        }
        .text .title {
          font-weight: 500;
        }
        .error {
          background-color: red;
          color: white;
          text-align: center;
        }
      </style>

      <ha-card on-click="_callService">
        <img src="[[config.image]]">
        <div class="text">
          <div class="title">[[_computeTitle(config.entity, hass.states)]]</div>
          <div>[[localize('ui.card.scene.activate')]]</div>
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
      config: {
        type: Object,
        observer: '_configChanged'
      },
      _error: String
    };
  }

  getCardSize() {
    return 3;
  }

  _configChanged(config) {
    if (config && config.entity && computeDomain(config.entity) === 'scene' && config.image) {
      this._error = null;
    } else {
      this._error = 'Error in card configuration.';
    }
  }

  _computeTitle(entityId, states) {
    return entityId && computeStateName(states[entityId]);
  }

  _callService() {
    if (this.config && this.config.entity) {
      this.hass.callService('scene', 'turn_on', { entity_id: this.config.entity });
    }
  }
}

customElements.define('hui-scene-card', HuiSceneCard);
