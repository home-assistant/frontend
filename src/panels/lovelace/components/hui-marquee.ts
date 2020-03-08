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

const marqueeSpeed = 0.2;

@customElement("hui-marquee")
class HuiMarquee extends LitElement {
  @property() public text?: string;
  @property() public active?: boolean;
  private _interval?: number;
  private _left: number = 0;

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    if (
      changedProperties.has("active") &&
      this.active &&
      !this._interval &&
      this.offsetWidth < this.scrollWidth
    ) {
      this._interval = window.setInterval(() => {
        this._play();
      });

      this.requestUpdate();
    }
  }

  protected render(): TemplateResult {
    if (!this.text) {
      return html``;
    }

    return html`
      <div>${this.text}</div>
      ${this._interval
        ? html`
            <div>${this.text}</div>
          `
        : ""}
    `;
  }

  private get _marqueeElementFirstChild(): HTMLElement {
    return this.shadowRoot!.firstElementChild as HTMLElement;
  }

  private _play(): void {
    this.style.marginLeft = "-" + this._left + "px";

    if (!this.active && !this._left) {
      clearInterval(this._interval);
      this._interval = undefined;
    }

    this._left += marqueeSpeed;
    if (this._left >= this._marqueeElementFirstChild.offsetWidth + 16) {
      this._left = 0;
    }
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
