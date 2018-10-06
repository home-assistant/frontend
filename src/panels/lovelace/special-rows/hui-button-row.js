import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-button/paper-button.js';

import computeStateName from '../../../common/entity/compute_state_name.js';

class HuiButtonRow extends PolymerElement {
  static get template() {
    return html`
${this.styleTemplate}
${this.buttonsTemplate}
    `;
  }

  static get buttonsTemplate() {
    return html`
    <div class="flex-box">
        <template is="dom-repeat" items="[[buttons]]" as="button">
            <template is="dom-if" if="[[button.not_found]]">
                <div class="not-found">
                  Entity not available: [[button.service_data.entity_id]]
                </div>
            </template>
            <template is="dom-if" if="[[!button.not_found]]">
                <paper-button on-click="handleButton">
                    <template is="dom-if" if="{{showIcon(button)}}">
                        <ha-icon icon="[[button.icon]]" class$="[[getClass(button.icon_color)]]"></ha-icon>
                    </template>
                    <template is="dom-if" if="{{ showStateBadge(button) }}">
                      <state-badge
                        state-obj="[[button.state]]"
                        override-icon="[[button.icon]]"></state-badge>
                    </template>
                    {{button.name}}
                </paper-button>
            </template>
        </template>
    </div>
`;
  }

  static get styleTemplate() {
    return html`
<style>
 .flex-box {
     display: flex;
     justify-content: space-evenly;
 }
 paper-button {
     color: var(--primary-color);
     font-weight: 500;
     margin-right: -.57em;
 }
 ha-icon {
     padding-right: 5px;
 }
 .icon-default {
     color: var(--primary-color);
 }
 .icon-red {
     color: var(--google-red-500);
 }
 .icon-green {
     color: var(--google-green-500);
 }
 .icon-yellow {
     color: var(--google-yellow-500);
 }
 .icon-grey {
     color: var(--paper-grey-200);
 }
 .not-found {
   flex: 1;
   background-color: yellow;
   padding: 8px;
   margin: 8px;
 }
</style>
    `;
  }

  static get properties() {
    return {
      _hass: Object,
      _config: Object,
      buttons: Array,
      stateObj: { type: Object, value: null },
    };
  }

  getClass(color) {
    if (!color) return 'icon-default';
    return `icon-${color}`;
  }

  showStateBadge(button) {
    return button.state && !button.no_icon && !this.showIcon(button);
  }

  showIcon(button) {
    return (!button.state && button.icon) || (button.icon && button.icon_color);
  }

  makeButtonFromEntity(entity) {
    const parts = entity.split('.');
    const domain = parts[0];
    let service;
    switch (domain) {
      case 'light':
      case 'switch':
      case 'script':
      case 'group':
        service = 'toggle';
        break;
      case 'media_player':
        service = 'media_play_pause';
        break;
      case 'scene':
        service = 'turn_on';
        break;
      default:
        throw new Error(`cannot use ${entity} without a specifying a service and service_data`);
    }
    return {
      service: `${domain}.${service}`,
      service_data: {
        entity_id: entity
      },
      generated: true
    };
  }

  setConfig(config) {
    this._config = config;
    if (!config.buttons) {
      throw new Error('missing buttons');
    }
    if (!Array.isArray(config.buttons)) {
      throw new Error('buttons must be an array');
    }
    if (config.buttons.length <= 0) {
      throw new Error('at least one button required');
    }

    this.buttons = config.buttons.map((button) => {
      if (typeof button === 'string') {
        return this.makeButtonFromEntity(button);
      }
      if (button.entity) {
        const b = this.makeButtonFromEntity(button.entity);
        b.icon = button.icon;
        b.icon_color = button.icon_color;
        b.name = button.name;
        return b;
      }

      if (!button.service) throw new Error('service required');
      if (!button.service_data) button.service_data = {};
      if (!button.name) throw new Error('name required');
      return button;
    });
  }

  set hass(hass) {
    this._hass = hass;

    this.buttons = this.buttons.map((button) => {
      const state = hass.states[button.service_data.entity_id];
      if (state) {
        button.state = state;
      } else if (button.generated) {
        button.not_found = true;
        return button;
      }
      if (button.name) return button;
      if (button.icon) return button;

      if (state) {
        button.name = computeStateName(state);
      }
      return button;
    });
  }

  handleButton(evt) {
    const button = evt.model.get('button');
    const svc = button.service.split('.');
    this._hass.callService(svc[0], svc[1], button.service_data);
  }
}
customElements.define('hui-button-row', HuiButtonRow);
