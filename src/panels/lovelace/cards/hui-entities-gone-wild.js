import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../components/entity/state-badge.js';
import '../../../components/ha-card.js';

import computeStateDisplay from '../../../common/entity/compute_state_display.js';
import computeStateName from '../../../common/entity/compute_state_name.js';

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
      #root {
        position: relative;
      }
      #root img {
        width: 100%;
      }
      #root .entity {
        white-space: nowrap;
        position: absolute;
        transform: translate(-50%, -50%);
      }
      #root .clickable {
        cursor: pointer;
        padding: 4px;
      }
    </style>

    <ha-card>
      <div class='header'>
        <div class="name">[[config.title]]</div>
      </div>
      <div id="root"></div>
    </ha-card>
`;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
        observer: '_hassChanged'
      },
      config: {
        type: Object,
        observer: '_configChanged'
      }
    };
  }

  getCardSize() {
    return 4;
  }

  _configChanged(config) {
    const root = this.$.root;
    this._requiresStateObj = [];

    while (root.lastChild) {
      root.removeChild(root.lastChild);
    }

    if (config && config.image && config.elements) {
      const img = document.createElement('img');
      img.src = config.image;
      root.appendChild(img);

      config.elements.forEach((element) => {
        let el;
        if (element.type === 'state-badge') {
          const entityId = element.entity;
          el = document.createElement('state-badge');
          el.stateObj = this.hass.states[entityId];
          el.addEventListener('click', () => this._openDialog(entityId));
          el.classList.add('clickable');
          el.title = this._computeTooltip(entityId, this.hass);
          if (element.style) {
            Object.keys(element.style).forEach((prop) => {
              el.style.setProperty(prop, element.style[prop]);
            });
          }
          this._requiresStateObj.push({ el, entityId });
        }
        el.classList.add('entity');
        root.appendChild(el);
      });
    }
  }

  _hassChanged(hass) {
    this._requiresStateObj.forEach((element) => {
      const { el, entityId } = element;
      el.stateObj = hass.states[entityId];
      el.title = this._computeTooltip(entityId, hass);
    });
  }

  _computeTooltip(entityId, hass) {
    return `${computeStateName(hass.states[entityId])}: ${computeStateDisplay(this.localize, hass.states[entityId])}`;
  }

  _openDialog(entityId) {
    this.fire('hass-more-info', { entityId });
  }
}

customElements.define('hui-entities-gone-wild-card', HuiEntitiesGoneWildCard);
