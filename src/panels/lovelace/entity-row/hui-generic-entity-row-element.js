import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-button/paper-button.js';


import '../../../components/ha-cover-controls.js';
import '../../../components/ha-cover-tilt-controls.js';
import '../../../components/entity/ha-entity-toggle.js';
import '../../../components/entity/state-badge.js';

import computeStateName from '../../../common/entity/compute_state_name.js';
import computeStateDisplay from '../../../common/entity/compute_state_display.js';

import EventsMixin from '../../../mixins/events-mixin.js';
import LocalizeMixin from '../../../mixins/localize-mixin.js';

/*
 * @appliesMixin EventsMixin
 * @appliesMixin LocalizeMixin
 */
class HuiGenericEntityRowElement extends LocalizeMixin(EventsMixin(PolymerElement)) {
  static get template() {
    return html`
      <style>
        :host {
          cursor: pointer;
          display: flex;
        }
        .flex {
          margin-left: 16px;
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .secondary {
          color: var(--secondary-text-color);
        }
        paper-button {
          color: var(--primary-color);
          font-weight: 500;
          margin: 0;
        }
      </style>
      <template is="dom-if" if="[[_stateObj]]">
        <state-badge state-obj="[[_stateObj]]"></state-badge>
        <div class="flex">
          <div class="info">
            [[_computeName(_config.name, _stateObj)]]
            <template is="dom-if" if="[[_config.secondary_info]]">
              <div class="secondary">
                [[_computeSecondaryInfo(_config.secondary_info, _stateObj)]]
              </div>
            </template>
          </div>
          <div>
            <template is="dom-if" if="[[_equals(_controlsType, 'cover')]]">
              to-do
            </template>
            <template is="dom-if" if="[[_equals(_controlsType, 'button')]]">
              <paper-button on-click="_controlButtonClicked">[[_computeButtonTitle(_stateObj)]]</paper-button>
            </template>
            <template is="dom-if" if="[[_equals(_controlsType, 'toggle')]]">
              <ha-entity-toggle hass="[[hass]]" state-obj="[[_stateObj]]"></ha-entity-toggle>
            </template>
            <template is="dom-if" if="[[_equals(_controlsType, 'text')]]">
              [[_computeState(_stateObj)]]
            </template>
          </div>
        </div>
      </template>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      _config: Object,
      _stateObj: {
        type: Object,
        computed: '_computeStateObj(hass.states, _config.entity)'
      },
      _controlsType: {
        type: String,
        computed: '_computeControlstype(_config.entity)'
      }
    };
  }

  ready() {
    super.ready();
    this.addEventListener('click', () => this._cardClicked());
  }

  getCardSize() {
    return 1;
  }

  setConfig(config) {
    if (!config || !config.entity) {
      throw new Error('Card config incorrect');
    }
    this._config = config;
  }

  _equals(a, b) {
    return a === b;
  }

  _computeStateObj(states, entityId) {
    return states && entityId && entityId in states ? states[entityId] : null;
  }

  _computeControlstype(entityId) {
    switch (entityId.split('.', 1)[0]) {
      case 'cover':
        return 'cover';
      case 'group':
      case 'input_boolean':
      case 'light':
      case 'switch':
        return 'toggle';
      case 'lock':
      case 'scene':
      case 'script':
        return 'button';
      case 'weblink':
        return '';
      default:
        return 'text';
    }
  }

  _computeName(name, stateObj) {
    return name || computeStateName(stateObj);
  }

  _computeSecondaryInfo(info, stateObj) {
    switch (info) {
      case 'entity-id':
        return stateObj.entity_id;
      default:
        return '';
    }
  }

  _computeState(stateObj) {
    return computeStateDisplay(this.localize, stateObj);
  }

  _cardClicked() {
    const entityId = this._config.entity;
    if (entityId.split('.', 1)[0] === 'weblink') {
      window.open(this._stateObj.state, '_blank');
      return;
    }
    this.fire('hass-more-info', { entityId });
  }

  _computeButtonTitle(stateObj) {
    switch (stateObj.entity_id.split('.', 1)[0]) {
      case 'lock':
        return stateObj.state === 'locked' ?
          this.localize('ui.card.lock.unlock') : this.localize('ui.card.lock.lock');
      case 'scene':
        return this.localize('ui.card.scene.activate');
      case 'scene':
        return this.localize('ui.card.script.execute');
    }
  }

  _controlButtonClicked(ev) {
    ev.stopPropagation();
    const stateObj = this._stateObj;
    switch (stateObj.entity_id.split('.', 1)[0]) {
      case 'lock':
        this.hass.callService('lock', stateObj.state === 'locked' ?
          'unlock' : 'lock', { entity_id: stateObj.entity_id });
        return;
      case 'scene':
        this.hass.callService('scene','turn_on', { entity_id: stateObj.entity_id });
        return;
      case 'script':
        this.hass.callService('script','turn_on', { entity_id: stateObj.entity_id });
    }
  }
}
customElements.define('hui-generic-entity-row-element', HuiGenericEntityRowElement);
