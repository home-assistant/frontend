import { CSSResultGroup, html, css, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";

@customElement("ha-tile-image")
export class HaTileImage extends LitElement {
  @property() public imageUrl?: string;

  @property() public imageAlt?: string;

  protected render() {
    return html`
      <div class="image">
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
