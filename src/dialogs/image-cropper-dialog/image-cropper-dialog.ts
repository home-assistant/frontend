import type { ContextType } from "@lit/context";
import "cropperjs";
import type {
  CropperCanvas,
  CropperGrid,
  CropperHandle,
  CropperImage,
  CropperSelection,
  CropperShade,
} from "cropperjs";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { styleMap } from "lit/directives/style-map";
import { consume } from "../../common/decorators/consume";
import "../../components/ha-button";
import "../../components/ha-dialog-footer";
import "../../components/ha-dialog";
import { internationalizationContext } from "../../data/context";
import { DirtyStateProviderMixin } from "../../mixins/dirty-state-provider-mixin";
import { haStyleDialog } from "../../resources/styles";
import { DialogMixin } from "../dialog-mixin";
import type { HaImageCropperDialogParams } from "./show-image-cropper-dialog";

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MIN_SELECTION_SIZE = 50;

const INITIAL_COVERAGE = 0.8;

const EPSILON = 0.05;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const contains = (outer: Rect, inner: Rect): boolean =>
  inner.x >= outer.x - EPSILON &&
  inner.y >= outer.y - EPSILON &&
  inner.x + inner.width <= outer.x + outer.width + EPSILON &&
  inner.y + inner.height <= outer.y + outer.height + EPSILON;

const intersect = (a: Rect, b: Rect): Rect => {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  return {
    x,
    y,
    width: Math.min(a.x + a.width, b.x + b.width) - x,
    height: Math.min(a.y + a.height, b.y + b.height) - y,
  };
};

const scaleRect = ({ x, y, width, height }: Rect, ratio: number): Rect => ({
  x: x * ratio,
  y: y * ratio,
  width: width * ratio,
  height: height * ratio,
});

@customElement("image-cropper-dialog")
export class HaImagecropperDialog extends DirtyStateProviderMixin<Rect>()(
  DialogMixin<HaImageCropperDialogParams>(LitElement)
) {
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @query("cropper-image") private _image?: CropperImage;

  @query("cropper-selection") private _selection?: CropperSelection;

  @state() private _imageSize?: { width: number; height: number };

  @state() private _shown = false;

  @state() private _cropReady = false;

  @state() private _isTargetAspectRatio?: boolean;

  private _imageUrl?: string;

  private _resizeObserver?: ResizeObserver;

  private _canvasWidth?: number;

  private _refitting = false;

  private _cropped = false;

  private _closing = false;

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    if (!this._cropped) {
      this.params?.cancelCallback?.();
    }
    if (this._imageUrl) {
      URL.revokeObjectURL(this._imageUrl);
      this._imageUrl = undefined;
    }
    this._resizeObserver?.disconnect();
    this._resizeObserver = undefined;
  }

  protected firstUpdated() {
    if (!this.params) {
      return;
    }
    this._imageUrl = URL.createObjectURL(this.params.file);
    this._loadImageSize(this._imageUrl);
  }

  private async _loadImageSize(url: string) {
    const image = new Image();
    image.src = url;
    try {
      await image.decode();
    } catch {
      return;
    }
    if (!this.isConnected) {
      return;
    }
    this._imageSize = {
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
    this._isTargetAspectRatio = this._checkMatchAspectRatio(
      image.naturalWidth,
      image.naturalHeight
    );
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (
      !this._cropReady &&
      (changedProps.has("_imageSize") || changedProps.has("_shown")) &&
      this._image
    ) {
      this._initCropper(this._image);
    }
  }

  private async _initCropper(image: CropperImage) {
    try {
      await image.$ready();
    } catch {
      return;
    }
    if (!this.isConnected || image !== this._image) {
      return;
    }
    const selection = this._selection!;
    if (!selection.width) {
      await new Promise<void>((resolve) => {
        selection.addEventListener("change", () => resolve(), { once: true });
      });
      if (!this.isConnected || image !== this._image) {
        return;
      }
    }
    this._initDirtyTracking(
      { type: "deep" },
      this._cropData(this._selectionRect(), this._imageRect())
    );
    this._cropReady = true;
    this._resizeObserver = new ResizeObserver((entries) => {
      this._refit(entries[0].contentRect);
    });
    this._resizeObserver.observe(image.parentElement!);
  }

  private _selectionRect(): Rect {
    const { x, y, width, height } = this._selection!;
    return { x, y, width, height };
  }

  private _canvasRect(): Rect {
    const { width, height } =
      this._image!.parentElement!.getBoundingClientRect();
    return { x: 0, y: 0, width, height };
  }

  private _imageRect(): Rect {
    const canvasRect = this._image!.parentElement!.getBoundingClientRect();
    const imageRect = this._image!.getBoundingClientRect();
    return {
      x: imageRect.x - canvasRect.x,
      y: imageRect.y - canvasRect.y,
      width: imageRect.width,
      height: imageRect.height,
    };
  }

  private _cropData(selection: Rect, image: Rect): Rect {
    const scale = image.width / this._imageSize!.width;
    return {
      x: Math.round((selection.x - image.x) / scale),
      y: Math.round((selection.y - image.y) / scale),
      width: Math.round(selection.width / scale),
      height: Math.round(selection.height / scale),
    };
  }

  private _refit(canvas: { width: number; height: number }) {
    const previous = this._canvasWidth;
    this._canvasWidth = canvas.width;
    if (!previous || !canvas.width || previous === canvas.width) {
      return;
    }
    const current = this._selectionRect();
    const ratio = Math.min(
      canvas.width / previous,
      canvas.height / current.height
    );
    const image = scaleRect(this._imageRect(), ratio);
    const selection = scaleRect(current, ratio);
    const dy =
      image.height <= canvas.height
        ? (canvas.height - image.height) / 2 - image.y
        : clamp(
            0,
            -selection.y,
            canvas.height - selection.y - selection.height
          );
    image.y += dy;
    selection.y += dy;
    const { width, height } = this._imageSize!;
    this._refitting = true;
    this._image!.$setTransform(
      image.width / width,
      0,
      0,
      image.height / height,
      image.x + image.width / 2 - width / 2,
      image.y + image.height / 2 - height / 2
    );
    this._selection!.$change(
      selection.x,
      selection.y,
      selection.width,
      selection.height
    );
    this._refitting = false;
  }

  private _checkMatchAspectRatio(
    naturalWidth: number,
    naturalHeight: number
  ): boolean {
    const targetRatio = this.params?.options.aspectRatio;
    if (!targetRatio) {
      return true;
    }
    if (naturalWidth / naturalHeight === targetRatio) {
      return true;
    }

    // If the image is not exactly the aspect ratio see if it is within a pixel.
    if (naturalWidth > naturalHeight) {
      const targetHeight = naturalWidth / targetRatio;
      return Math.abs(targetHeight - naturalHeight) <= 1;
    }
    const targetWidth = naturalHeight * targetRatio;
    return Math.abs(targetWidth - naturalWidth) <= 1;
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this.params) {
      return nothing;
    }

    const label = this._i18n.localize("ui.dialogs.image_cropper.crop_image");

    return html`
      <ha-dialog
        open
        header-title=${label}
        .preventScrimClose=${this.isDirtyState}
        @wa-hide=${this._handleHide}
        @after-show=${this._handleAfterShow}
      >
        <div
          class="container ${classMap({
            round: Boolean(this.params.options.round),
          })}"
        >
          ${
            this._imageSize && this._shown
              ? html`
                  <cropper-canvas
                    background
                    style=${styleMap({
                      aspectRatio: `${this._imageSize.width} / ${this._imageSize.height}`,
                    })}
                  >
                    <cropper-image
                      src=${this._imageUrl!}
                      alt=${label}
                      scalable
                      translatable
                      @change=${this._handleImageChange}
                    ></cropper-image>
                    <cropper-shade hidden></cropper-shade>
                    <cropper-handle action="move" plain></cropper-handle>
                    <cropper-selection
                      aspect-ratio=${ifDefined(
                        this.params.options.aspectRatio || undefined
                      )}
                      initial-coverage=${INITIAL_COVERAGE}
                      precise
                      movable
                      resizable
                      outlined
                      @change=${this._handleSelectionChange}
                    >
                      <cropper-grid role="grid" bordered covered></cropper-grid>
                      <cropper-handle action="move" plain></cropper-handle>
                      <cropper-handle action="n-resize"></cropper-handle>
                      <cropper-handle action="e-resize"></cropper-handle>
                      <cropper-handle action="s-resize"></cropper-handle>
                      <cropper-handle action="w-resize"></cropper-handle>
                      <cropper-handle action="ne-resize"></cropper-handle>
                      <cropper-handle action="nw-resize"></cropper-handle>
                      <cropper-handle action="se-resize"></cropper-handle>
                      <cropper-handle action="sw-resize"></cropper-handle>
                    </cropper-selection>
                  </cropper-canvas>
                `
              : nothing
          }
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
                    ${this._i18n.localize("ui.dialogs.image_cropper.use_original")}
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

  private _handleAfterShow() {
    this._shown = true;
  }

  private _handleHide(ev: Event) {
    if (ev.eventPhase !== Event.AT_TARGET || ev.defaultPrevented) {
      return;
    }
    this._closing = true;
  }

  private _handleSelectionChange(ev: CustomEvent<Rect>) {
    if (!this._cropReady || this._refitting) {
      return;
    }
    const selection = this._selection!;
    const image = this._imageRect();
    const next = ev.detail;
    if (
      (next.width < MIN_SELECTION_SIZE && next.width < selection.width) ||
      !contains(intersect(image, this._canvasRect()), next)
    ) {
      ev.preventDefault();
      return;
    }
    this._updateDirtyState(this._cropData(next, image));
  }

  private _handleImageChange(ev: CustomEvent<Rect>) {
    if (!this._cropReady || this._refitting) {
      return;
    }
    const selection = this._selectionRect();
    if (!contains(ev.detail, selection)) {
      ev.preventDefault();
      return;
    }
    this._updateDirtyState(this._cropData(selection, ev.detail));
  }

  private async _cropImage() {
    const selection = this._selection;
    if (!selection || !this._cropReady) {
      return;
    }
    const image = this._imageRect();
    const rect = this._selectionRect();
    const x = clamp(rect.x, image.x, image.x + image.width - rect.width);
    const y = clamp(rect.y, image.y, image.y + image.height - rect.height);
    if (x !== rect.x || y !== rect.y) {
      selection.$change(x, y);
    }
    const crop = this._cropData(this._selectionRect(), image);
    let canvas: HTMLCanvasElement;
    try {
      canvas = await selection.$toCanvas({
        width: crop.width,
        beforeDraw: (_context, target) => {
          target.height = crop.height;
        },
      });
    } catch {
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
        .container {
          max-width: 640px;
        }
        cropper-canvas {
          width: 100%;
          direction: ltr;
          --theme-color: var(--primary-color);
        }
        cropper-handle {
          --theme-color: var(--primary-color);
        }
        .container.round cropper-selection,
        .container.round cropper-shade,
        .container.round cropper-grid {
          border-radius: var(--ha-picture-border-radius);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "image-cropper-dialog": HaImagecropperDialog;
    "cropper-canvas": CropperCanvas;
    "cropper-image": CropperImage;
    "cropper-shade": CropperShade;
    "cropper-handle": CropperHandle;
    "cropper-selection": CropperSelection;
    "cropper-grid": CropperGrid;
  }
}
