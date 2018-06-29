import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../components/ha-card.js';
import '../../../components/state-history-charts.js';
import '../../../data/ha-state-history-data.js';

class HuiHistoryGraphCard extends PolymerElement {
  static get template() {
    return html`
      <style>
        ha-card {
          padding: 16px;
        }
      </style>

      <ha-card header=[[_config.title]]>
        <ha-state-history-data
          hass="[[hass]]"
          filter-type="recent-entity"
          entity-id="[[_config.entities]]"
          data="{{stateHistory}}"
          is-loading="{{stateHistoryLoading}}"
          cache-config="[[cacheConfig]]"
        ></ha-state-history-data>
        <state-history-charts
          hass="[[hass]]"
          history-data="[[stateHistory]]"
          is-loading-data="[[stateHistoryLoading]]"
          up-to-now
          no-single
        ></state-history-charts>
      </ha-card>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      _config: Object,
      stateHistory: Object,
      stateHistoryLoading: Boolean,
      cacheConfig: {
        type: Object,
        value: {
          refresh: 0,
          cacheKey: null,
          hoursToShow: 24,
        },
      },
    };
  }

  getCardSize() {
    return 4;
  }

  setConfig(config) {
    if (!config.entities || !Array.isArray(config.entities)) {
      throw new Error('Error in card configuration.');
    }

    this.cacheConfig = {
      cacheKey: config.entities,
      hoursToShow: config.hours_to_show || 24,
      refresh: config.refresh_interval || 0
    };

    this._config = config;
  }
}

customElements.define('hui-history-graph-card', HuiHistoryGraphCard);
