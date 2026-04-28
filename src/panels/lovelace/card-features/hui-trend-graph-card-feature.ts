import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { computeDomain } from "../../../common/entity/compute_domain";
import { isNumericFromAttributes } from "../../../common/number/format_number";
import "../../../components/ha-spinner";
import {
  limitedHistoryFromStateObj,
  subscribeHistoryStatesTimeWindow,
} from "../../../data/history";
import type { HomeAssistant } from "../../../types";
import { coordinatesMinimalResponseCompressedState } from "../common/graph/coordinates";
import "../components/hui-graph-base";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import type {
  TrendGraphCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

export const supportsTrendGraphCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  const domain = computeDomain(stateObj.entity_id);
  return domain === "sensor" && isNumericFromAttributes(stateObj.attributes);
};

export const DEFAULT_HOURS_TO_SHOW = 24;

@customElement("hui-trend-graph-card-feature")
class HuiHistoryChartCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false, hasChanged: () => false })
  public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: TrendGraphCardFeatureConfig;

  @state() private _coordinates?: [number, number][];

  @state() private _yAxisOrigin?: number;

  @state() private _error?: { code: string; message: string };

  private _subscribed?: Promise<UnsubscribeFunc | undefined>;

  private _interval?: number;

  static getStubConfig(): TrendGraphCardFeatureConfig {
    return {
      type: "trend-graph",
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import("../editor/config-elements/hui-trend-graph-card-feature-editor");
    return document.createElement("hui-trend-graph-card-feature-editor");
  }

  public setConfig(config: TrendGraphCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  public connectedCallback() {
    super.connectedCallback();
    // redraw the graph every minute to update the time axis
    clearInterval(this._interval);
    this._interval = window.setInterval(() => this.requestUpdate(), 1000 * 60);
    if (this.hasUpdated) {
      this._subscribeHistory();
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this._interval);
    this._unsubscribeHistory();
  }

  protected firstUpdated() {
    this._subscribeHistory();
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.context ||
      !supportsTrendGraphCardFeature(this.hass, this.context)
    ) {
      return nothing;
    }
    if (this._error) {
      return html`
        <div class="container">
          <div class="info">${this._error.message || this._error.code}</div>
        </div>
      `;
    }
    if (!this._coordinates) {
      return html`
        <div class="container loading">
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
      <hui-graph-base
        .coordinates=${this._coordinates}
        .yAxisOrigin=${this._yAxisOrigin}
      ></hui-graph-base>
    `;
  }

  private _unsubscribeHistory() {
    if (this._subscribed) {
      this._subscribed.then((unsub) => unsub?.()).catch(() => undefined);
      this._subscribed = undefined;
    }
  }

  protected updated(changedProps: PropertyValues<this>) {
    if (
      !this._subscribed &&
      !this._error &&
      this._config &&
      this.context?.entity_id &&
      changedProps.has("hass")
    ) {
      const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
      if (
        oldHass &&
        oldHass.config.components !== this.hass!.config.components
      ) {
        // Retry subscription when components become available after backend restart
        this._subscribeHistory();
      }
    }
  }

  private async _subscribeHistory() {
    if (
      !isComponentLoaded(this.hass!.config, "history") ||
      !this.context?.entity_id ||
      !this._config ||
      this._subscribed
    ) {
      return;
    }

    const hourToShow = this._config.hours_to_show ?? DEFAULT_HOURS_TO_SHOW;
    const detail = this._config.detail !== false; // default to true (high detail)

    this._subscribed = subscribeHistoryStatesTimeWindow(
      this.hass!,
      (historyStates) => {
        const entityId = this.context!.entity_id!;
        let history = historyStates[entityId];
        if (!history?.length) {
          const stateObj = this.hass!.states[entityId];
          if (stateObj) {
            history = limitedHistoryFromStateObj(stateObj);
          }
        }
        // sample to 1 point per hour for low detail or 1 point per 5 pixels for high detail
        const maxDetails = detail
          ? Math.max(10, this.clientWidth / 5, hourToShow)
          : Math.max(10, hourToShow);
        const useMean = !detail;
        const { points, yAxisOrigin } =
          coordinatesMinimalResponseCompressedState(
            history,
            this.clientWidth,
            this.clientHeight,
            maxDetails,
            undefined,
            useMean
          );
        this._coordinates = points;
        this._yAxisOrigin = yAxisOrigin;
      },
      hourToShow,
      [this.context!.entity_id!]
    ).catch((err) => {
      this._subscribed = undefined;
      this._error = err;
      return undefined;
    });
  }

  static styles = css`
    :host {
      display: flex;
      width: 100%;
      height: var(--feature-height);
      flex-direction: column;
      justify-content: flex-end;
      align-items: flex-end;
      pointer-events: none !important;
    }

    .container.loading {
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    hui-graph-base {
      width: 100%;
      --accent-color: var(--feature-color);
      border-bottom-right-radius: 8px;
      border-bottom-left-radius: 8px;
      overflow: hidden;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-trend-graph-card-feature": HuiHistoryChartCardFeature;
  }
}
