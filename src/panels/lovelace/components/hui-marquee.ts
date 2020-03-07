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
  @property() public marqueeText?: string;
  @property() public off?: boolean;
  private interval?: number;
  private left: number = 0;

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    if (!this.off) {
      this._start();
    }
  }

  protected render(): TemplateResult {
    if (!this.marqueeText) {
      return html``;
    }

    return html`
      <div id="Marquee">
        <div>${this.marqueeText}</div>
      </div>
    `;
  }

  private get _marqueeElement(): HTMLElement {
    return this.shadowRoot?.querySelector("#Marquee") as HTMLElement;
  }

  private get _marqueeElementFirstChild(): HTMLElement {
    return this._marqueeElement.firstElementChild as HTMLElement;
  }

  private get _marqueeElementLastChild(): HTMLElement {
    return this._marqueeElement.lastElementChild as HTMLElement;
  }

  private _start(): void {
    if (this.interval || this.offsetWidth >= this._marqueeElement.scrollWidth) {
      return;
    }

    this._marqueeElement.innerHTML += this._marqueeElement.innerHTML;

    this.interval = window.setInterval(() => {
      this._play();
    });
  }

  private _play(): void {
    this._marqueeElement.style.marginLeft = "-" + this.left + "px";

    if (this.off && !this.left) {
      clearInterval(this.interval);
      this.interval = undefined;
      this._marqueeElementLastChild.remove();
      this.off = true;
    }

    this.left += marqueeSpeed;
    if (this.left >= this._marqueeElementFirstChild.offsetWidth + 16) {
      this.left = 0;
    }
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: block;
      }

      #Marquee {
        display: flex;
      }

      #Marquee div {
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
