import {
  LitElement,
  TemplateResult,
  html,
  property,
  css,
  customElement,
} from "lit-element";
import { createMedia, generateMediaThumbnailUrl } from "../data/media_manager";
import { HomeAssistant } from "../types";

@customElement("ha-picture-upload")
class HaPictureUpload extends LitElement {
  public hass!: HomeAssistant;

  @property() public value?: string;

  public render(): TemplateResult {
    return html`
      <input type="text" .value=${this.value || ""} />
      ${this.value ? html`<img .src=${this.value} />` : ""}
      <input type="file" @change=${this._uploadFile}>Upload image</input>
    `;
  }

  private async _uploadFile(ev) {
    console.log(ev.target.files);
    const media = await createMedia(this.hass, ev.target.files[0]);
    console.log(media);
    this.value = generateMediaThumbnailUrl(media.id, 256);
  }

  static get styles() {
    return css`
      img {
        display: block;
        max-width: 125px;
        max-height: 125px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-picture-upload": HaPictureUpload;
  }
}
