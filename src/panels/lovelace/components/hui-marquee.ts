import {
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
  customElement,
  css,
  CSSResult,
  property,
  query,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";

@customElement("hui-marquee")
class HuiMarquee extends LitElement {
  @property() public text?: string;
  @property() public active?: boolean;
  @property() private _animating?: boolean;
  @query(".marquee") private _marquee?: HTMLDivElement;
  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    if (changedProperties.has("active") && this.active) {
      const marquee = this._marquee;
      if (marquee && marquee.offsetWidth < marquee.scrollWidth) {
        this._animating = true;
      }
    }
  }

  protected render(): TemplateResult {
    if (!this.text) {
      return html``;
    }

    return html`
      <div class="marquee">
        <div
          class="marquee-inner ${classMap({
            animating: Boolean(this._animating),
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
      .marquee {
        width: 100%;
        height: 25px;
        overflow: hidden;
        position: relative;
      }

      .marquee-inner {
        position: absolute;
      }

      .animating {
        animation: marquee 10s linear infinite;
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
