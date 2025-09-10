import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { computeDomain } from "../../../common/entity/compute_domain";
import { isNumericFromAttributes } from "../../../common/number/format_number";
import "../../../components/ha-spinner";
import { subscribeHistoryStatesTimeWindow } from "../../../data/history";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
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
  extends SubscribeMixin(LitElement)
  implements LovelaceCardFeature
{
  @property({ attribute: false, hasChanged: () => false })
  public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: TrendGraphCardFeatureConfig;

  @state() private _coordinates?: [number, number][];

  private _interval?: number;

  static getStubConfig(): TrendGraphCardFeatureConfig {
    return {
      type: "trend-graph",
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import(
      "../editor/config-elements/hui-trend-graph-card-feature-editor"
    );
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
      !supportsTrendGraphCardFeature(this.hass, this.context)
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

    const hourToShow = this._config.hours_to_show ?? DEFAULT_HOURS_TO_SHOW;

    return subscribeHistoryStatesTimeWindow(
      this.hass!,
      (historyStates) => {
        this._coordinates =
          coordinatesMinimalResponseCompressedState(
            historyStates[this.context!.entity_id!],
            hourToShow,
            500,
            2,
            undefined
          ) || [];
      },
      hourToShow,
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
