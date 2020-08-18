import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
  query,
  unsafeCSS,
  internalProperty,
  PropertyValues,
} from "lit-element";
import "../../components/ha-dialog";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
// @ts-ignore
import cropperCss from "cropperjs/dist/cropper.css";
import Cropper from "cropperjs";
import { HaImageCropperDialogParams } from "./show-image-cropper-dialog";
import "@material/mwc-button/mwc-button";

@customElement("image-cropper-dialog")
export class HaImagecropperDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @internalProperty() private _params?: HaImageCropperDialogParams;

  private _cropper?: Cropper;

  @internalProperty() private _open = false;

  @query("img") private _image!: HTMLImageElement;

  public showDialog(params: HaImageCropperDialogParams): void {
    this._params = params;
    this._open = true;
  }

  public closeDialog() {
    this._open = false;
    this._params = undefined;
    this._cropper?.destroy();
  }

  protected updated(changedProperties: PropertyValues) {
    if (!changedProperties.has("_params") || !this._params) {
      return;
    }
    if (!this._cropper) {
      this._image.src = URL.createObjectURL(this._params.file);
      this._cropper = new Cropper(this._image, {
        aspectRatio: 1,
        viewMode: 1,
        dragMode: "move",
        ready: () => {
          URL.revokeObjectURL(this._image!.src);
        },
      });
    } else {
      this._cropper.replace(URL.createObjectURL(this._params.file));
    }
  }

  protected render(): TemplateResult {
    return html`<ha-dialog
      @closed=${this.closeDialog}
      scrimClickAction
      escapeKeyAction
      .open=${this._open}
    >
      <div class="container">
        <img />
      </div>
      <mwc-button slot="secondaryAction" @click=${this.closeDialog}>
        Cancel
      </mwc-button>
      <mwc-button slot="primaryAction" @click=${this._cropImage}>
        Crop
      </mwc-button>
    </ha-dialog>`;
  }

  private _cropImage() {
    this._cropper!.getCroppedCanvas().toBlob(
      (blob) => {
        if (!blob) {
          return;
        }
        const file = new File([blob], this._params!.file.name, {
          type: "image/jpeg",
        });
        this._params!.croppedCallback(file);
        this.closeDialog();
      },
      "image/jpeg",
      0.95
    );
  }

  static get styles(): CSSResult[] {
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
        .cropper-view-box,
        .cropper-face {
          border-radius: 50%;
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
