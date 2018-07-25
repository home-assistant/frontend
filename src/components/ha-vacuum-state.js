import '@polymer/paper-button/paper-button.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import LocalizeMixin from '../mixins/localize-mixin.js';

const STATES_INTERCEPTABLE = {
  cleaning: {
    action: 'Return to dock',
    service: 'return_to_base'
  },
  docked: {
    action: 'Start cleaning',
    service: 'start_pause'
  },
  idle: {
    action: 'Start cleaning',
    service: 'start_pause'
  },
  paused: {
    action: 'Resume cleaning',
    service: 'start_pause'
  },
  off: {
    action: 'Turn on',
    service: 'turn_on'
  },
  on: {
    action: 'Turn off',
    service: 'turn_off'
  },
};

/*
 * @appliesMixin LocalizeMixin
 */
class HaVacuumState extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      <style>
        paper-button {
          color: var(--primary-color);
          font-weight: 500;
          top: 3px;
          height: 37px;
          margin-right: -.57em;
        }
        paper-button[disabled] {
          background-color: transparent;
          color: var(--secondary-text-color);
        }
      </style>

      <paper-button
        on-click="_callService"
        disabled="[[!_interceptable]]"
      >[[_computeLabel(stateObj.state, stateObj.attributes.supported_features)]]</paper-button>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      stateObj: Object,
      _interceptable: {
        type: Boolean,
        computed: '_computeInterceptable(stateObj.state, stateObj.attributes.supported_features)'
      }
    };
  }

  _computeInterceptable(state, supportedFeatures) {
    return state in STATES_INTERCEPTABLE && supportedFeatures !== 0;
  }

  _computeLabel(state, supportedFeatures) {
    return state in STATES_INTERCEPTABLE && supportedFeatures !== 0 ?
      STATES_INTERCEPTABLE[state].action : this.localize(`ui.card.vacuum.${state}`);
  }

  _callService(ev) {
    ev.stopPropagation();
    const stateObj = this.stateObj;
    const service = STATES_INTERCEPTABLE[stateObj.state].service;
    this.hass.callService('vacuum', service, { entity_id: stateObj.entity_id });
  }
}
customElements.define('ha-vacuum-state', HaVacuumState);
