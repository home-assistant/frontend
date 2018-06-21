import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import './cards/hui-camera-preview-card.js';
import './cards/hui-entities-card.js';
import './cards/hui-entity-filter-card.js';
import './cards/hui-glance-card';
import './cards/hui-history-graph-card.js';
import './cards/hui-media-control-card.js';
import './cards/hui-entity-picture-card.js';
import './cards/hui-picture-glance-card';
import './cards/hui-plant-status-card.js';
import './cards/hui-weather-forecast-card';
import './cards/hui-error-card.js';

import applyThemesOnElement from '../../common/dom/apply_themes_on_element.js';
import computeCardElement from './common/compute-card-element.js';

class HUIView extends PolymerElement {
  static get template() {
    return html`
      <style>
      :host {
        display: block;
        padding: 4px 4px 0;
        transform: translateZ(0);
        position: relative;
      }

      #columns {
        display: flex;
        flex-direction: row;
        justify-content: center;
      }

      .column {
        flex-basis: 0;
        flex-grow: 1;
        max-width: 500px;
        overflow-x: hidden;
      }

      .column > * {
        display: block;
        margin: 4px 4px 8px;
      }

      @media (max-width: 500px) {
        :host {
          padding-left: 0;
          padding-right: 0;
        }

        .column > * {
          margin-left: 0;
          margin-right: 0;
        }
      }

      @media (max-width: 599px) {
        .column {
          max-width: 600px;
        }
      }
      </style>
      <div id='columns'></div>
    `;
  }
  static get properties() {
    return {
      hass: {
        type: Object,
        observer: '_hassChanged',
      },

      columns: {
        type: Number,
        observer: '_configChanged',
      },

      config: {
        type: Object,
        observer: '_configChanged',
      },
    };
  }

  constructor() {
    super();
    this._elements = [];
    this._whenDefined = {};
  }

  _getElements(cards) {
    const elements = [];

    for (let i = 0; i < cards.length; i++) {
      let error = null;
      let cardConfig = cards[i];
      let tag;
      if (!cardConfig.type) {
        error = 'Card type not configured.';
      } else {
        tag = computeCardElement(cardConfig.type);
        if (tag === null) {
          error = `Unknown card type encountered: "${cardConfig.type}".`;
        } else if (!customElements.get(tag)) {
          error = `Custom element doesn't exist: "${tag}".`;
          if (!(tag in this._whenDefined)) {
            this._whenDefined[tag] = customElements.whenDefined(tag)
              .then(() => this._configChanged());
          }
        }
      }
      if (error) {
        tag = 'hui-error-card';
        cardConfig = { error };
      }
      const element = document.createElement(tag);
      element.config = cardConfig;
      element.hass = this.hass;
      elements.push(element);
    }

    return elements;
  }

  _configChanged() {
    const root = this.$.columns;
    const config = this.config;

    while (root.lastChild) {
      root.removeChild(root.lastChild);
    }

    if (!config) {
      this._elements = [];
      return;
    }

    const elements = this._getElements(config.cards);

    let columns = [];
    const columnEntityCount = [];
    for (let i = 0; i < this.columns; i++) {
      columns.push([]);
      columnEntityCount.push(0);
    }

    // Find column with < 5 entities, else column with lowest count
    function getColumnIndex(size) {
      let minIndex = 0;
      for (let i = 0; i < columnEntityCount.length; i++) {
        if (columnEntityCount[i] < 5) {
          minIndex = i;
          break;
        }
        if (columnEntityCount[i] < columnEntityCount[minIndex]) {
          minIndex = i;
        }
      }

      columnEntityCount[minIndex] += size;

      return minIndex;
    }

    elements.forEach((el) => {
      const cardSize = typeof el.getCardSize === 'function' ? el.getCardSize() : 1;
      columns[getColumnIndex(cardSize)].push(el);
    });

    // Remove empty columns
    columns = columns.filter(val => val.length > 0);

    columns.forEach((column) => {
      const columnEl = document.createElement('div');
      columnEl.classList.add('column');
      column.forEach(el => columnEl.appendChild(el));
      root.appendChild(columnEl);
    });

    this._elements = elements;

    if ('theme' in config) {
      applyThemesOnElement(root, this.hass.themes, config.theme);
    }
  }

  _hassChanged(hass) {
    for (let i = 0; i < this._elements.length; i++) {
      this._elements[i].hass = hass;
    }
  }
}

customElements.define('hui-view', HUIView);
