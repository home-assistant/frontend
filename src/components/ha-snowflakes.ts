import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { HomeAssistant } from "../types";
import { subscribeLabFeature } from "../data/labs";
import { SubscribeMixin } from "../mixins/subscribe-mixin";

interface Snowflake {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  rotation: number;
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
      subscribeLabFeature(
        this.hass!.connection,
        "frontend",
        "winter_mode",
        (feature) => {
          this._enabled = feature.enabled;
        }
      ),
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
        rotation: Math.random() * 720 - 360, // Random starting rotation -360 to 360deg
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
            <svg
              class="snowflake ${this.narrow && flake.id >= 30
                ? "hide-narrow"
                : ""}"
              style="
                left: ${flake.left}%;
                width: ${flake.size}px;
                height: ${flake.size}px;
                animation-duration: ${flake.duration}s;
                animation-delay: ${flake.delay}s;
                --rotation: ${flake.rotation}deg;
              "
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M8.83 0v1.62l1.4-.81.8 1.38-2.2 1.27v3.15l2.73-1.57V2.5h1.6v1.61l1.4-.8.8 1.38-1.4.81 1.4.81-.8 1.39-2.2-1.28L9.63 8l2.73 1.57 2.2-1.27.8 1.39-1.4.81 1.4.81-.8 1.38-1.4-.81v1.62h-1.6v-2.54L8.83 9.39v3.15l2.2 1.27-.8 1.38-1.4-.81V16h-1.6v-1.62l-1.4.81-.8-1.38 2.2-1.28V9.39L4.5 10.96v2.54H2.9v-1.62l-1.4.81-.8-1.38 1.4-.81-1.4-.81.8-1.39 2.2 1.27L6.43 8 3.7 6.42 1.5 7.7.7 6.31l1.4-.81-1.4-.81.8-1.38 1.4.8V2.5h1.6v2.54l2.73 1.57V3.46l-2.2-1.27.8-1.38 1.4.81V0z"
                fill="currentColor"
              />
            </svg>
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
    }

    .dark .snowflake {
      color: #fff;
    }

    .snowflake.hide-narrow {
      display: none;
    }

    @keyframes fall {
      0% {
        transform: translateY(-10vh) translateX(0) rotate(var(--rotation));
      }
      25% {
        transform: translateY(30vh) translateX(10px)
          rotate(calc(var(--rotation) + 25deg));
      }
      50% {
        transform: translateY(60vh) translateX(-10px)
          rotate(calc(var(--rotation) + 50deg));
      }
      75% {
        transform: translateY(85vh) translateX(10px)
          rotate(calc(var(--rotation) + 75deg));
      }
      100% {
        transform: translateY(120vh) translateX(0)
          rotate(calc(var(--rotation) + 100deg));
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
