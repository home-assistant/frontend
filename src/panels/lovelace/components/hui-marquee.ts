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

@customElement("hui-marquee")
class HuiMarquee extends LitElement {
  @property() public text?: string;
  @property({ type: Boolean }) public active?: boolean;
  @property({ type: Boolean, reflect: true, attribute: "stopped" })
  public forceStop?: boolean;
  @property({ reflect: true, type: Boolean, attribute: "animating" })
  private _animating = false;

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);

    this.addEventListener("mouseover", () => this.classList.add("hovering"), {
      // Capture because we need to run before a parent sets active on us.
      // Hovering will disable the overflow, allowing us to calc if we overflow.
      capture: true,
    });
    this.addEventListener("mouseout", () => this.classList.remove("hovering"));
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    if (this.forceStop) {
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

  protected render(): TemplateResult {
    if (!this.text) {
      return html``;
    }

    return html`
      <div class="marquee-inner" @animationiteration=${this._onIteration}>
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
        height: 1em;
      }

      .marquee-inner {
        position: absolute;
        left: 0;
        right: 0;
        text-overflow: ellipsis;
        overflow: hidden;
        animation: marquee 10s linear infinite paused;
      }

      :host(.hovering) .marquee-inner {
        text-overflow: initial;
        overflow: initial;
      }

      :host([animating]) .marquee-inner {
        left: initial;
        right: initial;
        animation-play-state: running;
      }

      :host([animating]) .marquee-inner span {
        padding-right: 16px;
      }

      :host([stopped]) .marquee-inner {
        animation: none;
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
