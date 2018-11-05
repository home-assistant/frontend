import { LitElement, html, svg } from "@polymer/lit-element";

import "../../../components/ha-card";
import "../../../components/ha-icon";

import computeStateName from "../../../common/entity/compute_state_name";
import stateIcon from "../../../common/entity/state_icon";

import EventsMixin from "../../../mixins/events-mixin";

class HuiSensorCard extends EventsMixin(LitElement) {
  set hass(hass) {
    this._hass = hass;
    const entity = hass.states[this._config.entity];
    if (entity && this._entity !== entity) {
      this._entity = entity;
      if (
        this._config.graph !== "none" &&
        entity.attributes.unit_of_measurement
      ) {
        this._getHistory();
      }
    }
  }

  static get properties() {
    return {
      _hass: {},
      _config: {},
      _entity: {},
      _line: String,
    };
  }

  setConfig(config) {
    if (!config.entity || config.entity.split(".")[0] !== "sensor") {
      throw new Error("Specify an entity from within the sensor domain.");
    }

    const cardConfig = {
      icon: false,
      hours_to_show: 24,
      accuracy: 10,
      height: 100,
      line_width: 5,
      line_color: "var(--accent-color)",
      ...config,
    };
    cardConfig.hours_to_show = Number(cardConfig.hours_to_show);
    cardConfig.accuracy = Number(cardConfig.accuracy);
    cardConfig.height = Number(cardConfig.height);
    cardConfig.line_width = Number(cardConfig.line_width);

    this._config = cardConfig;
  }

  shouldUpdate(changedProps) {
    const change = changedProps.has("_entity") || changedProps.has("_line");
    return change;
  }

  render({ _config, _entity, _line } = this) {
    return html`
      ${this._style()}
      <ha-card @click=${this._handleClick}>
        <div class='flex'>
          <div class='icon'>
            <ha-icon .icon=${this._computeIcon(_entity)}></ha-icon>
          </div>
          <div class='header'>
            <span class='name'>${this._computeName(_entity)}</span>
          </div>
        </div>
        <div class='flex info'>
          <span id='value'>${_entity.state}</span>
          <span id='measurement'>${this._computeUom(_entity)}</span>
        </div>
        <div class='graph'>
          <div>
            ${
              _line
                ? svg`
            <svg width='100%' height='100%' viewBox='0 0 500 ${_config.height}'>
              <path d=${_line} fill='none' stroke=${_config.line_color}
                stroke-width=${_config.line_width}
                stroke-linecap='round' stroke-linejoin='round' />
            </svg>`
                : ""
            }
          </div>
        </div>
      </ha-card>`;
  }

  _handleClick() {
    this.fire("hass-more-info", { entityId: this._config.entity });
  }

  _computeIcon(item) {
    return this._config.icon || stateIcon(item);
  }

  _computeName(item) {
    return this._config.name || computeStateName(item);
  }

  _computeUom(item) {
    return this._config.unit || item.attributes.unit_of_measurement;
  }

  _getGraph(items, width, height) {
    const values = this._getValueArr(items);
    const coords = this._calcCoordinates(values, width, height);
    return this._getPath(coords);
  }

  _getValueArr(items) {
    return items.map((item) => Number(item.state) || 0);
  }

  _calcCoordinates(values, width, height) {
    const margin = this._config.line_width;
    width -= margin * 2;
    height -= margin * 2;
    const min = Math.floor(Math.min.apply(null, values) * 0.95);
    const max = Math.ceil(Math.max.apply(null, values) * 1.05);

    if (values.length === 1) values.push(values[0]);

    const yRatio = (max - min) / height;
    const xRatio = width / (values.length - 1);

    return values.map((value, i) => {
      const y = height - (value - min) / yRatio || 0;
      const x = xRatio * i + margin;
      return [x, y];
    });
  }

  _getPath(points) {
    let next;
    let Z;
    const X = 0;
    const Y = 1;
    let path = "";
    let point = points[0];

    path += `M ${point[X]},${point[Y]}`;

    for (let i = 0; i < points.length; i++) {
      next = points[i];
      Z = this._midPoint(point[X], point[Y], next[X], next[Y]);
      path += ` ${Z[X]},${Z[Y]}`;
      path += ` Q${next[X]},${next[Y]}`;
      point = next;
    }

    path += ` ${next[X]},${next[Y]}`;
    return path;
  }

  _midPoint(Ax, Ay, Bx, By) {
    const Zx = (Ax - Bx) / 2 + Bx;
    const Zy = (Ay - By) / 2 + By;
    return [Zx, Zy];
  }

  async _getHistory() {
    const endTime = new Date();
    const startTime = new Date();
    startTime.setHours(endTime.getHours() - this._config.hours_to_show);
    const stateHistory = await this._fetchRecent(
      this._config.entity,
      startTime,
      endTime
    );
    const history = stateHistory[0];
    const valArray = [history[history.length - 1]];

    let pos = history.length - 1;
    const accuracy = this._config.accuracy <= pos ? this._config.accuracy : pos;
    let increment = Math.ceil(history.length / accuracy);
    increment = increment <= 0 ? 1 : increment;
    for (let i = accuracy; i >= 2; i--) {
      pos -= increment;
      valArray.unshift(pos >= 0 ? history[pos] : history[0]);
    }
    this._line = this._getGraph(valArray, 500, this._config.height);
  }

  async _fetchRecent(entityId, startTime, endTime) {
    let url = "history/period";
    if (startTime) url += "/" + startTime.toISOString();
    url += "?filter_entity_id=" + entityId;
    if (endTime) url += "&end_time=" + endTime.toISOString();

    return await this._hass.callApi("GET", url);
  }

  getCardSize() {
    return 3;
  }

  _style() {
    return html`
      <style>
        :host {
          display: flex;
          flex-direction: column;
        }
        ha-card {
          display: flex;
          flex-direction: column;
          flex: 1;
          padding: 16px;
          position: relative;
          cursor: pointer;
        }
        .flex {
          display: flex;
        }
        .header {
          align-items: center;
          display: flex;
          min-width: 0;
          opacity: .8;
          position: relative;
        }
        .name {
          display: block;
          display: -webkit-box;
          font-size: 1.2rem;
          font-weight: 500;
          max-height: 1.4rem;
          margin-top: 2px;
          opacity: .8;
          overflow: hidden;
          text-overflow: ellipsis;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          word-wrap: break-word;
          word-break: break-all;
        }
        .icon {
          color: var(--paper-item-icon-color, #44739e);
          display: inline-block;
          flex: 0 0 40px;
          line-height: 40px;
          position: relative;
          text-align: center;
          width: 40px;
        }
        .info {
          flex-wrap: wrap;
          margin: 16px 0 16px 8px;
        }
        #value {
          display: inline-block;
          font-size: 2rem;
          font-weight: 400;
          line-height: 1em;
          margin-right: 4px;
        }
        #measurement {
          align-self: flex-end;
          display: inline-block;
          font-size: 1.3rem;
          line-height: 1.2em;
          margin-top: .1em;
          opacity: .6;
          vertical-align: bottom;
        }
        .graph {
          align-self: flex-end;
          margin: auto;
          margin-bottom: 0px;
          position: relative;
          width: 100%;
        }
        .graph > div {
          align-self: flex-end;
          margin: auto 8px;
        }
      </style>`;
  }
}

customElements.define("hui-sensor-card", HuiSensorCard);
