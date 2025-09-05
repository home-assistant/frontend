import { LitElement, html, css } from "lit";
import { customElement, property, query } from "lit/decorators";

@customElement("ha-marquee-text")
export class HaMarqueeText extends LitElement {
  @property({ type: String }) text = "";

  @property({ type: Number }) speed = 15; // pixels per second

  @property({ type: Number, attribute: "pause-duration" }) pauseDuration = 1000; // ms delay at ends

  @property({ type: Boolean, attribute: "pause-on-hover" }) pauseOnHover =
    false;

  private _direction: "left" | "right" = "left";

  private _animationFrame?: number;

  @query(".marquee-container")
  private _container?: HTMLDivElement;

  @query(".marquee-text")
  private _textSpan?: HTMLSpanElement;

  private _position = 0;

  private _maxOffset = 0;

  private _pauseTimeout?: number;

  render() {
    return html`
      <div
        class="marquee-container"
        @mouseenter=${this._onMouseEnter}
        @mouseleave=${this._onMouseLeave}
        aria-label=${this.text}
        role="marquee"
      >
        <span class="marquee-text">${this.text}</span>
      </div>
    `;
  }

  firstUpdated() {
    this._setupAnimation();
  }

  updated(changedProps: Map<string, unknown>) {
    if (changedProps.has("text")) {
      this._setupAnimation();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
    }
    if (this._pauseTimeout) {
      clearTimeout(this._pauseTimeout);
      this._pauseTimeout = undefined;
    }
  }

  private _setupAnimation() {
    if (!this._container || !this._textSpan) return;
    this._position = 0;
    this._direction = "left";
    this._maxOffset = Math.max(
      0,
      this._textSpan.offsetWidth - this._container.offsetWidth
    );
    this._textSpan.style.transform = `translateX(0px)`;
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
    }
    if (this._pauseTimeout) {
      clearTimeout(this._pauseTimeout);
      this._pauseTimeout = undefined;
    }
    this._animate();
  }

  private _animate = () => {
    if (!this._container || !this._textSpan) return;
    const dt = 1 / 60; // ~16ms per frame
    const pxPerFrame = this.speed * dt;
    let reachedEnd = false;
    if (this._direction === "left") {
      this._position -= pxPerFrame;
      if (this._position <= -this._maxOffset) {
        this._position = -this._maxOffset;
        this._direction = "right";
        reachedEnd = true;
      }
    } else {
      this._position += pxPerFrame;
      if (this._position >= 0) {
        this._position = 0;
        this._direction = "left";
        reachedEnd = true;
      }
    }
    this._textSpan.style.transform = `translateX(${this._position}px)`;
    if (reachedEnd) {
      this._pauseTimeout = window.setTimeout(() => {
        this._pauseTimeout = undefined;
        this._animationFrame = requestAnimationFrame(this._animate);
      }, this.pauseDuration);
    } else {
      this._animationFrame = requestAnimationFrame(this._animate);
    }
  };

  private _onMouseEnter = () => {
    if (this.pauseOnHover && this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = undefined;
    }
    if (this.pauseOnHover && this._pauseTimeout) {
      clearTimeout(this._pauseTimeout);
      this._pauseTimeout = undefined;
    }
  };

  private _onMouseLeave = () => {
    if (this.pauseOnHover && !this._animationFrame && !this._pauseTimeout) {
      this._animate();
    }
  };

  static styles = css`
    :host {
      display: block;
      overflow: hidden;
      width: 100%;
      --marquee-height: 32px;
    }

    .marquee-container {
      position: relative;
      width: 100%;
      height: var(--marquee-height, 32px);
      white-space: nowrap;
      overflow: hidden;
      user-select: none;
      cursor: default;
    }

    .marquee-text {
      position: absolute;
      left: 0;
      transform: translateY(-50%);
      will-change: transform;
      font-size: 1em;
      line-height: var(--marquee-height, 32px);
      pointer-events: none;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-marquee-text": HaMarqueeText;
  }
}
