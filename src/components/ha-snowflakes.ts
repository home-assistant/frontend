import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { HomeAssistant } from "../types";
import { subscribeLabFeatures } from "../data/labs";
import { SubscribeMixin } from "../mixins/subscribe-mixin";

interface Snowflake {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  blur: number;
}

@customElement("ha-snowflakes")
export class HaSnowflakes extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @state() private _enabled = false;

  @state() private _snowflakes: Snowflake[] = [];

  private _maxSnowflakes = 50;

  public hassSubscribe() {
    return [
      subscribeLabFeatures(this.hass!.connection, (features) => {
        this._enabled =
          features.find(
            (f) =>
              f.domain === "frontend" && f.preview_feature === "winter_mode"
          )?.enabled ?? false;
      }),
    ];
  }

  private _generateSnowflakes() {
    if (!this._enabled) {
      this._snowflakes = [];
      return;
    }

    const snowflakes: Snowflake[] = [];
    for (let i = 0; i < this._maxSnowflakes; i++) {
      snowflakes.push({
        id: i,
        left: Math.random() * 100, // Random position from 0-100%
        size: Math.random() * 12 + 8, // Random size between 8-20px
        duration: Math.random() * 8 + 8, // Random duration between 8-16s
        delay: Math.random() * 8, // Random delay between 0-8s
        blur: Math.random() * 1, // Random blur between 0-1px
      });
    }
    this._snowflakes = snowflakes;
  }

  protected willUpdate(changedProps: Map<string, unknown>) {
    super.willUpdate(changedProps);
    if (changedProps.has("_enabled")) {
      this._generateSnowflakes();
    }
  }

  protected render() {
    if (!this._enabled) {
      return nothing;
    }

    const isDark = this.hass?.themes.darkMode ?? false;

    return html`
      <div class="snowflakes ${isDark ? "dark" : "light"}" aria-hidden="true">
        ${this._snowflakes.map(
          (flake) => html`
            <div
              class="snowflake ${this.narrow && flake.id >= 30
                ? "hide-narrow"
                : ""}"
              style="
                left: ${flake.left}%;
                font-size: ${flake.size}px;
                animation-duration: ${flake.duration}s;
                animation-delay: ${flake.delay}s;
                filter: blur(${flake.blur}px);
              "
            >
              ❄
            </div>
          `
        )}
      </div>
    `;
  }

  static readonly styles = css`
    :host {
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999;
      overflow: hidden;
    }

    .snowflakes {
      position: absolute;
      top: -10%;
      left: 0;
      width: 100%;
      height: 110%;
      pointer-events: none;
    }

    .snowflake {
      position: absolute;
      top: -10%;
      opacity: 0.7;
      user-select: none;
      pointer-events: none;
      animation: fall linear infinite;
    }

    .light .snowflake {
      color: #00bcd4;
      text-shadow:
        0 0 5px #00bcd4,
        0 0 10px #00e5ff;
    }

    .dark .snowflake {
      color: #fff;
      text-shadow:
        0 0 5px rgba(255, 255, 255, 0.8),
        0 0 10px rgba(255, 255, 255, 0.5);
    }

    .snowflake.hide-narrow {
      display: none;
    }

    @keyframes fall {
      0% {
        transform: translateY(-10vh) translateX(0);
      }
      25% {
        transform: translateY(30vh) translateX(10px);
      }
      50% {
        transform: translateY(60vh) translateX(-10px);
      }
      75% {
        transform: translateY(85vh) translateX(10px);
      }
      100% {
        transform: translateY(120vh) translateX(0);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .snowflake {
        animation: none;
        display: none;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-snowflakes": HaSnowflakes;
  }
}
