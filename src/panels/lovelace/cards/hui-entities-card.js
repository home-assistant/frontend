import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import stateCardType from '../../../common/entity/state_card_type.js';
import computeDomain from '../../../common/entity/compute_domain.js';
import { DOMAINS_HIDE_MORE_INFO } from '../../../common/const.js';

import '../../../components/ha-card.js';
import '../components/hui-entities-toggle.js';

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
      #states > div {
        margin: 4px 0;
      }
      .header {
        @apply --paper-font-headline;
        /* overwriting line-height +8 because entity-toggle can be 40px height,
           compensating this with reduced padding */
        line-height: 40px;
        color: var(--primary-text-color);
        padding: 4px 0 12px;
        display: flex;
        justify-content: space-between;
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
        <div class="name">[[_computeTitle(_config)]]</div>
        <template is="dom-if" if="[[_showHeaderToggle(_config.show_header_toggle)]]">
          <hui-entities-toggle hass="[[hass]]" entities="[[_config.entities]]"></hui-entities-toggle>
        </template>
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
      _config: Object,
    };
  }

  constructor() {
    super();
    this._elements = [];
  }

  ready() {
    super.ready();
    if (this._config) {
      this._buildConfig();
    }
  }

  getCardSize() {
    // +1 for the header
    return 1 + (this._config ? this._config.entities.length : 0);
  }

  _computeTitle(config) {
    return config.title;
  }

  _showHeaderToggle(show) {
    return show !== false;
  }

  setConfig(config) {
    this._config = config;
    if (this.$) this._buildConfig();
  }

  _buildConfig() {
    const config = this._config;
    const root = this.$.states;

    while (root.lastChild) {
      root.removeChild(root.lastChild);
    }

    this._elements = [];

    for (let i = 0; i < config.entities.length; i++) {
      const entityId = config.entities[i];
      if (!(entityId in this.hass.states)) continue;
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
      const container = document.createElement('div');
      container.appendChild(element);
      root.appendChild(container);
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
