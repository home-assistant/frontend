import createCardElement from '../common/create-card-element.js';
import createErrorConfig from '../common/create-error-card-config.js';

class HuiColumnCard extends HTMLElement {
  constructor() {
    super();
    this._elements = [];
  }

  getCardSize() {
    return 7;
  }

  set config(config) {
    this._elements = [];
    const root = this;

    while (root.lastChild) {
      root.removeChild(root.lastChild);
    }

    if (config && config.cards && Array.isArray(config.cards)) {
      const elements = [];
      config.cards.forEach(card => {
        const element = createCardElement(card);
        element.style.setProperty('margin', '4px');
        elements.push(element);
        root.appendChild(element);
      });
      elements[0].style.marginTop = '0';
      elements[(elements.length - 1)].style.marginBottom = '0';
      this._elements = elements;

    } else {
      const error = 'Card config incorrect.';
      const element = createCardElement(createErrorConfig(error, config));
      root.appendChild(element);
    }
  }

  set hass(hass) {
    this._elements.forEach(element => {
      element.hass = hass;
    });
  }
}

customElements.define('hui-column-card', HuiColumnCard);
