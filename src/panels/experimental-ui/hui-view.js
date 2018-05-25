import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import './hui-entities-card.js';

import applyThemesOnElement from '../../common/dom/apply_themes_on_element.js';

const VALID_TYPES = ['entities', 'group'];
const CUSTOM_TYPE_PREFIX = 'custom:'

function cardElement(type) {
  if (VALID_TYPES.includes(type)) {
    return `hui-${type}-card`;
  } else if (type.startsWith(CUSTOM_TYPE_PREFIX)) {
    return type.substr(CUSTOM_TYPE_PREFIX.length);
  }
  return null;
}

class HaView extends PolymerElement {
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

  ready() {
    super.ready();
    this.innerHTML = 'Loading config';
  }

  _configChanged(config) {
    const root = this;

    while(root.lastChild) {
      root.removeChild(root.lastChild);
    }

    this._elements = [];

    for (let i = 0; i < config.cards.length; i++) {
      const cardConfig = config.cards[i];
      let tag = cardElement(cardConfig.type);
      if (!tag) {
        console.error('Unknown type encountered:', cardConfig.type);
        continue;
      }
      const element = document.createElement(tag);
      element.config = cardConfig;
      element.hass = this.hass;
      this._elements.push(element);
      root.appendChild(element);
    }

    if ('theme' in config) {
      applyThemesOnElement(this, this.hass.themes, config.theme)
    }
  }

  _hassChanged(hass) {
    for(let i = 0; i < this._elements.length; i++) {
      this._elements[i].hass = hass;
    }
  }
}

customElements.define('hui-view', HaView);
