import '@polymer/paper-button/paper-button.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';


import LocalizeMixin from '../mixins/localize-mixin.js';

/*
 * @appliesMixin LocalizeMixin
 */
class HaVacuumState extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
    <style>
      paper-button.interactable {
        color: var(--primary-color);
        font-weight: 500;
        top: 3px;
        height: 37px;
        margin-right: -.57em;
      }
    </style>

    <template is="dom-if" if="[[currentInteractable]]">
    <paper-button class="interactable" on-click="_callService">[[currentInteractable]]</paper-button>
    </template>
    <template is="dom-if" if="[[!currentInteractable]]">
    [[stateObj.state]]
    </template>
`;
  }

  static get properties() {
    return {
      hass: Object,
      stateObj: Object,
      currentInteractable: {
        type: String,
        computed: 'computeCurrentInteractable(stateObj.state)',
      },

      currentService: {
        type: String,
        computed: 'computeCurrentService(stateObj.state)',
      }
    };
  }

  computeCurrentInteractable(state) {
    if (state != null) {
      switch (state) {
        case 'cleaning':
          return 'Return to dock';
        case 'docked':
          return 'Start cleaning';
        case 'paused':
          return 'Resume cleaning';
        case 'idle':
          return 'Start cleaning';
        default:
          return null;
      }
    }
    return null;
  }

  computeCurrentService(state) {
    if (state != null) {
      switch (state) {
        case 'cleaning':
          return 'return_to_base';
        case 'docked':
          return 'start_pause';
        case 'paused':
          return 'start_pause';
        case 'idle':
          return 'start_pause';
        default:
          return null;
      }
    }
    return null;
  }

  _localizeState(state) {
    return this.localize(`state.vacuum.${state}`) || state;
  }

  _callService(ev) {
    ev.stopPropagation();
    const service = this.currentService;
    const data = {
      entity_id: this.stateObj.entity_id,
    };
    this.hass.callService('vacuum', service, data);
  }
}
customElements.define('ha-vacuum-state', HaVacuumState);
