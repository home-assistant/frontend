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
import "../ha-icon";
import "../ha-svg-icon";

@customElement("ha-tile-button")
export class HaTileButton extends LitElement {
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
        .title=${this.label}
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
        ${this._shouldRenderRipple ? html`<mwc-ripple></mwc-ripple>` : ""}
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
        --icon-color: rgb(var(--color, var(--rgb-primary-text-color)));
        --bg-color: rgba(var(--color, var(--rgb-disabled-color)), 0.2);
        --mdc-ripple-color: rgba(var(--color, var(--rgb-disabled-color)));
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
        border-radius: 12px;
        border: none;
        background-color: var(--bg-color);
        transition: background-color 280ms ease-in-out, transform 180ms ease-out;
        font-size: var(--control-height);
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        line-height: 0;
        outline: none;
      }
      .button ::slotted(*) {
        --mdc-icon-size: 20px;
        color: var(--icon-color);
        pointer-events: none;
      }
      .button:disabled {
        cursor: not-allowed;
        background-color: rgba(var(--rgb-disabled-color), 0.2);
      }
      .button:disabled ::slotted(*) {
        color: rgb(var(--rgb-disabled-color));
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-tile-button": HaTileButton;
  }
}
