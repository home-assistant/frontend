import Cropper from "cropperjs";
// @ts-ignore
import cropperCss from "cropperjs/dist/cropper.css";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing, unsafeCSS } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import "../../components/ha-button";
import "../../components/ha-dialog";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import type { HaImageCropperDialogParams } from "./show-image-cropper-dialog";

@customElement("image-cropper-dialog")
export class HaImagecropperDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: HaImageCropperDialogParams;

  @state() private _open = false;

  @query("img", true) private _image!: HTMLImageElement;

  private _cropper?: Cropper;

  @state() private _isTargetAspectRatio?: boolean;

  public showDialog(params: HaImageCropperDialogParams): void {
    this._params = params;
    this._open = true;
  }

  public closeDialog() {
    this._open = false;
    this._params = undefined;
    this._cropper?.destroy();
    this._cropper = undefined;
    this._isTargetAspectRatio = false;
  }

  protected updated(changedProperties: PropertyValues) {
    if (!changedProperties.has("_params") || !this._params) {
      return;
    }
    if (!this._cropper) {
      this._image.src = URL.createObjectURL(this._params.file);
      this._cropper = new Cropper(this._image, {
        aspectRatio: this._params.options.aspectRatio,
        viewMode: 1,
        dragMode: "move",
        minCropBoxWidth: 50,
        ready: () => {
          this._isTargetAspectRatio = this._checkMatchAspectRatio();
          URL.revokeObjectURL(this._image!.src);
        },
      });
    } else {
      this._cropper.replace(URL.createObjectURL(this._params.file));
    }
  }

  private _checkMatchAspectRatio(): boolean {
    const targetRatio = this._params?.options.aspectRatio;
    if (!targetRatio) {
      return true;
    }
    const imageData = this._cropper!.getImageData();
    if (imageData.aspectRatio === targetRatio) {
      return true;
    }

    // If the image is not exactly the aspect ratio see if it is within a pixel.
    if (imageData.naturalWidth > imageData.naturalHeight) {
      const targetHeight = imageData.naturalWidth / targetRatio;
      return Math.abs(targetHeight - imageData.naturalHeight) <= 1;
    }
    const targetWidth = imageData.naturalHeight * targetRatio;
    return Math.abs(targetWidth - imageData.naturalWidth) <= 1;
  }

  protected render(): TemplateResult {
    return html`<ha-dialog
      @closed=${this.closeDialog}
      scrimClickAction
      escapeKeyAction
      .open=${this._open}
    >
      <div
        class="container ${classMap({
          round: Boolean(this._params?.options.round),
        })}"
      >
        <img alt=${this.hass.localize("ui.dialogs.image_cropper.crop_image")} />
      </div>
      <ha-button
        appearance="plain"
        slot="primaryAction"
        @click=${this.closeDialog}
      >
        ${this.hass.localize("ui.common.cancel")}
      </ha-button>
      ${this._isTargetAspectRatio
        ? html`<ha-button
            appearance="plain"
            slot="primaryAction"
            @click=${this._useOriginal}
          >
            ${this.hass.localize("ui.dialogs.image_cropper.use_original")}
          </ha-button>`
        : nothing}

      <ha-button slot="primaryAction" @click=${this._cropImage}>
        ${this.hass.localize("ui.dialogs.image_cropper.crop")}
      </ha-button>
    </ha-dialog>`;
  }

  private _cropImage() {
    this._cropper!.getCroppedCanvas().toBlob(
      (blob) => {
        if (!blob) {
          return;
        }
        const file = new File([blob], this._params!.file.name, {
          type: this._params!.options.type || this._params!.file.type,
        });
        this._params!.croppedCallback(file);
        this.closeDialog();
      },
      this._params!.options.type || this._params!.file.type,
      this._params!.options.quality
    );
  }

  private _useOriginal() {
    this._params!.croppedCallback(this._params!.file);
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ${unsafeCSS(cropperCss)}
        .container {
          max-width: 640px;
        }
        img {
          max-width: 100%;
        }
        .container.round .cropper-view-box,
        .container.round .cropper-face {
          border-radius: var(--ha-border-radius-circle);
        }
        .cropper-line,
        .cropper-point,
        .cropper-point.point-se::before {
          background-color: var(--primary-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "image-cropper-dialog": HaImagecropperDialog;
  }
}
