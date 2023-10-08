import "@material/mwc-ripple";
import type { Ripple } from "@material/mwc-ripple";
import { RippleHandlers } from "@material/mwc-ripple/ripple-handlers";
import { CSSResultGroup, LitElement, TemplateResult, css, html } from "lit";
import {
  customElement,
  eventOptions,
  property,
  queryAsync,
  state,
} from "lit/decorators";
import "../components/ha-card";

@customElement("onboarding-welcome-link")
class OnboardingWelcomeLink extends LitElement {
  @property() public label!: string;

  @property() public iconPath!: string;

  @property({ attribute: true, type: Boolean }) public noninteractive?: boolean;

  @queryAsync("mwc-ripple") private _ripple!: Promise<Ripple | null>;

  @state() private _shouldRenderRipple = false;

  protected render(): TemplateResult {
    return html`
      <ha-card
        .tabIndex=${this.noninteractive ? "-1" : "0"}
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
        <ha-svg-icon .path=${this.iconPath}></ha-svg-icon>
        ${this.label}
        ${this._shouldRenderRipple ? html`<mwc-ripple></mwc-ripple>` : ""}
      </ha-card>
    `;
  }

  private _handleKeyDown(ev: KeyboardEvent): void {
    if (ev.key === "Enter" || ev.key === " ") {
      (ev.target as HTMLElement).click();
    }
  }

  private _rippleHandlers: RippleHandlers = new RippleHandlers(() => {
    this._shouldRenderRipple = true;
    return this._ripple;
  });

  private handleRippleMouseEnter() {
    this._rippleHandlers.startHover();
  }

  private handleRippleMouseLeave() {
    this._rippleHandlers.endHover();
  }

  @eventOptions({ passive: true })
  private handleRippleActivate(evt?: Event) {
    this._rippleHandlers.startPress(evt);
  }

  private handleRippleDeactivate() {
    this._rippleHandlers.endPress();
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
        cursor: pointer;
      }
      ha-card {
        overflow: hidden;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        font-weight: 500;
        padding: 32px 16px;
        height: 100%;
      }
      ha-svg-icon {
        color: var(--text-primary-color);
        background: var(--welcome-link-color, var(--primary-color));
        border-radius: 50%;
        padding: 8px;
        margin-bottom: 16px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "onboarding-welcome-link": OnboardingWelcomeLink;
  }
}
