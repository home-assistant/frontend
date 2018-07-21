import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../components/ha-card.js';
import '../components/hui-entities-toggle.js';

import createRowElement from '../common/create-row-element.js';
import processConfigEntities from '../common/process-config-entities.js';
import computeDomain from '../../../common/entity/compute_domain.js';
import { DOMAINS_HIDE_MORE_INFO } from '../../../common/const.js';

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
      #states > div > * {
        display: block;
        overflow: hidden;
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
      <template is='dom-if' if='[[_showHeader(_config)]]'>
        <div class='header'>
          <div class="name">[[_config.title]]</div>
          <template is="dom-if" if="[[_showHeaderToggle(_config.show_header_toggle)]]">
            <hui-entities-toggle hass="[[hass]]" entities="[[_config.entities]]"></hui-entities-toggle>
          </template>
        </div>
      </template>
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
      _config: Object
    };
  }

  constructor() {
    super();
    this._elements = [];
  }

  ready() {
    super.ready();
    if (this._config) this._buildConfig();
  }

  getCardSize() {
    // +1 for the header
    return 1 + (this._config ? this._config.entities.length : 0);
  }

  _showHeaderToggle(show) {
    // If show is undefined, we treat it as true
    return show !== false;
  }

  _showHeader(config) {
    // Show header if either title or toggle configured to show in it
    return config.title || config.show_header_toggle;
  }

  setConfig(config) {
    this._config = config;
    this._configEntities = processConfigEntities(config.entities);
    if (this.$) this._buildConfig();
  }

  _buildConfig() {
    const root = this.$.states;
    const entities = this._configEntities;

    while (root.lastChild) {
      root.removeChild(root.lastChild);
    }

    this._elements = [];

    for (const entity of entities) {
      const entityId = entity.entity;
      const element = createRowElement(entity);
      if (entityId && !DOMAINS_HIDE_MORE_INFO.includes(computeDomain(entityId))) {
        element.classList.add('state-card-dialog');
        element.addEventListener('click', () => this.fire('hass-more-info', { entityId }));
      }
      element.hass = this.hass;
      this._elements.push(element);
      const container = document.createElement('div');
      container.appendChild(element);
      root.appendChild(container);
    }
  }

  _hassChanged(hass) {
    this._elements.forEach((element) => {
      element.hass = hass;
    });
  }
}

customElements.define('hui-entities-card', HuiEntitiesCard);
