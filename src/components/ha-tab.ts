import type { Ripple } from "@material/mwc-ripple";
import "@material/mwc-ripple/mwc-ripple";
import { RippleHandlers } from "@material/mwc-ripple/ripple-handlers";
import {
  css,
  CSSResult,
  customElement,
  eventOptions,
  html,
  internalProperty,
  LitElement,
  property,
  queryAsync,
  TemplateResult,
} from "lit-element";
import { ifDefined } from "lit-html/directives/if-defined";
import "./ha-icon";
import "./ha-svg-icon";

@customElement("ha-tab")
export class HaTab extends LitElement {
  @property({ type: Boolean, reflect: true }) public active = false;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property() public name?: string;

  @queryAsync("mwc-ripple") private _ripple!: Promise<Ripple | null>;

  @internalProperty() private _shouldRenderRipple = false;

  protected render(): TemplateResult {
    return html`
      <div
        tabindex="0"
        role="tab"
        aria-selected=${this.active}
        aria-label=${ifDefined(this.name)}
        @focus=${this.handleRippleFocus}
        @blur=${this.handleRippleBlur}
        @mousedown=${this.handleRippleActivate}
        @mouseup=${this.handleRippleDeactivate}
        @mouseenter=${this.handleRippleMouseEnter}
        @mouseleave=${this.handleRippleMouseLeave}
        @touchstart=${this.handleRippleActivate}
        @touchend=${this.handleRippleDeactivate}
        @touchcancel=${this.handleRippleDeactivate}
        @keydown=${this._handleKeyDown}
      >
        ${this.narrow ? html`<slot name="icon"></slot>` : ""}
        ${!this.narrow || this.active
          ? html`<span class="name">${this.name}</span>`
          : ""}
        ${this._shouldRenderRipple ? html`<mwc-ripple></mwc-ripple>` : ""}
      </div>
    `;
  }

  private _rippleHandlers: RippleHandlers = new RippleHandlers(() => {
    this._shouldRenderRipple = true;
    return this._ripple;
  });

  private _handleKeyDown(ev: KeyboardEvent): void {
    if (ev.keyCode === 13) {
      (ev.target as HTMLElement).click();
    }
  }

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

  static get styles(): CSSResult {
    return css`
      div {
        padding: 0 32px;
        display: flex;
        flex-direction: column;
        text-align: center;
        box-sizing: border-box;
        align-items: center;
        justify-content: center;
        height: var(--header-height);
        cursor: pointer;
        position: relative;
        outline: none;
      }

      .name {
        white-space: nowrap;
      }

      :host([active]) {
        color: var(--primary-color);
      }

      :host(:not([narrow])[active]) div {
        border-bottom: 2px solid var(--primary-color);
      }

      :host([narrow]) {
        padding: 0 16px;
        width: 20%;
        min-width: 0;
      }
    `;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "ha-tab": HaTab;
  }
}
