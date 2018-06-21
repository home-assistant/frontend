import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import stateCardType from '../../../common/entity/state_card_type.js';
import computeDomain from '../../../common/entity/compute_domain.js';
import { DOMAINS_HIDE_MORE_INFO } from '../../../common/const.js';

import '../../../components/ha-card.js';

// just importing this now as shortcut to import correct state-card-*
import '../../../state-summary/state-card-content.js';

import EventsMixin from '../../../mixins/events-mixin.js';

/*
 * @appliesMixin EventsMixin
 */
class HuiEntitiesCard extends EventsMixin(PolymerElement) {
  static get template() {
    return html`
    <style>
      ha-card {
        padding: 16px;
      }
      #states {
        margin: -4px 0;
      }
      #states > * {
        display: block;
        margin: 4px 0;
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
      .state-card-dialog {
        cursor: pointer;
      }
    </style>

    <ha-card>
      <div class='header'>
        <div class="name">[[_computeTitle(config)]]</div>
      </div>
      <div id="states"></div>
    </ha-card>
`;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
        observer: '_hassChanged',
      },
      config: {
        type: Object,
        observer: '_configChanged',
      }
    };
  }

  constructor() {
    super();
    this._elements = [];
  }

  getCardSize() {
    // +1 for the header
    return 1 + (this.config ? this.config.entities.length : 0);
  }

  _computeTitle(config) {
    return config.title;
  }

  _configChanged(config) {
    const root = this.$.states;

    while (root.lastChild) {
      root.removeChild(root.lastChild);
    }

    this._elements = [];

    for (let i = 0; i < config.entities.length; i++) {
      const entityId = config.entities[i];
      const stateObj = this.hass.states[entityId];
      const tag = stateObj ? `state-card-${stateCardType(this.hass, stateObj)}` : 'state-card-display';
      const element = document.createElement(tag);
      if (!DOMAINS_HIDE_MORE_INFO.includes(computeDomain(entityId))) {
        element.classList.add('state-card-dialog');
        element.addEventListener('click', () => this.fire('hass-more-info', { entityId }));
      }
      element.stateObj = stateObj;
      element.hass = this.hass;
      this._elements.push({ entityId, element });
      root.appendChild(element);
    }
  }

  _hassChanged(hass) {
    for (let i = 0; i < this._elements.length; i++) {
      const { entityId, element } = this._elements[i];
      const stateObj = hass.states[entityId];
      element.stateObj = stateObj;
      element.hass = hass;
    }
  }
}

customElements.define('hui-entities-card', HuiEntitiesCard);
