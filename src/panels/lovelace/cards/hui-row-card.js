import createCardElement from '../common/create-card-element.js';
import createErrorConfig from '../common/create-error-card-config.js';

class HuiRowCard extends HTMLElement {
  constructor() {
    super();
    this._elements = [];
  }

  getCardSize() {
    let size = 1;
    this._elements.forEach(element => {
      if (typeof element.getCardSize === 'function') {
        const elSize = element.getCardSize();
        if (elSize > size) size = elSize;
      }
    });
    return size;
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
        .container {
          display: flex;
        }
        div:last-child {
          margin: 16px;
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

customElements.define('hui-row-card', HuiRowCard);
