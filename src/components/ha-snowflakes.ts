import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import { storage } from "../common/decorators/storage";
import type { HomeAssistant } from "../types";
import { subscribeFrontendSystemData } from "../data/frontend";
import { subscribeLabFeatures } from "../data/labs";
import type { LabPreviewFeature } from "../data/labs";
import { SubscribeMixin } from "../mixins/subscribe-mixin";

interface Snowflake {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  blur: number;
}

type WinterModePreference = "auto" | "always" | "never";

@customElement("ha-snowflakes")
export class HaSnowflakes extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @storage({ key: "winter-mode-preference", state: true, subscribe: true })
  @state()
  private _preference: WinterModePreference = "auto";

  @state() private _systemEnabled = false;

  @state() private _labFeatures: LabPreviewFeature[] = [];

  @state() private _snowflakes: Snowflake[] = [];

  private _maxSnowflakes = 50;

  private _unsub?: Promise<UnsubscribeFunc>;

  public hassSubscribe() {
    return [
      subscribeLabFeatures(this.hass!.connection, (features) => {
        this._labFeatures = features;
      }),
    ];
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.hass) {
      this._unsub = subscribeFrontendSystemData(
        this.hass.connection,
        "winter_mode",
        ({ value }) => {
          this._systemEnabled = value?.enabled ?? false;
        }
      );
    }
  }

  async disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsub) {
      (await this._unsub)();
    }
  }

  private _isWinterModeLabEnabled(): boolean {
    return (
      this._labFeatures.find(
        (f) => f.domain === "frontend" && f.preview_feature === "winter_mode"
      )?.enabled ?? false
    );
  }

  private _shouldShowSnowflakes(): boolean {
    // First check if lab feature is enabled
    if (!this._isWinterModeLabEnabled()) {
      return false;
    }

    // Then check user preference
    if (this._preference === "always") {
      return true;
    }
    if (this._preference === "never") {
      return false;
    }
    // "auto" - follow system setting
    return this._systemEnabled;
  }

  private _generateSnowflakes() {
    if (!this._shouldShowSnowflakes()) {
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

    // Only regenerate if the visibility state actually changes
    if (
      changedProps.has("_preference") ||
      changedProps.has("_systemEnabled") ||
      changedProps.has("_labFeatures")
    ) {
      // Check if we were showing before
      const wasShowing = this._snowflakes.length > 0;
      const shouldShow = this._shouldShowSnowflakes();

      // Only regenerate if visibility state changed
      if (wasShowing !== shouldShow) {
        this._generateSnowflakes();
      }
    }
  }

  protected render() {
    if (!this._shouldShowSnowflakes()) {
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
