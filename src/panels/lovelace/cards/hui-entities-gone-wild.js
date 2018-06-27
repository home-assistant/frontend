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

  _configChanged(config) {
    const root = this.$.root;
    this._requiresHass = [];
    this._requiresStateObj = [];

    while (root.lastChild) {
      root.removeChild(root.lastChild);
    }

    if (config && config.image && config.entities) {
      const img = document.createElement('img');
      img.src = config.image;
      root.appendChild(img);

      config.entities.forEach((entity) => {
        let element;
        if (entity.type === 'state-badge') {
          const entityId = entity.entity_id;
          element = document.createElement('state-badge');
          element.stateObj = this.hass.states[entityId];
          element.title = this._computeTooltip(entityId, this.hass);
          if (entity.style) {
            Object.keys(entity.style).forEach((prop) => {
              element.style.setProperty(prop, entity.style[prop]);
            });
          }
          this._requiresStateObj.push({ element, entityId });
        }
        element.classList.add('entity');
        root.appendChild(element);
      });
    }
  }

  _hassChanged(hass) {
    this._requiresStateObj.forEach(entity => {
      const { element, entityId } = entity;
      element.stateObj = hass.states[entityId];
      element.title = this._computeTooltip(entityId, hass);
    });
  }

  _computeTooltip(entityId, hass) {
    return `${computeStateName(hass.states[entityId])}: ${computeStateDisplay(this.localize, hass.states[entityId])}`;
  }

  getCardSize() {
    return 5;
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
