import { mdiImagePlus } from "@mdi/js";
import { LitElement, TemplateResult, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { createImage, generateImageThumbnailUrl } from "../data/image_upload";
import { showAlertDialog } from "../dialogs/generic/show-dialog-box";
import {
  CropOptions,
  showImageCropperDialog,
} from "../dialogs/image-cropper-dialog/show-image-cropper-dialog";
import { HomeAssistant } from "../types";
import "./ha-button";
import "./ha-circular-progress";
import "./ha-file-upload";

@customElement("ha-picture-upload")
export class HaPictureUpload extends LitElement {
  public hass!: HomeAssistant;

  @property() public value: string | null = null;

  @property() public label?: string;

  @property() public secondary?: string;

  @property() public supports?: string;

  @property() public currentImageAltText?: string;

  @property({ type: Boolean }) public crop = false;

  @property({ attribute: false }) public cropOptions?: CropOptions;

  @property({ type: Number }) public size = 512;

  @state() private _uploading = false;

  public render(): TemplateResult {
    if (!this.value) {
      return html`
        <ha-file-upload
          .hass=${this.hass}
          .icon=${mdiImagePlus}
          .label=${this.label ||
          this.hass.localize("ui.components.picture-upload.label")}
          .secondary=${this.secondary}
          .supports=${this.supports ||
          this.hass.localize("ui.components.picture-upload.supported_formats")}
          .uploading=${this._uploading}
          @file-picked=${this._handleFilePicked}
          @change=${this._handleFileCleared}
          accept="image/png, image/jpeg, image/gif"
        ></ha-file-upload>
      `;
    }
    return html`<div class="center-vertical">
      <div class="value">
        <img
          .src=${this.value}
          alt=${this.currentImageAltText ||
          this.hass.localize("ui.components.picture-upload.current_image_alt")}
        />
        <ha-button
          @click=${this._handleChangeClick}
          .label=${this.hass.localize(
            "ui.components.picture-upload.change_picture"
          )}
        >
        </ha-button>
      </div>
    </div>`;
  }

  private _handleChangeClick() {
    this.value = null;
    fireEvent(this, "change");
  }

  private async _handleFilePicked(ev) {
    const file = ev.detail.files[0];
    if (this.crop) {
      this._cropFile(file);
    } else {
      this._uploadFile(file);
    }
  }

  private async _handleFileCleared() {
    this.value = null;
  }

  private async _cropFile(file: File) {
    if (!["image/png", "image/jpeg", "image/gif"].includes(file.type)) {
      showAlertDialog(this, {
        text: this.hass.localize(
          "ui.components.picture-upload.unsupported_format"
        ),
      });
      return;
    }
    showImageCropperDialog(this, {
      file,
      options: this.cropOptions || {
        round: false,
        aspectRatio: NaN,
      },
      croppedCallback: (croppedFile) => {
        this._uploadFile(croppedFile);
      },
    });
  }

  private async _uploadFile(file: File) {
    if (!["image/png", "image/jpeg", "image/gif"].includes(file.type)) {
      showAlertDialog(this, {
        text: this.hass.localize(
          "ui.components.picture-upload.unsupported_format"
        ),
      });
      return;
    }
    this._uploading = true;
    try {
      const media = await createImage(this.hass, file);
      this.value = generateImageThumbnailUrl(media.id, this.size);
      fireEvent(this, "change");
    } catch (err: any) {
      showAlertDialog(this, {
        text: err.toString(),
      });
    } finally {
      this._uploading = false;
    }
  }

  static get styles() {
    return css`
      :host {
        display: block;
        height: 240px;
      }
      ha-file-upload {
        height: 100%;
      }
      .center-vertical {
        display: flex;
        align-items: center;
        height: 100%;
      }
      .value {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      img {
        max-width: 100%;
        max-height: 200px;
        margin-bottom: 4px;
        border-radius: var(--file-upload-image-border-radius);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-picture-upload": HaPictureUpload;
  }
}
