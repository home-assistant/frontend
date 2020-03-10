import {
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
  customElement,
  css,
  CSSResult,
  property,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";

@customElement("hui-marquee")
class HuiMarquee extends LitElement {
  @property() public text?: string;
  @property() public active?: boolean;
  @property() private _animating = false;
  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    if (
      changedProperties.has("active") &&
      this.active &&
      this.offsetWidth < this.scrollWidth
    ) {
      this._animating = true;
    }
  }

  protected render(): TemplateResult {
    if (!this.text) {
      return html``;
    }

    return html`
      <div
        class="marquee-inner ${classMap({
          animating: this._animating,
        })}"
        @animationiteration=${this._onIteration}
      >
        <span>${this.text}</span>
        ${this._animating
          ? html`
              <span>${this.text}</span>
            `
          : ""}
      </div>
    `;
  }

  private _onIteration() {
    if (!this.active) {
      this._animating = false;
    }
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: flex;
        position: relative;
        align-items: center;
        height: 25px;
      }

      .marquee-inner {
        position: absolute;
        animation: marquee 10s linear infinite paused;
      }

      .animating {
        animation-play-state: running;
      }

      span {
        padding-right: 16px;
      }

      @keyframes marquee {
        0% {
          transform: translateX(0%);
        }
        100% {
          transform: translateX(-50%);
        }
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-marquee": HuiMarquee;
  }
}
