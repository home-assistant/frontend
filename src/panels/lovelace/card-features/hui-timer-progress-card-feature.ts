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

  @state() private _ratio = 0;

  private _raf?: number;

  static getStubConfig(): TimerProgressCardFeatureConfig {
    return { type: "timer-progress" };
  }

  public setConfig(config: TimerProgressCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._stop();
  }

  protected willUpdate(changedProps: PropertyValues): void {
    if (changedProps.has("_stateObj")) {
      this._stop();
      this._tick();
    }
  }

  private _stop() {
    if (this._raf !== undefined) {
      cancelAnimationFrame(this._raf);
      this._raf = undefined;
    }
  }

  private _tick = () => {
    const stateObj = this._stateObj;
    if (!stateObj) {
      return;
    }
    const duration = durationToSeconds(stateObj.attributes.duration);
    let remaining = 0;
    if (stateObj.state === "active") {
      remaining =
        (new Date(stateObj.attributes.finishes_at).getTime() - Date.now()) /
        1000;
    } else if (stateObj.state === "paused") {
      remaining = durationToSeconds(stateObj.attributes.remaining);
    }
    this._ratio = duration ? Math.min(Math.max(remaining / duration, 0), 1) : 0;
    if (stateObj.state === "active" && this.isConnected) {
      this._raf = requestAnimationFrame(this._tick);
    }
  };

  protected render() {
    if (
      !this._config ||
      !this.context ||
      !this._stateObj ||
      computeDomain(this._stateObj.entity_id) !== "timer"
    ) {
      return nothing;
    }
    return html`
      <div class="track">
        <div
          class="bar"
          style=${styleMap({ width: `${this._ratio * 100}%` })}
        ></div>
      </div>
    `;
  }

  static styles = [
    cardFeatureStyles,
    css`
      .track {
        height: var(--feature-height, 42px);
        border-radius: var(--feature-border-radius, 12px);
        background: color-mix(
          in srgb,
          var(--tile-color, var(--primary-color)) 20%,
          transparent
        );
        overflow: hidden;
      }
      .bar {
        height: 100%;
        background: var(--tile-color, var(--primary-color));
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-timer-progress-card-feature": HuiTimerProgressCardFeature;
  }
}
