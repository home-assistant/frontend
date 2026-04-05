import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeDomain } from "../../../common/entity/compute_domain";
import "../../../components/ha-spinner";
import type { HistoryStates } from "../../../data/history";
import {
  limitedHistoryFromStateObj,
  subscribeHistoryStatesTimeWindow,
} from "../../../data/history";
import type { HomeAssistant } from "../../../types";
import { findEntities } from "../common/find-entities";
import { coordinatesMinimalResponseCompressedState } from "../common/graph/coordinates";
import "../components/hui-graph-base";
import type {
  LovelaceHeaderFooter,
  LovelaceHeaderFooterEditor,
} from "../types";
import type { GraphHeaderFooterConfig } from "./types";

const MINUTE = 60000;
const HOUR = 60 * MINUTE;
const includeDomains = ["counter", "input_number", "number", "sensor"];

@customElement("hui-graph-header-footer")
export class HuiGraphHeaderFooter
  extends LitElement
  implements LovelaceHeaderFooter
{
  public static async getConfigElement(): Promise<LovelaceHeaderFooterEditor> {
    await import("../editor/config-elements/hui-graph-footer-editor");
    return document.createElement("hui-graph-footer-editor");
  }

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ): GraphHeaderFooterConfig {
    const maxEntities = 1;
    const entityFilter = (stateObj: HassEntity): boolean =>
      !isNaN(Number(stateObj.state)) &&
      !!stateObj.attributes.unit_of_measurement;

    const foundEntities = findEntities(
      hass,
      maxEntities,
      entities,
      entitiesFallback,
      includeDomains,
      entityFilter
    );

    return {
      type: "graph",
      entity: foundEntities[0] || "",
    };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public type!: "header" | "footer";

  @state() protected _config?: GraphHeaderFooterConfig;

  @state() private _coordinates?: [number, number][];

  private _error?: string;

  private _history?: HistoryStates;

  private _interval?: number;

  private _subscribed?: Promise<(() => Promise<void>) | undefined>;

  public getCardSize(): number {
    return 3;
  }

  public setConfig(config: GraphHeaderFooterConfig): void {
    if (
      !config?.entity ||
      !includeDomains.includes(computeDomain(config.entity))
    ) {
      throw new Error("Specify an entity from within the sensor domain");
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

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }

    if (this._error) {
      return html`<div class="errors">${this._error}</div>`;
    }

    if (!this._coordinates) {
      return html`
        <div class="container">
          <ha-spinner size="small"></ha-spinner>
        </div>
      `;
    }

    if (!this._coordinates.length) {
      return html`
        <div class="container">
          <div class="info">No state history found.</div>
        </div>
      `;
    }

    return html`
      <hui-graph-base .coordinates=${this._coordinates}></hui-graph-base>
    `;
  }

  private _handleClick(): void {
    fireEvent(this, "hass-more-info", {
      entityId: this._config?.entity ?? null,
    });
  }

  public connectedCallback() {
    super.connectedCallback();
    this.addEventListener("click", this._handleClick);
    if (this.hasUpdated && this._config) {
      this._subscribeHistory();
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribeHistory();
  }

  private _subscribeHistory() {
    if (
      !isComponentLoaded(this.hass!.config, "history") ||
      this._subscribed ||
      !this._config
    ) {
      return;
    }
    this._subscribed = subscribeHistoryStatesTimeWindow(
      this.hass!,
      (combinedHistory) => {
        if (!this._subscribed || !this._config) {
          // Message came in before we had a chance to unload
          return;
        }
        this._history = combinedHistory;
        if (!this._history[this._config.entity]?.length) {
          const stateObj = this.hass!.states[this._config.entity];
          if (stateObj) {
            this._history[this._config.entity] =
              limitedHistoryFromStateObj(stateObj);
          }
        }
        this._computeCoordinates();
      },
      this._config.hours_to_show!,
      [this._config.entity]
    ).catch((err) => {
      this._subscribed = undefined;
      this._error = err;
      return undefined;
    });
    this._setRedrawTimer();
  }

  private _computeCoordinates() {
    if (!this._history || !this._config) {
      return;
    }
    const entityHistory = this._history[this._config.entity];
    if (!entityHistory?.length) {
      return;
    }
    const width = this.clientWidth || this.offsetWidth;
    // sample to 1 point per hour or 1 point per 5 pixels
    const maxDetails = Math.max(
      10,
      this._config.detail! > 1
        ? Math.max(width / 5, this._config.hours_to_show!)
        : this._config.hours_to_show!
    );
    const now = Date.now();
    const useMean = this._config.detail !== 2;
    const { points } = coordinatesMinimalResponseCompressedState(
      entityHistory,
      width,
      width / 5,
      maxDetails,
      {
        minX: now - this._config.hours_to_show! * HOUR,
        maxX: now,
        minY: this._config.limits?.min,
        maxY: this._config.limits?.max,
      },
      useMean
    );
    this._coordinates = points;
  }

  private _redrawGraph() {
    if (!this._history || !this._config?.hours_to_show) {
      return;
    }
    const entityId = this._config.entity;
    const entityHistory = this._history[entityId];
    if (entityHistory?.length) {
      const purgeBeforeTimestamp =
        (Date.now() - this._config.hours_to_show * 60 * 60 * 1000) / 1000;
      let purgedHistory = entityHistory.filter(
        (entry) => entry.lu >= purgeBeforeTimestamp
      );
      if (purgedHistory.length !== entityHistory.length) {
        if (
          !purgedHistory.length ||
          purgedHistory[0].lu !== purgeBeforeTimestamp
        ) {
          // Preserve the last expired state as the start boundary
          const lastExpiredState = {
            ...entityHistory[entityHistory.length - purgedHistory.length - 1],
          };
          lastExpiredState.lu = purgeBeforeTimestamp;
          delete lastExpiredState.lc;
          purgedHistory = [lastExpiredState, ...purgedHistory];
        }
        this._history = { ...this._history, [entityId]: purgedHistory };
      }
    }
    this._computeCoordinates();
  }

  private _setRedrawTimer() {
    // redraw the graph every minute to update the time axis
    clearInterval(this._interval);
    this._interval = window.setInterval(
      () => this._redrawGraph(),
      this._config!.hours_to_show! > 24 ? HOUR : MINUTE
    );
  }

  private _unsubscribeHistory() {
    clearInterval(this._interval);
    if (this._subscribed) {
      this._subscribed.then((unsub) => unsub?.());
      this._subscribed = undefined;
    }
    this._history = undefined;
  }

  protected updated(changedProps: PropertyValues) {
    if (!this._config || !this.hass || !changedProps.has("_config")) {
      return;
    }

    const oldConfig = changedProps.get("_config") as GraphHeaderFooterConfig;
    if (
      !oldConfig ||
      !this._subscribed ||
      oldConfig.entity !== this._config.entity
    ) {
      this._unsubscribeHistory();
      this._subscribeHistory();
    }
  }

  static styles = css`
    :host {
      display: block;
      cursor: pointer;
    }
    ha-spinner {
      position: absolute;
      top: calc(50% - 14px);
    }
    .container {
      display: flex;
      justify-content: center;
      position: relative;
      padding-bottom: 20%;
    }
    .info {
      position: absolute;
      top: calc(50% - 16px);
      color: var(--secondary-text-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-graph-header-footer": HuiGraphHeaderFooter;
  }
}
