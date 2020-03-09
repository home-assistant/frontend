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

const marqueeSpeed = 0.6;

@customElement("hui-marquee")
class HuiMarquee extends LitElement {
  @property() public text?: string;
  @property() public active?: boolean;
  @property() private _animating?: boolean;
  private _left: number = 0;

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    if (
      changedProperties.has("active") &&
      this.active &&
      !this._animating &&
      this.offsetWidth < this.scrollWidth
    ) {
      this._animating = true;
      window.requestAnimationFrame(() => {
        this._animate();
      });
    }
  }

  protected render(): TemplateResult {
    if (!this.text) {
      return html``;
    }

    return html`
      <div>${this.text}</div>
      ${this._animating
        ? html`
            <div>${this.text}</div>
          `
        : ""}
    `;
  }

  private get _marqueeElementFirstChild(): HTMLElement {
    return this.shadowRoot!.firstElementChild as HTMLElement;
  }

  private _animate(): void {
    this.style.marginLeft = "-" + this._left + "px";

    if (!this.active && !this._left) {
      this._animating = false;
      return;
    }

    this._left += marqueeSpeed;
    if (this._left >= this._marqueeElementFirstChild.offsetWidth + 16) {
      this._left = 0;
    }
    window.requestAnimationFrame(() => {
      this._animate();
    });
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: flex;
      }

      :host div {
        margin-right: 16px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-marquee": HuiMarquee;
  }
}
