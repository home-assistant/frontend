import {
  LitElement,
  TemplateResult,
  html,
  property,
  css,
  customElement,
  internalProperty,
} from "lit-element";
import { createImage, generateImageThumbnailUrl } from "../data/image";
import { HomeAssistant } from "../types";
import { fireEvent } from "../common/dom/fire_event";
import "./ha-circular-progress";

@customElement("ha-picture-upload")
export class HaPictureUpload extends LitElement {
  public hass!: HomeAssistant;

  @property() public value: string | null = null;

  @property() public size = 512;

  @internalProperty() private _error = "";

  @internalProperty() private _uploading = false;

  public render(): TemplateResult {
    return html`
      ${this._uploading
        ? html`<ha-circular-progress
            alt="Uploading"
            size="large"
            active
          ></ha-circular-progress>`
        : html`
            ${this._error ? html`<div class="error">${this._error}</div>` : ""}
            ${this.value ? html`<img .src=${this.value} />` : ""}
            <input type="file" @change=${this._uploadFile} />
            ${this.value
              ? html`<button @click=${this._clearPicture}>
                  Clear Picture
                </button>`
              : ""}
          `}
    `;
  }

  private async _uploadFile(ev) {
    this._uploading = true;
    try {
      const media = await createImage(this.hass, ev.target.files[0]);
      this.value = generateImageThumbnailUrl(media.id, this.size);
      fireEvent(this, "change");
    } catch (err) {
      this._error = err.toString();
    } finally {
      this._uploading = false;
    }
  }

  private _clearPicture() {
    this.value = null;
    fireEvent(this, "change");
  }

  static get styles() {
    return css`
      .error {
        color: var(--error-color);
      }
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
