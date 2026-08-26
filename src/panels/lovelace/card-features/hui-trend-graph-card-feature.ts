import { ResizeController } from "@lit-labs/observers/resize-controller";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { computeDomain } from "../../../common/entity/compute_domain";
import { isNumericFromAttributes } from "../../../common/number/format_number";
import {
  type EntityHistoryState,
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

const HOUR = 60 * 60 * 1000;

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

  @state() private _loading = true;

  @state() private _error?: { code: string; message: string };

  private _subscribed?: Promise<UnsubscribeFunc | undefined>;

  private _interval?: number;

  private _stateHistory?: EntityHistoryState[];

  // Recompute the graph geometry when the feature is resized or revealed
  // (e.g. by a section/card visibility condition), since the coordinates are
  // scaled to the element's pixel size and would otherwise stay collapsed to
  // the size measured while hidden.
  // @ts-ignore side-effect-only controller, its value is never read
  private _resizeController = new ResizeController(this, {
    callback: (entries) => {
      if (entries[0]?.contentRect.width) {
        this._calculateCoordinates();
      }
    },
  });

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
    // recompute the graph every minute so the x-axis (and the horizontal fill
    // to now) keeps advancing even while the sensor value stays constant
    clearInterval(this._interval);
    this._interval = window.setInterval(
      () => this._calculateCoordinates(),
      1000 * 60
    );
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
    this._calculateCoordinates();
    if (this.isConnected) {
      this._subscribeHistory();
    }
  }

  private _calculateCoordinates() {
    const entityId = this.context?.entity_id;
    if (!entityId || !this.hass) {
      return;
    }
    const width = this.clientWidth;
    const height = this.clientHeight;

    // History not loaded yet: show the loading state based on the current state.
    if (!this._stateHistory) {
      const stateObj = this.hass.states[entityId];
      if (!stateObj) {
        return;
      }
      const { points, yAxisOrigin } = coordinatesMinimalResponseCompressedState(
        limitedHistoryFromStateObj(stateObj),
        width,
        height,
        10
      );
      this._coordinates = points;
      this._yAxisOrigin = yAxisOrigin;
      return;
    }

    const hourToShow = this._config?.hours_to_show ?? DEFAULT_HOURS_TO_SHOW;
    const detail = this._config?.detail !== false; // default to true (high detail)
    // sample to 1 point per hour for low detail or 1 point per 5 pixels for high detail
    const maxDetails = detail
      ? Math.max(10, width / 5, hourToShow)
      : Math.max(10, hourToShow);
    const useMean = !detail;
    // Anchor the x-axis to the full time window so a constant value is drawn as
    // a horizontal line up to now, instead of ending at the last state change.
    const now = Date.now();
    const { points, yAxisOrigin } = coordinatesMinimalResponseCompressedState(
      this._stateHistory,
      width,
      height,
      maxDetails,
      {
        minX: now - hourToShow * HOUR,
        maxX: now,
      },
      useMean
    );
    this._coordinates = points;
    this._yAxisOrigin = yAxisOrigin;
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
    if (this._coordinates && !this._coordinates.length) {
      return html`
        <div class=${classMap({ container: true, "no-history-found": true })}>
          <div class="info">
            ${this.hass!.localize(
              "ui.components.history_charts.no_history_found"
            )}
          </div>
        </div>
      `;
    }
    return html`
      <hui-graph-base
        ?loading=${this._loading}
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
      this.isConnected &&
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
        this._stateHistory = history ?? [];
        this._loading = false;
        this._calculateCoordinates();
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

    .no-history-found {
      height: 100%;
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
