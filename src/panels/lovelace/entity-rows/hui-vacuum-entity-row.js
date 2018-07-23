import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-button/paper-button.js';

import '../components/hui-generic-entity-row.js';

import LocalizeMixin from '../../../mixins/localize-mixin.js';

/*
 * @appliesMixin LocalizeMixin
 */
class HuiVacuumEntityRow extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      <style>
        paper-button {
          color: var(--primary-color);
          font-weight: 500;
          margin: 0;
        }
      </style>
      <hui-generic-entity-row
        hass="[[hass]]"
        config="[[_config]]"
      >
    <template is="dom-if" if="[[supportsState(_stateObj)]]">
      <template is="dom-if" if="[[currentInteractable]]">
      <paper-button class="interactable" on-click="_callService">[[currentInteractable]]</paper-button>
      </template>
      <template is="dom-if" if="[[currentNotInteractable]]">
      <paper-button class="notinteractable">[[currentNotInteractable]]</paper-button>
      </template>
    </template>
    <template is="dom-if" if="[[!supportsState(_stateObj)]]">
      <paper-toggle-button checked="[[toggleChecked]]" on-change="_callService"></paper-toggle-button>
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

      currentInteractable: {
        type: String,
        computed: 'computeCurrentInteractable(_stateObj)',
      },

      currentNotInteractable: {
        type: String,
        computed: 'computeCurrentNotInteractable(_stateObj)',
      },

      currentService: {
        type: String,
        computed: 'computeCurrentService(_stateObj)',
      },

      toggleChecked: {
        type: Boolean,
        computed: 'computeToggleChecked(_stateObj)',
      }
    };
  }

  _computeStateObj(states, entityId) {
    return states && entityId in states ? states[entityId] : null;
  }

  setConfig(config) {
    if (!config || !config.entity) {
      throw new Error('Entity not configured.');
    }
    this._config = config;
  }

  computeCurrentInteractable(stateObj) {
    if (stateObj.state != null) {
      switch(stateObj.state) {
        case "cleaning":
          return "Return to dock";
        case "docked":
          return "Start cleaning";
        case "paused":
          return "Resume cleaning";
        default:
          return null;
      }
    }
    return null;
  }

  computeCurrentNotInteractable(stateObj) {
    if (stateObj.state != null) {
      switch(stateObj.state) {
        case "idle":
          return "Idle";
        case "returning":
          return "Returning to dock";
        case "error":
          return "Error";
        default:
          return null;
      }
    }
    return null;
  }

  computeCurrentService(stateObj) {
    if (stateObj.state != null) {
      switch(stateObj.state) {
        case "cleaning":
          return "return_to_base";
        case "docked":
          return "start_pause";
        case "paused":
          return "start_pause";
        case "on":
          return "turn_off";
        case "off":
          return "turn_on";
        default:
          return null;
      }
    }
    return null;
  }

  computeToggleChecked(stateObj) {
    if (stateObj.state != null) {
      return (stateObj.state == "on")
    }
  }

  supportsState(stateObj) {
    return (stateObj.attributes.supported_features & 4096) !== 0;
  }

  _callService(ev) {
    ev.stopPropagation();
    const stateObj = this._stateObj;
    const service = this.currentService;
    this.hass.callService('vacuum', service, { entity_id: stateObj.entity_id });
  }
}
customElements.define('hui-vacuum-entity-row', HuiVacuumEntityRow);
