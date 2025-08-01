import { mdiImagePlus } from "@mdi/js";
import type { TemplateResult } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { MediaPickedEvent } from "../data/media-player";
import { fireEvent } from "../common/dom/fire_event";
import { haStyle } from "../resources/styles";
import {
  MEDIA_PREFIX,
  getIdFromUrl,
  createImage,
  generateImageThumbnailUrl,
  getImageData,
} from "../data/image_upload";
import { showAlertDialog } from "../dialogs/generic/show-dialog-box";
import type { CropOptions } from "../dialogs/image-cropper-dialog/show-image-cropper-dialog";
import { showImageCropperDialog } from "../dialogs/image-cropper-dialog/show-image-cropper-dialog";
import type { HomeAssistant } from "../types";
import "./ha-button";
import "./ha-file-upload";
import { showMediaBrowserDialog } from "./media-player/show-media-browser-dialog";

@customElement("ha-picture-upload")
export class HaPictureUpload extends LitElement {
  public hass!: HomeAssistant;

  @property() public value: string | null = null;

  @property() public label?: string;

  @property() public secondary?: string;

  @property() public supports?: string;

  @property({ attribute: false }) public currentImageAltText?: string;

  @property({ type: Boolean }) public crop = false;

  @property({ type: Boolean, attribute: "select-media" }) public selectMedia =
    false;

  @property({ attribute: false }) public cropOptions?: CropOptions;

  @property({ type: Boolean }) public original = false;

  @property({ type: Number }) public size = 512;

  @state() private _uploading = false;

  public render(): TemplateResult {
    if (!this.value) {
      const secondary =
        this.secondary ||
        (this.selectMedia
          ? html`${this.hass.localize(
              "ui.components.picture-upload.secondary",
              {
                select_media: html`<button
                  class="link"
                  @click=${this._chooseMedia}
                >
                  ${this.hass.localize(
                    "ui.components.picture-upload.select_media"
                  )}
                </button>`,
              }
            )}`
          : undefined);

      return html`
        <ha-file-upload
          .hass=${this.hass}
          .icon=${mdiImagePlus}
          .label=${this.label ||
          this.hass.localize("ui.components.picture-upload.label")}
          .secondary=${secondary}
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
        <div>
          <ha-button
            appearance="plain"
            size="small"
            variant="danger"
            @click=${this._handleChangeClick}
          >
            ${this.hass.localize("ui.components.picture-upload.clear_picture")}
          </ha-button>
        </div>
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

  private async _cropFile(file: File, mediaId?: string) {
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
        if (mediaId && croppedFile === file) {
          this.value = generateImageThumbnailUrl(
            mediaId,
            this.size,
            this.original
          );
          fireEvent(this, "change");
        } else {
          this._uploadFile(croppedFile);
        }
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
      this.value = generateImageThumbnailUrl(
        media.id,
        this.size,
        this.original
      );
      fireEvent(this, "change");
    } catch (err: any) {
      showAlertDialog(this, {
        text: err.toString(),
      });
    } finally {
      this._uploading = false;
    }
  }

  private _chooseMedia = () => {
    showMediaBrowserDialog(this, {
      action: "pick",
      entityId: "browser",
      navigateIds: [
        { media_content_id: undefined, media_content_type: undefined },
        {
          media_content_id: MEDIA_PREFIX,
          media_content_type: "app",
        },
      ],
      minimumNavigateLevel: 2,
      mediaPickedCallback: async (pickedMedia: MediaPickedEvent) => {
        const mediaId = getIdFromUrl(pickedMedia.item.media_content_id);
        if (mediaId) {
          if (this.crop) {
            const url = generateImageThumbnailUrl(mediaId, undefined, true);
            let data;
            try {
              data = await getImageData(this.hass, url);
            } catch (err: any) {
              showAlertDialog(this, {
                text: err.toString(),
              });
              return;
            }
            const metadata = {
              type: pickedMedia.item.media_content_type,
            };
            const file = new File([data], pickedMedia.item.title, metadata);
            this._cropFile(file, mediaId);
          } else {
            this.value = generateImageThumbnailUrl(
              mediaId,
              this.size,
              this.original
            );
            fireEvent(this, "change");
          }
        }
      },
    });
  };

  static get styles() {
    return [
      haStyle,
      css`
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
          transition: opacity 0.3s;
          opacity: var(--picture-opacity, 1);
        }
        img:hover {
          opacity: 1;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-picture-upload": HaPictureUpload;
  }
}
