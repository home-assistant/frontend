import {
  html,
  LitElement,
  PropertyDeclarations,
  svg,
  PropertyValues,
} from "@polymer/lit-element";
import { TemplateResult } from "lit-html";
import { until } from "lit-html/directives/until";

import { LovelaceCard } from "../types";
import { LovelaceCardConfig } from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";
import { fireEvent } from "../../../common/dom/fire_event";

import computeStateName from "../../../common/entity/compute_state_name";
import stateIcon from "../../../common/entity/state_icon";

import "../../../components/ha-card";
import "../../../components/ha-icon";

interface Config extends LovelaceCardConfig {
  entity: string;
  name?: string;
  icon?: string;
  graph?: string;
  unit?: string;
  detail?: number;
  hours_to_show?: number;
}

class HuiSensorCard extends LitElement implements LovelaceCard {
  public hass?: HomeAssistant;
  private _config?: Config;

  static get properties(): PropertyDeclarations {
    return {
      _config: {},
    };
  }

  public setConfig(config: Config): void {
    if (!config.entity || config.entity.split(".")[0] !== "sensor") {
      throw new Error("Specify an entity from within the sensor domain.");
    }

    const cardConfig = {
      detail: 1,
      hours_to_show: 24,
      ...config,
    };

    cardConfig.hours_to_show = Number(cardConfig.hours_to_show);
    cardConfig.detail =
      cardConfig.detail === 1 || cardConfig.detail === 2
        ? cardConfig.detail
        : 1;

    this._config = cardConfig;
  }

  public getCardSize(): number {
    return 3;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (changedProps.has("_config")) {
      return true;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    if (oldHass) {
      return (
        oldHass.states[this._config!.entity] !==
        this.hass!.states[this._config!.entity]
      );
    }
    return true;
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }

    const stateObj = this.hass.states[this._config.entity];
    if (!stateObj) {
      return html``;
    }

    return html`
      ${this.renderStyle()}
      <ha-card @click="${this._handleClick}">
        <div class="flex">
          <div class="icon">
            <ha-icon
              .icon="${this._config.icon || stateIcon(stateObj)}"
            ></ha-icon>
          </div>
          <div class="header">
            <span class="name"
              >${this._config.name || computeStateName(stateObj)}</span
            >
          </div>
        </div>
        <div class="flex info">
          <span id="value">${stateObj.state}</span>
          <span id="measurement"
            >${
              this._config.unit || stateObj.attributes.unit_of_measurement
            }</span
          >
        </div>
        <div class="graph">
          <div>
            ${
              this._config.graph !== "none" &&
              stateObj.attributes.unit_of_measurement
                ? until(
                    this._getHistory().then((history) => {
                      return svg`
                        <svg width="100%" height="100%" viewBox="0 0 500 100">
                          <path
                            d="${history}"
                            fill="none"
                            stroke="var(--accent-color)"
                            stroke-width="5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                        </svg>
                      `;
                    }),
                    html``
                  )
                : ""
            }
          </div>
        </div>
      </ha-card>
    `;
  }

  private _handleClick(): void {
    if (!this._config) {
      return;
    }

    fireEvent(this, "hass-more-info", { entityId: this._config.entity });
  }

  private _coordinates(
    history: any,
    hours: number,
    width: number,
    detail: number
  ): number[][] {
    history = history.filter((item) => !Number.isNaN(Number(item.state)));
    const min = Math.min.apply(Math, history.map((item) => Number(item.state)));
    const max = Math.max.apply(Math, history.map((item) => Number(item.state)));
    const now = new Date().getTime();

    const reduce = (res, item, point = false) => {
      const age = now - new Date(item.last_changed).getTime();
      let key = Math.abs(age / (1000 * 3600) - hours);
      if (point) {
        key = (key - Math.floor(key)) * 60;
        key = Number((Math.round(key / 10) * 10).toString()[0]);
      } else {
        key = Math.floor(key);
      }
      if (!res[key]) {
        res[key] = [];
      }
      res[key].push(item);
      return res;
    };
    history = history.reduce((res, item) => reduce(res, item), []);
    if (detail > 1) {
      history = history.map((entry) =>
        entry.reduce((res, item) => reduce(res, item, true), [])
      );
    }
    return this._calcPoints(history, hours, width, detail, min, max);
  }

  private _calcPoints(
    history,
    hours,
    width: number,
    detail: number,
    min: number,
    max: number
  ): number[][] {
    const coords = [] as number[][];
    const margin = 5;
    const height = 80;
    width -= 10;
    let yRatio = (max - min) / height;
    yRatio = yRatio !== 0 ? yRatio : height;
    let xRatio = width / (hours - (detail === 1 ? 1 : 0));
    xRatio = isFinite(xRatio) ? xRatio : width;
    const getCoords = (item, i, offset = 0, depth = 1) => {
      if (depth > 1) {
        return item.forEach((subItem, index) =>
          getCoords(subItem, i, index, depth - 1)
        );
      }
      const average =
        item.reduce((sum, entry) => sum + parseFloat(entry.state), 0) /
        item.length;

      const x = xRatio * (i + offset / 6) + margin;
      const y = height - (average - min) / yRatio + margin * 2;
      return coords.push([x, y]);
    };

    history.forEach((item, i) => getCoords(item, i, 0, detail));
    if (coords.length === 1) {
      coords[1] = [width + margin, coords[0][1]];
    }
    coords.push([width + margin, coords[coords.length - 1][1]]);
    return coords;
  }

  private _getPath(coords: number[][]): string {
    let next;
    let Z;
    const X = 0;
    const Y = 1;
    let path = "";
    let last = coords.filter(Boolean)[0];

    path += `M ${last[X]},${last[Y]}`;

    for (const coord of coords) {
      next = coord;
      Z = this._midPoint(last[X], last[Y], next[X], next[Y]);
      path += ` ${Z[X]},${Z[Y]}`;
      path += ` Q${next[X]},${next[Y]}`;
      last = next;
    }

    path += ` ${next[X]},${next[Y]}`;
    return path;
  }

  private _midPoint(
    _Ax: number,
    _Ay: number,
    _Bx: number,
    _By: number
  ): number[] {
    const _Zx = (_Ax - _Bx) / 2 + _Bx;
    const _Zy = (_Ay - _By) / 2 + _By;
    return [_Zx, _Zy];
  }

  private async _getHistory(): Promise<string> {
    const endTime = new Date();
    const startTime = new Date();
    startTime.setHours(endTime.getHours() - this._config!.hours_to_show!);

    const stateHistory = await this._fetchRecent(startTime, endTime);

    if (stateHistory[0].length < 1) {
      return "";
    }
    const coords = this._coordinates(
      stateHistory[0],
      this._config!.hours_to_show!,
      500,
      this._config!.detail!
    );
    return this._getPath(coords);
  }

  private async _fetchRecent(startTime: Date, endTime: Date): Promise<{}> {
    let url = "history/period";
    if (startTime) {
      url += "/" + startTime.toISOString();
    }
    url += "?filter_entity_id=" + this._config!.entity;
    if (endTime) {
      url += "&end_time=" + endTime.toISOString();
    }

    return this.hass!.callApi("GET", url);
  }

  private renderStyle(): TemplateResult {
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

declare global {
  interface HTMLElementTagNameMap {
    "hui-sensor-card": HuiSensorCard;
  }
}

customElements.define("hui-sensor-card", HuiSensorCard);
