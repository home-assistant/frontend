import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import QRCode from "qrcode";
import "./ha-alert";
import { rgb2hex } from "../common/color/convert-color";
import {
  getContrastedColorHex,
  getRGBContrastRatio,
} from "../common/color/rgb";

// Minimum contrast ratio (WCAG non-text minimum) below which we substitute a
// legible foreground so the QR code never renders unscannable.
const MIN_CONTRAST_RATIO = 3;

const parseRgbVariable = (
  value: string
): [number, number, number] | undefined => {
  const parts = value.split(",").map((part) => parseInt(part, 10));
  return parts.length === 3 && parts.every((part) => !Number.isNaN(part))
    ? (parts as [number, number, number])
    : undefined;
};

@customElement("ha-qr-code")
export class HaQrCode extends LitElement {
  @property() public data?: string;

  @property({ attribute: "error-correction-level" })
  public errorCorrectionLevel: "low" | "medium" | "quartile" | "high" =
    "medium";

  @property({ type: Number })
  public width = 4;

  @property({ type: Number })
  public scale = 4;

  @property({ type: Number })
  public margin = 4;

  @property({ attribute: false })
  public maskPattern?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

  @property({ attribute: "center-image" }) public centerImage?: string;

  @state() private _error?: string;

  @query("canvas") private _canvas?: HTMLCanvasElement;

  protected willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);
    if (
      (changedProperties.has("data") ||
        changedProperties.has("scale") ||
        changedProperties.has("width") ||
        changedProperties.has("margin") ||
        changedProperties.has("maskPattern") ||
        changedProperties.has("errorCorrectionLevel")) &&
      this._error
    ) {
      this._error = undefined;
    }
  }

  updated(changedProperties: PropertyValues<this>) {
    const canvas = this._canvas;
    if (
      canvas &&
      this.data &&
      (changedProperties.has("data") ||
        changedProperties.has("scale") ||
        changedProperties.has("width") ||
        changedProperties.has("margin") ||
        changedProperties.has("maskPattern") ||
        changedProperties.has("errorCorrectionLevel") ||
        changedProperties.has("centerImage"))
    ) {
      const computedStyles = getComputedStyle(this);
      const textRgb = parseRgbVariable(
        computedStyles.getPropertyValue("--rgb-primary-text-color")
      );
      const backgroundRgb = parseRgbVariable(
        computedStyles.getPropertyValue("--rgb-card-background-color")
      );

      const backgroundHex = backgroundRgb ? rgb2hex(backgroundRgb) : "#ffffff";
      let textHex = textRgb ? rgb2hex(textRgb) : "#000000";

      // If the theme colors are missing/invalid or don't contrast enough, the
      // QR code would be unscannable (e.g. white-on-white). Fall back to a
      // foreground guaranteed to contrast the resolved background.
      if (
        !textRgb ||
        !backgroundRgb ||
        getRGBContrastRatio(textRgb, backgroundRgb) < MIN_CONTRAST_RATIO
      ) {
        textHex = getContrastedColorHex(backgroundHex);
      }

      QRCode.toCanvas(canvas, this.data, {
        errorCorrectionLevel:
          this.errorCorrectionLevel || (this.centerImage ? "Q" : "M"),
        width: this.width,
        scale: this.scale,
        margin: this.margin,
        maskPattern: this.maskPattern,
        color: {
          light: backgroundHex,
          dark: textHex,
        },
      }).catch((err) => {
        this._error = err.message;
      });

      if (this.centerImage) {
        const context = this._canvas!.getContext("2d");
        const imageObj = new Image();
        imageObj.src = this.centerImage;
        imageObj.onload = () => {
          context?.drawImage(
            imageObj,
            canvas.width * 0.375,
            canvas.height * 0.375,
            canvas.width / 4,
            canvas.height / 4
          );
        };
      }
    }
  }

  render() {
    if (!this.data) {
      return nothing;
    }
    if (this._error) {
      return html`<ha-alert alert-type="error">${this._error}</ha-alert>`;
    }
    return html`<canvas></canvas>`;
  }

  static styles = css`
    :host {
      display: block;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-qr-code": HaQrCode;
  }
}
