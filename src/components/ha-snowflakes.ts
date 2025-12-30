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
                d="M7.991 0a.644.644 0 0 1 .283 1.221v2.553l.986-.988a.645.645 0 0 1 .612-.839.644.644 0 1 1-.222 1.247l-1.376 1.38V7.52l1.65-.954.466-1.879a.645.645 0 0 1 .1-1.042.643.643 0 1 1 .445 1.189l-.363 1.356 3.145-1.82a.643.643 0 1 1 .282.49l-2.205 1.277 1.347.361a.643.643 0 1 1-.158.543l-1.88-.505L8.573 8l1.632.945 1.858-.535a.64.64 0 0 1 .95-.434.643.643 0 1 1-.805.98l-1.354.364L14 11.14a.641.641 0 0 1 .914.855.643.643 0 0 1-1.197-.366l-2.205-1.276.36 1.35a.642.642 0 0 1 .419.95.643.643 0 1 1-.967-.816l-.503-1.884L8.273 8.48v1.909l1.39 1.344a.644.644 0 1 1 .208 1.252.644.644 0 0 1-.606-.852l-.991-.994v3.64A.644.644 0 0 1 7.99 16a.644.644 0 0 1-.282-1.221v-2.553l-.986.988a.645.645 0 0 1-.612.839.644.644 0 1 1 .222-1.247l1.376-1.38V8.5l-1.632.945-.467 1.879q.079.068.134.163a.643.643 0 1 1-.68-.31l.364-1.357-3.145 1.82A.643.643 0 1 1 2 11.15l2.205-1.276-1.347-.361a.643.643 0 1 1 .158-.543l1.88.505L7.444 8l-1.65-.954-1.857.534a.64.64 0 0 1-.95.434.643.643 0 1 1 .805-.98l1.354-.364L2 4.85a.641.641 0 0 1-.914-.855.643.643 0 0 1 1.197.366l2.205 1.276-.36-1.35a.642.642 0 0 1-.419-.95.643.643 0 1 1 .967.816l.503 1.884L7.71 7.5V5.611L6.32 4.267a.644.644 0 1 1-.208-1.252.644.644 0 0 1 .607.852l.991.994V1.22A.644.644 0 0 1 7.991 0"
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
