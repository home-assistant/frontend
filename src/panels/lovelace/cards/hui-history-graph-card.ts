import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../components/ha-card";
import "../../../components/state-history-charts";
import "../../../data/ha-state-history-data";

import { processConfigEntities } from "../common/process-config-entities";

class HuiHistoryGraphCard extends PolymerElement {
  static async getConfigElement() {
    await import(
      /* webpackChunkName: "hui-history-graph-card-editor" */ "../editor/config-elements/hui-history-graph-card-editor"
    );
    return document.createElement("hui-history-graph-card-editor");
  }

  static getStubConfig() {
    return { entities: [] };
  }

  static get template() {
    return html`
      <style>
        .content {
          padding: 16px;
        }
        [header] .content {
          padding-top: 0;
        }
      </style>

      <ha-card header$="[[_config.title]]">
        <div class="content">
          <ha-state-history-data
            hass="[[hass]]"
            filter-type="recent-entity"
            entity-id="[[_entities]]"
            data="{{_stateHistory}}"
            is-loading="{{_stateHistoryLoading}}"
            cache-config="[[_cacheConfig]]"
          ></ha-state-history-data>
          <state-history-charts
            hass="[[hass]]"
            history-data="[[_stateHistory]]"
            is-loading-data="[[_stateHistoryLoading]]"
            names="[[_names]]"
            up-to-now
            no-single
          ></state-history-charts>
        </div>
      </ha-card>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      _config: Object,
      _names: Object,
      _entities: Array,

      _stateHistory: Object,
      _stateHistoryLoading: Boolean,
      _cacheConfig: Object,
    };
  }

  getCardSize() {
    return 4;
  }

  setConfig(config) {
    const entities = processConfigEntities(config.entities);

    this._config = config;

    const _entities = [];
    const _names = {};
    entities.forEach((entity) => {
      _entities.push(entity.entity);
      if (entity.name) {
        _names[entity.entity] = entity.name;
      }
    });

    this.setProperties({
      _cacheConfig: {
        cacheKey: _entities.join(),
        hoursToShow: config.hours_to_show || 24,
        refresh: config.refresh_interval || 0,
      },
      _entities,
      _names,
    });
  }
}

customElements.define("hui-history-graph-card", HuiHistoryGraphCard);
