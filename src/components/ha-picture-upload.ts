import "@material/mwc-icon-button/mwc-icon-button";
import { mdiClose, mdiImagePlus } from "@mdi/js";
import "@polymer/iron-input/iron-input";
import "@polymer/paper-input/paper-input-container";
import {
  css,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import { fireEvent } from "../common/dom/fire_event";
import { createImage, generateImageThumbnailUrl } from "../data/image";
import { HomeAssistant } from "../types";
import "./ha-circular-progress";
import "./ha-svg-icon";
import {
  showImageCropperDialog,
  CropOptions,
} from "../dialogs/image-cropper-dialog/show-image-cropper-dialog";

@customElement("ha-picture-upload")
export class HaPictureUpload extends LitElement {
  public hass!: HomeAssistant;

  @property() public value: string | null = null;

  @property() public label?: string;

  @property({ type: Boolean }) public crop = false;

  @property({ attribute: false }) public cropOptions?: CropOptions;

  @property({ type: Number }) public size = 512;

  @internalProperty() private _error = "";

  @internalProperty() private _uploading = false;

  @internalProperty() private _drag = false;

  protected updated(changedProperties: PropertyValues) {
    if (changedProperties.has("_drag")) {
      (this.shadowRoot!.querySelector(
        "paper-input-container"
      ) as any)._setFocused(this._drag);
    }
  }

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
            <label for="input">
              <paper-input-container
                .alwaysFloatLabel=${Boolean(this.value)}
                @drop=${this._handleDrop}
                @dragenter=${this._handleDragStart}
                @dragover=${this._handleDragStart}
                @dragleave=${this._handleDragEnd}
                @dragend=${this._handleDragEnd}
                class=${classMap({
                  dragged: this._drag,
                })}
              >
                <label for="input" slot="label">
                  ${this.label ||
                  this.hass.localize("ui.components.picture-upload.label")}
                </label>
                <iron-input slot="input">
                  <input
                    id="input"
                    type="file"
                    class="file"
                    accept="image/png, image/jpeg, image/gif"
                    @change=${this._handleFilePicked}
                  />
                  ${this.value ? html`<img .src=${this.value} />` : ""}
                </iron-input>
                ${this.value
                  ? html`<mwc-icon-button
                      slot="suffix"
                      @click=${this._clearPicture}
                    >
                      <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
                    </mwc-icon-button>`
                  : html`<mwc-icon-button slot="suffix">
                      <ha-svg-icon .path=${mdiImagePlus}></ha-svg-icon>
                    </mwc-icon-button>`}
              </paper-input-container>
            </label>
          `}
    `;
  }

  private _handleDrop(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    if (ev.dataTransfer?.files) {
      if (this.crop) {
        this._cropFile(ev.dataTransfer.files[0]);
      } else {
        this._uploadFile(ev.dataTransfer.files[0]);
      }
    }
    this._drag = false;
  }

  private _handleDragStart(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    this._drag = true;
  }

  private _handleDragEnd(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    this._drag = false;
  }

  private async _handleFilePicked(ev) {
    if (this.crop) {
      this._cropFile(ev.target.files[0]);
    } else {
      this._uploadFile(ev.target.files[0]);
    }
  }

  private async _cropFile(file: File) {
    if (!["image/png", "image/jpeg", "image/gif"].includes(file.type)) {
      this._error = this.hass.localize(
        "ui.components.picture-upload.unsupported_format"
      );
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
      this._error = this.hass.localize(
        "ui.components.picture-upload.unsupported_format"
      );
      return;
    }
    this._uploading = true;
    this._error = "";
    try {
      const media = await createImage(this.hass, file);
      this.value = generateImageThumbnailUrl(media.id, this.size);
      fireEvent(this, "change");
    } catch (err) {
      this._error = err.toString();
    } finally {
      this._uploading = false;
    }
  }

  private _clearPicture(ev: Event) {
    ev.preventDefault();
    this.value = null;
    this._error = "";
    fireEvent(this, "change");
  }

  static get styles() {
    return css`
      .error {
        color: var(--error-color);
      }
      paper-input-container {
        position: relative;
        padding: 8px;
        margin: 0 -8px;
      }
      paper-input-container.dragged:before {
        position: var(--layout-fit_-_position);
        top: var(--layout-fit_-_top);
        right: var(--layout-fit_-_right);
        bottom: var(--layout-fit_-_bottom);
        left: var(--layout-fit_-_left);
        background: currentColor;
        content: "";
        opacity: var(--dark-divider-opacity);
        pointer-events: none;
        border-radius: 4px;
      }
      img {
        max-width: 125px;
        max-height: 125px;
      }
      input.file {
        display: none;
      }
      mwc-icon-button {
        --mdc-icon-button-size: 24px;
        --mdc-icon-size: 20px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-picture-upload": HaPictureUpload;
  }
}
