import type { ContextType } from "@lit/context";
import Cropper from "cropperjs";
// @ts-ignore
import cropperCss from "cropperjs/dist/cropper.css";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing, unsafeCSS } from "lit";
import { customElement, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { consume } from "../../common/decorators/consume";
import "../../components/ha-button";
import "../../components/ha-dialog-footer";
import "../../components/ha-dialog";
import { internationalizationContext } from "../../data/context";
import { DirtyStateProviderMixin } from "../../mixins/dirty-state-provider-mixin";
import { haStyleDialog } from "../../resources/styles";
import { DialogMixin } from "../dialog-mixin";
import type { HaImageCropperDialogParams } from "./show-image-cropper-dialog";

@customElement("image-cropper-dialog")
export class HaImagecropperDialog extends DirtyStateProviderMixin<Cropper.Data>()(
  DialogMixin<HaImageCropperDialogParams>(LitElement)
) {
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @query("img") private _image!: HTMLImageElement;

  private _cropper?: Cropper;

  @state() private _cropReady = false;

  @state() private _isTargetAspectRatio?: boolean;

  private _cropped = false;

  private _closing = false;

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    if (!this._cropped) {
      this.params?.cancelCallback?.();
    }
    this._cropper?.destroy();
    this._cropper = undefined;
  }

  protected firstUpdated() {
    if (!this.params) {
      return;
    }
    this._image.src = URL.createObjectURL(this.params.file);
    this._cropper = new Cropper(this._image, {
      aspectRatio: this.params.options.aspectRatio,
      viewMode: 1,
      dragMode: "move",
      minCropBoxWidth: 50,
      ready: () => {
        this._isTargetAspectRatio = this._checkMatchAspectRatio();
        URL.revokeObjectURL(this._image!.src);
        this._initDirtyTracking({ type: "deep" }, this._cropper!.getData());
        this._cropReady = true;
      },
      crop: () => {
        if (this._cropReady) {
          this._updateDirtyState(this._cropper!.getData());
        }
      },
    });
  }

  private _checkMatchAspectRatio(): boolean {
    const targetRatio = this.params?.options.aspectRatio;
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

  protected render(): TemplateResult | typeof nothing {
    if (!this.params) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        header-title=${this._i18n.localize(
          "ui.dialogs.image_cropper.crop_image"
        )}
        .preventScrimClose=${this.isDirtyState}
        @wa-hide=${this._handleHide}
      >
        <div
          class="container ${classMap({
            round: Boolean(this.params.options.round),
          })}"
        >
          <img
            alt=${this._i18n.localize("ui.dialogs.image_cropper.crop_image")}
          />
        </div>
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this.closeDialog}
          >
            ${this._i18n.localize("ui.common.cancel")}
          </ha-button>
          ${
            this._isTargetAspectRatio
              ? html`
                  <ha-button
                    slot="secondaryAction"
                    appearance="plain"
                    @click=${this._useOriginal}
                  >
                    ${this._i18n.localize(
                      "ui.dialogs.image_cropper.use_original"
                    )}
                  </ha-button>
                `
              : nothing
          }
          <ha-button
            slot="primaryAction"
            .disabled=${!this._cropReady}
            @click=${this._cropImage}
          >
            ${this._i18n.localize("ui.dialogs.image_cropper.crop")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _handleHide(ev: Event) {
    // Ignore hide events from nested overlays and blocked dismissals.
    if (ev.eventPhase !== Event.AT_TARGET || ev.defaultPrevented) {
      return;
    }
    this._closing = true;
  }

  private _cropImage() {
    const canvas = this._cropper?.getCroppedCanvas();
    if (!canvas) {
      return;
    }
    const params = this.params!;
    canvas.toBlob(
      (blob) => {
        // The dialog may have started closing while the blob was being created.
        if (!blob || this._closing || !this.isConnected) {
          return;
        }
        const file = new File([blob], params.file.name, {
          type: params.options.type || params.file.type,
        });
        this._cropped = true;
        params.croppedCallback(file);
        this.closeDialog();
      },
      params.options.type || params.file.type,
      params.options.quality
    );
  }

  private _useOriginal() {
    this._cropped = true;
    this.params!.croppedCallback(this.params!.file);
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
          border-radius: var(--ha-picture-border-radius);
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
