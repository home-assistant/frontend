import { css, html, LitElement, nothing } from "lit";
import "../../../components/ha-spinner";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { subscribeHistoryStatesTimeWindow } from "../../../data/history";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature } from "../types";
import type {
  LovelaceCardFeatureContext,
  HistoryChartCardFeatureConfig,
} from "./types";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { coordinatesMinimalResponseCompressedState } from "../common/graph/coordinates";
import "../components/hui-graph-base";
import { isNumericFromAttributes } from "../../../common/number/format_number";

export const supportsHistoryChartCardFeature = (
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

@customElement("hui-history-chart-card-feature")
class HuiHistoryChartCardFeature
  extends SubscribeMixin(LitElement)
  implements LovelaceCardFeature
{
  @property({ attribute: false, hasChanged: () => false })
  public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: HistoryChartCardFeatureConfig;

  @state() private _coordinates?: number[][];

  private _interval?: number;

  static getStubConfig(): HistoryChartCardFeatureConfig {
    return {
      type: "history-chart",
      hours_to_show: 24,
    };
  }

  public setConfig(config: HistoryChartCardFeatureConfig): void {
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
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this._interval);
  }

  protected hassSubscribe() {
    return [this._subscribeHistory()];
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.context ||
      !supportsHistoryChartCardFeature(this.hass, this.context)
    ) {
      return nothing;
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

  private async _subscribeHistory(): Promise<() => Promise<void>> {
    if (
      !isComponentLoaded(this.hass!, "history") ||
      !this.context?.entity_id ||
      !this._config
    ) {
      return () => Promise.resolve();
    }
    return subscribeHistoryStatesTimeWindow(
      this.hass!,
      (historyStates) => {
        this._coordinates =
          coordinatesMinimalResponseCompressedState(
            historyStates[this.context!.entity_id!],
            this._config!.hours_to_show ?? 24,
            500,
            2,
            undefined
          ) || [];
      },
      this._config!.hours_to_show ?? 24,
      [this.context!.entity_id!]
    );
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
    hui-graph-base {
      width: 100%;
      --accent-color: var(--feature-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-history-chart-card-feature": HuiHistoryChartCardFeature;
  }
}
