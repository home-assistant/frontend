import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import durationToSeconds from "../../../common/datetime/duration_to_seconds";
import { consumeEntityState } from "../../../common/decorators/consume-context-entry";
import { computeDomain } from "../../../common/entity/compute_domain";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  LovelaceCardFeatureContext,
  TimerProgressCardFeatureConfig,
} from "./types";
import { TimerRemainingTimeController } from "../../../common/controllers/timer-remaining-time-controller";

export const supportsTimerProgressCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  return !!stateObj && computeDomain(stateObj.entity_id) === "timer";
};

@customElement("hui-timer-progress-card-feature")
class HuiTimerProgressCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state()
  @consumeEntityState({ entityIdPath: ["context", "entity_id"] })
  private _stateObj?: HassEntity;

  @state() private _config?: TimerProgressCardFeatureConfig;
  private _timeRemaining = new TimerRemainingTimeController(this);
  private _prevRatio = 0;
  private _animate = false;

  static getStubConfig(): TimerProgressCardFeatureConfig {
    return { type: "timer-progress" };
  }

  public setConfig(config: TimerProgressCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected update(changedProps: PropertyValues): void {
    if (changedProps.has("_stateObj")) {
      this._timeRemaining.setStateObj(this._stateObj);
    }
    if (this._stateObj) {
      const ratio = this._ratio(this._stateObj);
      this._animate =
        this._stateObj.state === "active" && ratio <= this._prevRatio;
      this._prevRatio = ratio;
    }
    super.update(changedProps);
  }

  private _ratio(stateObj: HassEntity, offset = 0): number {
    const { duration } = stateObj.attributes;
    const total =
      typeof duration === "string" ? durationToSeconds(duration) : 0;
    if (!total || stateObj.state === "idle") {
      return 0;
    }
    const left = (this._timeRemaining.timeRemaining ?? 0) - offset;
    return Math.min(Math.max(left / total, 0), 1);
  }

  protected render() {
    if (
      !this._config ||
      !this.context ||
      !this._stateObj ||
      computeDomain(this._stateObj.entity_id) !== "timer"
    ) {
      return nothing;
    }
    const stateObj = this._stateObj;
    const ratio = this._ratio(stateObj);
    const target = this._animate ? this._ratio(stateObj, 1) : ratio;
    return html`
      <div
        class="track"
        role="progressbar"
        aria-label=${stateObj.attributes.friendly_name || stateObj.entity_id}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow=${Math.round(ratio * 100)}
      >
        <div
          class="bar"
          style=${styleMap({
            transform: `scaleX(${target})`,
            transition: this._animate ? "transform 1s linear" : "none",
          })}
        ></div>
      </div>
    `;
  }

  static styles = [
    cardFeatureStyles,
    css`
      :host {
        pointer-events: none !important;
      }
      @media (prefers-reduced-motion: reduce) {
        .bar {
          transition: none !important;
        }
      }
      .track {
        height: var(--feature-height);
        border-radius: var(--feature-border-radius);
        background: color-mix(in srgb, var(--feature-color) 20%, transparent);
        overflow: hidden;
      }
      .bar {
        height: 100%;
        width: 100%;
        transform-origin: var(--float-start, left);
        background: var(--feature-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-timer-progress-card-feature": HuiTimerProgressCardFeature;
  }
}
