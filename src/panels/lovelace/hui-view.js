import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../components/entity/ha-state-label-badge.js';

import applyThemesOnElement from '../../common/dom/apply_themes_on_element.js';

import createCardElement from './common/create-card-element';

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

      #badges {
        margin: 8px 16px;
        font-size: 85%;
        text-align: center;
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
      <div id="badges"></div>
      <div id="columns"></div>
    `;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
        observer: '_hassChanged',
      },
      config: Object,
      columns: Number
    };
  }

  static get observers() {
    return [
      // Put all properties in 1 observer so we only call configChanged once
      '_createBadges(config)',
      '_createCards(config, columns)'
    ];
  }

  constructor() {
    super();
    this._cards = [];
    this._badges = [];
  }

  _createBadges(config) {
    const root = this.$.badges;
    while (root.lastChild) {
      root.removeChild(root.lastChild);
    }

    if (!config || !config.badges || !Array.isArray(config.badges)) {
      root.style.display = 'none';
      this._badges = [];
      return;
    }

    const elements = [];
    for (const entityId of config.badges) {
      if (!(entityId in this.hass.states)) continue;

      const element = document.createElement('ha-state-label-badge');
      element.state = this.hass.states[entityId];
      elements.push({ element, entityId });
      root.appendChild(element);
    }
    this._badges = elements;
    root.style.display = elements.length > 0 ? 'block' : 'none';
  }

  _createCards(config) {
    const root = this.$.columns;

    while (root.lastChild) {
      root.removeChild(root.lastChild);
    }

    if (!config || !config.cards || !Array.isArray(config.cards)) {
      this._cards = [];
      return;
    }

    const elements = config.cards.map((cardConfig) => {
      const element = createCardElement(cardConfig);
      element.hass = this.hass;
      return element;
    });

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
      // Trigger custom elements to build up DOM. This is needed for some elements
      // that use the DOM to decide their height. We don't have to clean this up
      // because a DOM element can only be in 1 position, so it will be removed from
      // 'this' and added to the correct column afterwards.
      this.appendChild(el);
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

    this._cards = elements;

    if ('theme' in config) {
      applyThemesOnElement(root, this.hass.themes, config.theme);
    }
  }

  _hassChanged(hass) {
    this._badges.forEach((badge) => {
      const { element, entityId } = badge;
      element.setProperties({
        hass,
        state: hass.states[entityId]
      });
    });
    this._cards.forEach((element) => {
      element.hass = hass;
    });
  }
}

customElements.define('hui-view', HUIView);
