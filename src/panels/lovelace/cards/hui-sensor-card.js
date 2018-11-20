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
      _min: Number,
      _max: Number,
    };
  }

  setConfig(config) {
    if (!config.entity || config.entity.split(".")[0] !== "sensor") {
      throw new Error("Specify an entity from within the sensor domain.");
    }

    const cardConfig = {
      detail: 1,
      icon: false,
      height: 100,
      hours_to_show: 24,
      line_color: "var(--accent-color)",
      line_width: 5,
      ...config,
    };
    cardConfig.hours_to_show = Number(cardConfig.hours_to_show);
    cardConfig.height = Number(cardConfig.height);
    cardConfig.line_width = Number(cardConfig.line_width);
    cardConfig.detail =
      cardConfig.detail === 1 || cardConfig.detail === 2
        ? cardConfig.detail
        : 1;

    this._config = cardConfig;
  }

  shouldUpdate(changedProps) {
    const change = changedProps.has("_entity") || changedProps.has("_line");
    return change;
  }

  render({ _config, _entity, _line } = this) {
    return html`
      ${this._style()}
      <ha-card @click="${this._handleClick}">
        <div class="flex">
          <div class="icon">
            <ha-icon .icon="${this._computeIcon(_entity)}"></ha-icon>
          </div>
          <div class="header">
            <span class="name">${this._computeName(_entity)}</span>
          </div>
        </div>
        <div class="flex info">
          <span id="value">${_entity.state}</span>
          <span id="measurement">${this._computeUom(_entity)}</span>
        </div>
        <div class="graph">
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
      </ha-card>
    `;
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

  _coordinates(history, hours, width, detail = 1) {
    history = history.filter((item) => !Number.isNaN(Number(item.state)));
    this._min = Math.min.apply(Math, history.map((item) => Number(item.state)));
    this._max = Math.max.apply(Math, history.map((item) => Number(item.state)));
    const now = new Date().getTime();

    const reduce = (res, item, min = false) => {
      const age = now - new Date(item.last_changed).getTime();
      let key = Math.abs(age / (1000 * 3600) - hours);
      if (min) {
        key = (key - Math.floor(key)) * 60;
        key = (Math.round(key / 10) * 10).toString()[0];
      } else {
        key = Math.floor(key);
      }
      if (!res[key]) res[key] = [];
      res[key].push(item);
      return res;
    };
    history = history.reduce((res, item) => reduce(res, item), []);
    if (detail > 1) {
      history = history.map((entry) =>
        entry.reduce((res, item) => reduce(res, item, true), [])
      );
    }
    return this._calcPoints(history, hours, width, detail);
  }

  _calcPoints(history, hours, width, detail = 1) {
    const coords = [];
    const margin = this._config.line_width;
    const height = this._config.height - margin * 4;
    width -= margin * 2;
    let yRatio = (this._max - this._min) / height;
    yRatio = yRatio !== 0 ? yRatio : height;
    let xRatio = width / (hours - (detail === 1 ? 1 : 0));
    xRatio = isFinite(xRatio) ? xRatio : width;
    const getCoords = (item, i, offset = 0, depth = 1) => {
      if (depth > 1)
        return item.forEach((subItem, index) =>
          getCoords(subItem, i, index, depth - 1)
        );
      const average =
        item.reduce((sum, entry) => sum + parseFloat(entry.state), 0) /
        item.length;

      const x = xRatio * (i + offset / 6) + margin;
      const y = height - (average - this._min) / yRatio + margin * 2;
      return coords.push([x, y]);
    };

    history.forEach((item, i) => getCoords(item, i, 0, detail));
    if (coords.length === 1) coords[1] = [width + margin, coords[0][1]];
    coords.push([width + margin, coords[coords.length - 1][1]]);
    return coords;
  }

  _getPath(coords) {
    let next;
    let Z;
    const X = 0;
    const Y = 1;
    let path = "";
    let last = coords.filter(Boolean)[0];

    path += `M ${last[X]},${last[Y]}`;

    for (let i = 0; i < coords.length; i++) {
      next = coords[i];
      Z = this._midPoint(last[X], last[Y], next[X], next[Y]);
      path += ` ${Z[X]},${Z[Y]}`;
      path += ` Q${next[X]},${next[Y]}`;
      last = next;
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

    if (stateHistory[0].length < 1) return;
    const coords = this._coordinates(
      stateHistory[0],
      this._config.hours_to_show,
      500,
      this._config.detail
    );
    this._line = this._getPath(coords);
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
          opacity: 0.8;
          position: relative;
        }
        .name {
          display: block;
          display: -webkit-box;
          font-size: 1.2rem;
          font-weight: 500;
          max-height: 1.4rem;
          margin-top: 2px;
          opacity: 0.8;
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
          margin-top: 0.1em;
          opacity: 0.6;
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
      </style>
    `;
  }
}

customElements.define("hui-sensor-card", HuiSensorCard);
