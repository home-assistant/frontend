import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";

export type TileImageStyle = "square" | "rounded-square" | "circle";
@customElement("ha-tile-image")
export class HaTileImage extends LitElement {
  @property() public imageUrl?: string;

  @property() public imageAlt?: string;

  @property() public imageStyle: TileImageStyle = "circle";

  protected render() {
    return html`
      <div class="image ${this.imageStyle}">
        ${this.imageUrl
          ? html`<img alt=${ifDefined(this.imageAlt)} src=${this.imageUrl} />`
          : nothing}
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      .image {
        position: relative;
        width: 40px;
        height: 40px;
        border-radius: 20px;
        display: flex;
        flex: none;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }
      .image.rounded-square {
        border-radius: 8%;
      }
      .image.square {
        border-radius: 0;
      }
      .image img {
        width: 100%;
        height: 100%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-tile-image": HaTileImage;
  }
}
