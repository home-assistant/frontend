import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  applyThemesOnElement,
  invalidateThemeCache,
} from "../common/dom/apply_themes_on_element";
import type { LocalizeKeys } from "../common/translations/localize";
import { subscribeLabFeature } from "../data/labs";
import { SubscribeMixin } from "../mixins/subscribe-mixin";
import type { HomeAssistant } from "../types";
import { WINDOWS_98_THEME } from "./ha-windows-98-theme";

const TIP_COUNT = 25;

type CasitaExpression =
  | "hi"
  | "ok-nabu"
  | "heart"
  | "sleep"
  | "great-job"
  | "error";

const STORAGE_KEY = "windows-98-position";
const DRAG_THRESHOLD = 5;
const BUBBLE_TIMEOUT = 8000;
const SLEEP_TIMEOUT = 30000;

@customElement("ha-windows-98")
export class HaWindows98 extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @state() private _enabled = false;

  public hassSubscribe() {
    return [
      subscribeLabFeature(
        this.hass!.connection,
        "frontend",
        "windows_98",
        (feature) => {
          this._enabled = feature.enabled;
        }
      ),
    ];
  }

  @state() private _casitaVisible = true;

  @state() private _showBubble = false;

  @state() private _bubbleText = "";

  @state() private _expression: CasitaExpression = "hi";

  @state() private _position: { x: number; y: number } | null = null;

  private _dragging = false;

  private _dragStartX = 0;

  private _dragStartY = 0;

  private _dragOffsetX = 0;

  private _dragOffsetY = 0;

  private _dragMoved = false;

  private _bubbleTimer?: ReturnType<typeof setTimeout>;

  private _sleepTimer?: ReturnType<typeof setTimeout>;

  private _boundPointerMove = this._onPointerMove.bind(this);

  private _boundPointerUp = this._onPointerUp.bind(this);

  private _themeApplied = false;

  private _isApplyingTheme = false;

  private _themeObserver?: MutationObserver;

  connectedCallback(): void {
    super.connectedCallback();
    this._loadPosition();
    this._resetSleepTimer();
    this._applyWin98Theme();
    this._startThemeObserver();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._clearTimers();
    this._stopThemeObserver();
    this._revertTheme();
    document.removeEventListener("pointermove", this._boundPointerMove);
    document.removeEventListener("pointerup", this._boundPointerUp);
  }

  protected willUpdate(changedProps: Map<string, unknown>): void {
    if (changedProps.has("_enabled")) {
      if (this._enabled) {
        this.hass!.loadFragmentTranslation("windows_98");
        this._applyWin98Theme();
        this._startThemeObserver();
      } else {
        this._stopThemeObserver();
        this._revertTheme();
      }
    }
    if (changedProps.has("hass") && this._enabled) {
      const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
      // Re-apply if darkMode changed
      if (oldHass && oldHass.themes.darkMode !== this.hass!.themes.darkMode) {
        this._themeApplied = false;
        this._applyWin98Theme();
      }
    }
  }

  private _startThemeObserver(): void {
    if (this._themeObserver) return;
    this._themeObserver = new MutationObserver(() => {
      if (this._isApplyingTheme || !this._enabled || !this.hass) return;
      // Check if our theme was overwritten by the themes mixin
      const el = document.documentElement as HTMLElement & {
        __themes?: { cacheKey?: string };
      };
      if (!el.__themes?.cacheKey?.startsWith("Windows 98")) {
        this._themeApplied = false;
        this._applyWin98Theme();
      }
    });
    this._themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style"],
    });
  }

  private _stopThemeObserver(): void {
    this._themeObserver?.disconnect();
    this._themeObserver = undefined;
  }

  private _applyWin98Theme(): void {
    if (!this.hass || this._themeApplied) return;

    this._isApplyingTheme = true;

    const themes = {
      ...this.hass.themes,
      themes: {
        ...this.hass.themes.themes,
        "Windows 98": WINDOWS_98_THEME,
      },
    };

    invalidateThemeCache();
    applyThemesOnElement(
      document.documentElement,
      themes,
      "Windows 98",
      { dark: this.hass.themes.darkMode },
      true
    );
    this._themeApplied = true;
    this._isApplyingTheme = false;
  }

  private _revertTheme(): void {
    if (!this.hass || !this._themeApplied) return;

    this._isApplyingTheme = true;

    invalidateThemeCache();
    applyThemesOnElement(
      document.documentElement,
      this.hass.themes,
      this.hass.selectedTheme?.theme || "default",
      {
        dark: this.hass.themes.darkMode,
        primaryColor: this.hass.selectedTheme?.primaryColor,
        accentColor: this.hass.selectedTheme?.accentColor,
      },
      true
    );
    this._themeApplied = false;
    this._isApplyingTheme = false;
  }

  private _loadPosition(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const pos = JSON.parse(stored);
        if (typeof pos.x === "number" && typeof pos.y === "number") {
          this._position = this._clampPosition(pos.x, pos.y);
        }
      }
    } catch {
      // Ignore invalid stored position
    }
  }

  private _savePosition(): void {
    if (this._position) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this._position));
      } catch {
        // Ignore storage errors
      }
    }
  }

  private _clampPosition(x: number, y: number): { x: number; y: number } {
    const size = 80;
    return {
      x: Math.max(0, Math.min(window.innerWidth - size, x)),
      y: Math.max(0, Math.min(window.innerHeight - size, y)),
    };
  }

  private _onPointerDown(ev: PointerEvent): void {
    if (ev.button !== 0) return;

    this._dragging = true;
    this._dragMoved = false;
    this._dragStartX = ev.clientX;
    this._dragStartY = ev.clientY;

    const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    this._dragOffsetX = ev.clientX - rect.left;
    this._dragOffsetY = ev.clientY - rect.top;

    (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
    document.addEventListener("pointermove", this._boundPointerMove);
    document.addEventListener("pointerup", this._boundPointerUp);

    ev.preventDefault();
  }

  private _onPointerMove(ev: PointerEvent): void {
    if (!this._dragging) return;

    const dx = ev.clientX - this._dragStartX;
    const dy = ev.clientY - this._dragStartY;

    if (!this._dragMoved && Math.hypot(dx, dy) < DRAG_THRESHOLD) {
      return;
    }

    this._dragMoved = true;

    const x = ev.clientX - this._dragOffsetX;
    const y = ev.clientY - this._dragOffsetY;
    this._position = this._clampPosition(x, y);
  }

  private _onPointerUp(ev: PointerEvent): void {
    document.removeEventListener("pointermove", this._boundPointerMove);
    document.removeEventListener("pointerup", this._boundPointerUp);

    this._dragging = false;

    if (this._dragMoved) {
      this._savePosition();
    } else {
      this._toggleBubble();
    }

    ev.preventDefault();
  }

  private _stopPropagation(ev: Event): void {
    ev.stopPropagation();
  }

  private _dismiss(ev: Event): void {
    ev.stopPropagation();
    this._casitaVisible = false;
    this._clearTimers();
  }

  private _toggleBubble(): void {
    if (this._showBubble) {
      this._hideBubble();
    } else {
      this._showTip();
    }
  }

  private _showTip(): void {
    const tipIndex = Math.floor(Math.random() * TIP_COUNT) + 1;
    this._bubbleText = this.hass!.localize(
      `ui.panel.windows_98.tip_${tipIndex}` as LocalizeKeys
    );
    this._showBubble = true;
    this._expression = "ok-nabu";
    this._resetSleepTimer();

    if (this._bubbleTimer) {
      clearTimeout(this._bubbleTimer);
    }
    this._bubbleTimer = setTimeout(() => {
      this._hideBubble();
    }, BUBBLE_TIMEOUT);
  }

  private _hideBubble(): void {
    this._showBubble = false;
    this._expression = "hi";
    this._resetSleepTimer();

    if (this._bubbleTimer) {
      clearTimeout(this._bubbleTimer);
      this._bubbleTimer = undefined;
    }
  }

  private _closeBubble(ev: Event): void {
    ev.stopPropagation();
    this._hideBubble();
  }

  private _resetSleepTimer(): void {
    if (this._sleepTimer) {
      clearTimeout(this._sleepTimer);
    }
    this._sleepTimer = setTimeout(() => {
      if (!this._showBubble) {
        this._expression = "sleep";
      }
    }, SLEEP_TIMEOUT);
  }

  private _clearTimers(): void {
    if (this._bubbleTimer) {
      clearTimeout(this._bubbleTimer);
      this._bubbleTimer = undefined;
    }
    if (this._sleepTimer) {
      clearTimeout(this._sleepTimer);
      this._sleepTimer = undefined;
    }
  }

  protected render() {
    if (!this._enabled || !this._casitaVisible) {
      return nothing;
    }

    const size = 80;
    const posStyle = this._position
      ? `left: ${this._position.x}px; top: ${this._position.y}px;`
      : `right: 16px; bottom: 16px;`;

    return html`
      <div
        class="casita-container ${this._dragging ? "dragging" : ""}"
        style="width: ${size}px; ${posStyle}"
        aria-hidden="true"
        @pointerdown=${this._onPointerDown}
      >
        ${this._showBubble
          ? html`
              <div class="speech-bubble">
                <span class="bubble-text">${this._bubbleText}</span>
                <button
                  class="bubble-close"
                  @pointerdown=${this._stopPropagation}
                  @click=${this._closeBubble}
                >
                  ✕
                </button>
                <button
                  class="bubble-dismiss"
                  @pointerdown=${this._stopPropagation}
                  @click=${this._dismiss}
                >
                  ${this.hass!.localize("ui.panel.windows_98.dismiss")}
                </button>
                <div class="bubble-arrow"></div>
              </div>
            `
          : nothing}
        <img
          class="casita-image"
          src="/static/images/voice-assistant/${this._expression}.png"
          alt="Casita"
          draggable="false"
        />
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
      user-select: none;
      z-index: 9999;
    }

    .casita-container {
      position: fixed;
      pointer-events: auto;
      cursor: grab;
      user-select: none;
      touch-action: none;
      filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3));
    }

    .casita-container.dragging {
      cursor: grabbing;
    }

    .casita-image {
      width: 100%;
      height: auto;
      animation: bob 3s ease-in-out infinite;
      pointer-events: none;
    }

    .dragging .casita-image {
      animation: none;
    }

    .speech-bubble {
      position: absolute;
      bottom: calc(100% + 8px);
      right: 0;
      background: #ffffe1;
      color: #000000;
      border-radius: 12px;
      border: 2px solid #000000;
      padding: 12px 28px 12px 12px;
      font-family: Tahoma, "MS Sans Serif", Arial, sans-serif;
      font-size: 14px;
      line-height: 1.4;
      width: 300px;
      box-sizing: border-box;
      word-wrap: break-word;
      overflow-wrap: break-word;
      box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
      animation: bubble-in 200ms ease-out;
      pointer-events: auto;
    }

    .bubble-close {
      position: absolute;
      top: 4px;
      right: 4px;
      background: none;
      border: none;
      cursor: pointer;
      color: #000000;
      font-size: 14px;
      padding: 2px 6px;
      line-height: 1;
      border-radius: 50%;
    }

    .bubble-close:hover {
      background: #e0e0c0;
    }

    .bubble-dismiss {
      display: block;
      margin-top: 8px;
      background: none;
      border: none;
      cursor: pointer;
      color: #808080;
      font-family: Tahoma, "MS Sans Serif", Arial, sans-serif;
      font-size: 12px;
      padding: 0;
      text-decoration: underline;
    }

    .bubble-dismiss:hover {
      color: #000000;
    }

    .bubble-arrow {
      position: absolute;
      bottom: -8px;
      right: 32px;
      width: 0;
      height: 0;
      border-left: 8px solid transparent;
      border-right: 8px solid transparent;
      border-top: 8px solid #ffffe1;
    }

    @keyframes bob {
      0%,
      100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-4px);
      }
    }

    @keyframes bubble-in {
      from {
        opacity: 0;
        transform: translateY(4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .casita-image {
        animation: none;
      }
      .speech-bubble {
        animation: none;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-windows-98": HaWindows98;
  }
}
