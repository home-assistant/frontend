import "@material/mwc-button/mwc-button";
import Cropper from "cropperjs";
// @ts-ignore
import cropperCss from "cropperjs/dist/cropper.css";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
  unsafeCSS,
} from "lit";
import { customElement, property, state, query } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import "../../components/ha-dialog";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import { HaImageCropperDialogParams } from "./show-image-cropper-dialog";

@customElement("image-cropper-dialog")
export class HaImagecropperDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: HaImageCropperDialogParams;

  @state() private _open = false;

  @query("img", true) private _image!: HTMLImageElement;

  private _cropper?: Cropper;

  public showDialog(params: HaImageCropperDialogParams): void {
    this._params = params;
    this._open = true;
  }

  public closeDialog() {
    this._open = false;
    this._params = undefined;
    this._cropper?.destroy();
    this._cropper = undefined;
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
      <div
        class="container ${classMap({
          round: Boolean(this._params?.options.round),
        })}"
      >
        <img alt=${this.hass.localize("ui.dialogs.image_cropper.crop_image")} />
      </div>
      <mwc-button slot="secondaryAction" @click=${this.closeDialog}>
        ${this.hass.localize("ui.common.cancel")}
      </mwc-button>
      <mwc-button slot="primaryAction" @click=${this._cropImage}>
        ${this.hass.localize("ui.dialogs.image_cropper.crop")}
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
          type: this._params!.options.type || this._params!.file.type,
        });
        this._params!.croppedCallback(file);
        this.closeDialog();
      },
      this._params!.options.type || this._params!.file.type,
      this._params!.options.quality
    );
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
          border-radius: 50%;
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
