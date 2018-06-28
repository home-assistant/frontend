import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import './hui-error-card.js';
import '../../../components/state-history-charts.js';
import '../../../data/ha-state-history-data.js';

class HuiHistoryGraphCard extends PolymerElement {
  static get properties() {
    return {
      hass: Object,
      config: {
        type: Object,
        observer: '_configChanged',
      },
      _error: Object,

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

  static get template() {
    return html`
      <style>
        ha-card {
          padding: 16px;
        }
      </style>

      <template is="dom-if" if="[[!_error]]">
        <ha-card header=[[config.title]]>
          <ha-state-history-data
            hass="[[hass]]"
            filter-type="recent-entity"
            entity-id="[[config.entities]]"
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
      </template>

      <template is="dom-if" if="[[_error]]">
        <hui-error-card config="[[_error]]"></hui-error-card>
      </template>
    `;
  }

  _configChanged(config) {
    if (config.entities && Array.isArray(config.entities)) {
      this._error = null;

      this.cacheConfig = {
        cacheKey: config.entities,
        hoursToShow: config.hours_to_show || 24,
        refresh: config.refresh_interval || 0
      };
    } else {
      this._error = {
        error: 'No entities configured.',
        origConfig: config
      };
    }
  }
}

customElements.define('hui-history-graph-card', HuiHistoryGraphCard);
