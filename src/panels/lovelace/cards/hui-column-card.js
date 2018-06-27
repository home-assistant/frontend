import createCardElement from '../common/create-card-element.js';
import createErrorConfig from '../common/create-error-card-config.js';

class HuiColumnCard extends HTMLElement {
  constructor() {
    super();
    this._elements = [];
  }

  getCardSize() {
    let totalSize = 0;
    this._elements.forEach(element => {
      totalSize += typeof element.getCardSize === 'function' ?
        element.getCardSize() : 1;
    });
    return totalSize;
  }

  set config(config) {
    this._elements = [];
    const root = this;

    while (root.lastChild) {
      root.removeChild(root.lastChild);
    }

    if (config && config.cards && Array.isArray(config.cards)) {
      const style = document.createElement('style');
      style.innerHTML = `
        .container > * {
          margin: 4px 0 8px 0;
        }
        .container > *:first-child {
          margin-top: 0;
        }
        .container > *:last-child {
          margin-bottom: 0;
        }
      `;
      root.appendChild(style);
      const container = document.createElement('div');
      container.classList.add('container');
      root.appendChild(container);

      const elements = [];
      config.cards.forEach((card) => {
        const element = createCardElement(card);
        elements.push(element);
        container.appendChild(element);
      });
      this._elements = elements;
    } else {
      const error = 'Card config incorrect.';
      const element = createCardElement(createErrorConfig(error, config));
      root.appendChild(element);
    }
  }

  set hass(hass) {
    this._elements.forEach((element) => {
      element.hass = hass;
    });
  }
}

customElements.define('hui-column-card', HuiColumnCard);
