import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { QRCodeSelector } from "../../data/selector";
import "../ha-qr-code";

@customElement("ha-selector-qr_code")
export class HaSelectorQRCode extends LitElement {
  @property({ attribute: false }) public selector!: QRCodeSelector;

  protected render() {
    return html`<ha-qr-code
      .data=${this.selector.qr_code?.data}
      .scale=${this.selector.qr_code?.scale}
      .errorCorrectionLevel=${this.selector.qr_code?.error_correction_level}
      .centerImage=${this.selector.qr_code?.center_image}
    ></ha-qr-code>`;
  }

  static styles = css`
    ha-qr-code {
      text-align: center;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-qr_code": HaSelectorQRCode;
  }
}
