import { Ripple } from "@material/mwc-ripple";
import { RippleHandlers } from "@material/mwc-ripple/ripple-handlers";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import {
  customElement,
  eventOptions,
  property,
  queryAsync,
  state,
} from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";

@customElement("ha-bar-button")
export class HaBarButton extends LitElement {
  @property({ type: Boolean, reflect: true }) disabled = false;

  @property() public label?: string;

  @queryAsync("mwc-ripple") private _ripple!: Promise<Ripple | null>;

  @state() private _shouldRenderRipple = false;

  protected render(): TemplateResult {
    return html`
      <button
        type="button"
        class="button"
        aria-label=${ifDefined(this.label)}
        title=${ifDefined(this.label)}
        .disabled=${Boolean(this.disabled)}
        @focus=${this.handleRippleFocus}
        @blur=${this.handleRippleBlur}
        @mousedown=${this.handleRippleActivate}
        @mouseup=${this.handleRippleDeactivate}
        @mouseenter=${this.handleRippleMouseEnter}
        @mouseleave=${this.handleRippleMouseLeave}
        @touchstart=${this.handleRippleActivate}
        @touchend=${this.handleRippleDeactivate}
        @touchcancel=${this.handleRippleDeactivate}
      >
        <slot></slot>
        ${this._shouldRenderRipple && !this.disabled
          ? html`<mwc-ripple></mwc-ripple>`
          : ""}
      </button>
    `;
  }

  private _rippleHandlers: RippleHandlers = new RippleHandlers(() => {
    this._shouldRenderRipple = true;
    return this._ripple;
  });

  @eventOptions({ passive: true })
  private handleRippleActivate(evt?: Event) {
    this._rippleHandlers.startPress(evt);
  }

  private handleRippleDeactivate() {
    this._rippleHandlers.endPress();
  }

  private handleRippleMouseEnter() {
    this._rippleHandlers.startHover();
  }

  private handleRippleMouseLeave() {
    this._rippleHandlers.endHover();
  }

  private handleRippleFocus() {
    this._rippleHandlers.startFocus();
  }

  private handleRippleBlur() {
    this._rippleHandlers.endFocus();
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
        --button-bar-icon-color: var(--primary-text-color);
        --button-bar-background-color: var(--disabled-color);
        --button-bar-background-opacity: 0.2;
        --button-bar-border-radius: 10px;
        width: 40px;
        height: 40px;
        -webkit-tap-highlight-color: transparent;
      }
      .button {
        overflow: hidden;
        position: relative;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        border-radius: var(--button-bar-border-radius);
        border: none;
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        line-height: 0;
        outline: none;
        overflow: hidden;
        background: none;
        z-index: 1;
        --mdc-ripple-color: var(--button-bar-background-color);
      }
      .button::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: 100%;
        background-color: var(--button-bar-background-color);
        transition: background-color 180ms ease-in-out,
          opacity 180ms ease-in-out;
        opacity: var(--button-bar-background-opacity);
      }
      .button ::slotted(*) {
        transition: color 180ms ease-in-out;
        color: var(--button-bar-icon-color);
        pointer-events: none;
      }
      .button:disabled {
        cursor: not-allowed;
        --button-bar-background-color: var(--disabled-color);
        --button-bar-icon-color: var(--disabled-text-color);
        --button-bar-background-opacity: 0.2;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-bar-button": HaBarButton;
  }
}
