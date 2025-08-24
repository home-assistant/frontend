import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import QRCode from "qrcode";
import "./ha-alert";
import { rgb2hex } from "../common/color/convert-color";

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

  @property({ attribute: false, type: Number })
  public maskPattern?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

  @property({ attribute: "center-image" }) public centerImage?: string;

  @state() private _error?: string;

  @query("canvas") private _canvas?: HTMLCanvasElement;

  protected willUpdate(changedProperties: PropertyValues): void {
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

  updated(changedProperties: PropertyValues) {
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
      const textColor = computedStyles.getPropertyValue("--primary-text-color");
      const backgroundColor = computedStyles.getPropertyValue(
        "--card-background-color"
      );
      const textHex = rgb2hex(
        textColor
          .split("(")[1]
          .split(")")[0]
          .split(",")
          .map((a) => parseInt(a, 10)) as [number, number, number]
      );
      const backgroundHex = rgb2hex(
        backgroundColor
          .split("(")[1]
          .split(")")[0]
          .split(",")
          .map((a) => parseInt(a, 10)) as [number, number, number]
      );

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
