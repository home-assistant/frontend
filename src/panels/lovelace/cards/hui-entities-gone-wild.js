import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/iron-icon/iron-icon.js';

import '../../../components/ha-card.js';

import { STATES_ON } from '../../../common/const.js';
import canToggleState from '../../../common/entity/can_toggle_state.js';
import computeDomain from '../../../common/entity/compute_domain.js';
import computeStateDisplay from '../../../common/entity/compute_state_display.js';
import computeStateName from '../../../common/entity/compute_state_name.js';
import stateIcon from '../../../common/entity/state_icon.js';

import EventsMixin from '../../../mixins/events-mixin.js';
import LocalizeMixin from '../../../mixins/localize-mixin.js';

/*
 * @appliesMixin EventsMixin
 * @appliesMixin LocalizeMixin
 */
class HuiEntitiesGoneWildCard extends LocalizeMixin(EventsMixin(PolymerElement)) {
  static get template() {
    return html`
    <style>
      ha-card {
        padding: 16px;
      }
      .header {
        @apply --paper-font-headline;
        /* overwriting line-height +8 because entity-toggle can be 40px height,
           compensating this with reduced padding */
        line-height: 40px;
        color: var(--primary-text-color);
        padding: 4px 0 12px;
      }
      .header .name {
        @apply --paper-font-common-nowrap;
      }
      .content {
        position: relative;
      }
      .content > iron-icon,
      .content > div {
        white-space: nowrap;
        position: absolute;
        transform: translate(-50%, -50%);
      }
      .content > div > * {
        position: static;
      }
      .content img {
        width: 100%;
      }
      .clickable {
        cursor: pointer;
        padding: 4px;
      }
      iron-icon,
      paper-icon-button {
        color: var(--icon-color, var(--state-icon-color, #44739e));
      }
      iron-icon.state-on {
        color: var(--icon-color-on, var(--state-icon-active-color, #FDD835));
      }
    </style>

    <ha-card>
      <div class='header'>
        <div class="name">[[config.title]]</div>
      </div>
      <div class="content">
        <img src="[[config.image]]">
        <template is="dom-repeat" items="[[config.entities]]">
          <template is="dom-if" if="[[_equals(item.type, 'badge')]]">
            <iron-icon
              on-click="_openDialog"
              class$="[[_computeClass(item.entity_id, hass)]]"
              style$="[[_computeStyle(item)]]"
              icon="[[_computeIcon(item.entity_id, hass.states)]]"
              title="[[_computeTooltip(item.entity_id, hass.states)]]"
            ></iron-icon>
          </template>
          <template is="dom-if" if="[[_equals(item.type, 'state')]]">
            <div
              on-click="_openDialog"
              class="clickable"
              style$="[[_computeStyle(item)]]"
              title="[[_computeTooltip(item.entity_id, hass.states)]]"
            >[[_computeState(item.entity_id, hass.states)]]</div>
          </template>
          <template is="dom-if" if="[[_equals(item.type, 'button')]]">
            <div
              on-click="_callService"
              class="clickable"
              style$="[[_computeStyle(item)]]"
            >
              <template is="dom-if" if="[[item.icon]]">
                <iron-icon icon="[[item.icon]]"></iron-icon>
              </template>
              [[item.text]]
            </div>
          </template>
          <template is="dom-if" if="[[_equals(item.type, 'text')]]">
            <div style$="[[_computeStyle(item)]]">[[item.text]]</div>
          </template>
        </template>
      </div>
    </ha-card>
`;
  }

  static get properties() {
    return {
      hass: Object,
      config: Object
    };
  }

  constructor() {
    super();
    this._elements = [];
  }

  getCardSize() {
    return 5;
  }

  _equals(a, b) {
    return a === b;
  }

  _computeStateObj(item, states) {
    return states[item];
  }

  _computeState(item, states) {
    return computeStateDisplay(this.localize, states[item]);
  }

  _computeClass(entityId, hass) {
    return (canToggleState(hass, hass.states[entityId]) &&
      STATES_ON.includes(hass.states[entityId].state)) ?
      'state-on clickable' : 'clickable';
  }

  _computeStyle(item) {
    return `top: ${item.top}; left: ${item.left}; ${item.style || ''}`;
  }

  _computeTooltip(entityId, states) {
    return `${computeStateName(states[entityId])}: ${computeStateDisplay(this.localize, states[entityId])}`;
  }

  _computeIcon(entityId, states) {
    return stateIcon(states[entityId]);
  }

  _openDialog(ev) {
    this.fire('hass-more-info', { entityId: ev.model.item.entity_id });
  }

  _callService(ev) {
    const item = ev.model.item;
    this.hass.callService(item.domain, item.service, item.service_data);
  }
}

customElements.define('hui-entities-gone-wild-card', HuiEntitiesGoneWildCard);
