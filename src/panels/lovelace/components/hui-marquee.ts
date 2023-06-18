import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  nothing,
} from "lit";
import { customElement, property } from "lit/decorators";

@customElement("hui-marquee")
class HuiMarquee extends LitElement {
  @property() public text?: string;

  @property({ type: Boolean }) public active?: boolean;

  @property({ reflect: true, type: Boolean, attribute: "animating" })
  private _animating = false;

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);

    // eslint-disable-next-line wc/no-self-class
    this.addEventListener("mouseover", () => this.classList.add("hovering"), {
      // Capture because we need to run before a parent sets active on us.
      // Hovering will disable the overflow, allowing us to calc if we overflow.
      capture: true,
    });
    // eslint-disable-next-line wc/no-self-class
    this.addEventListener("mouseout", () => this.classList.remove("hovering"));
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    if (changedProperties.has("text") && this._animating) {
      this._animating = false;
    }

    if (
      changedProperties.has("active") &&
      this.active &&
      this.offsetWidth < this.scrollWidth
    ) {
      this._animating = true;
    }
  }

  protected render() {
    if (!this.text) {
      return nothing;
    }

    return html`
      <div class="marquee-inner" @animationiteration=${this._onIteration}>
        <span>${this.text}</span>
        ${this._animating ? html` <span>${this.text}</span> ` : ""}
      </div>
    `;
  }

  private _onIteration() {
    if (!this.active) {
      this._animating = false;
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: flex;
        position: relative;
        align-items: center;
        height: 1.2em;
        contain: strict;
      }

      .marquee-inner {
        position: absolute;
        left: 0;
        right: 0;
        text-overflow: ellipsis;
        overflow: hidden;
      }

      :host(.hovering) .marquee-inner {
        text-overflow: initial;
        overflow: initial;
      }

      :host([animating]) .marquee-inner {
        left: initial;
        right: initial;
        animation: marquee 10s linear infinite;
      }

      :host([animating]) .marquee-inner span {
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
