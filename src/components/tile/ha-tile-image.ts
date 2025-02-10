import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";

export type TileImageStyle = "square" | "rounded-square" | "circle";
@customElement("ha-tile-image")
export class HaTileImage extends LitElement {
  @property({ attribute: false }) public imageUrl?: string;

  @property({ attribute: false }) public imageAlt?: string;

  @property({ type: String, reflect: true, attribute: "image-style" })
  public imageStyle: TileImageStyle = "circle";

  protected render() {
    return html`
      ${this.imageUrl
        ? html`<img alt=${ifDefined(this.imageAlt)} src=${this.imageUrl} />`
        : nothing}
    `;
  }

  static styles = css`
    :host {
      display: block;
      overflow: hidden;
      display: flex;
      flex: none;
      align-items: center;
      justify-content: center;
      border-radius: 0;
      width: 36px;
      height: 36px;
    }
    :host([image-style="circle"]) {
      border-radius: 18px;
    }
    :host([image-style="rounded-square"]) {
      border-radius: 8px;
    }
    img {
      width: 100%;
      height: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-tile-image": HaTileImage;
  }
}
