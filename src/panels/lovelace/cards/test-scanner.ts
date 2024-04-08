import "@material/mwc-ripple";
import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators";
import "../../../components/ha-card";
import { HomeAssistant } from "../../../types";
import { addExternalBarCodeListener } from "../../../external_app/external_app_entrypoint";

@customElement("test-scanner-card")
export class TestScannerCard extends LitElement {
  public hass!: HomeAssistant;

  @state() private _result: string[] = [];

  private _removeListener?: () => void;

  public getCardSize(): number {
    return 4;
  }

  public setConfig(_config): void {}

  protected render() {
    if (!this.hass.auth.external?.config.hasBarCodeScanner) {
      return html`
        <ha-card>
          <div class="card-content">
            Barcode scanner not available, use a mobile app that has barcode
            scanning support.
          </div>
        </ha-card>
      `;
    }

    return html`
      <ha-card>
        <div class="card-content"><pre>${this._result.join("\r\n")}</pre></div>
        <div class="card-actions">
          <mwc-button @click=${this._openScanner}>Open scanner</mwc-button>
        </div>
      </ha-card>
    `;
  }

  private _openScanner() {
    this._removeListener = addExternalBarCodeListener((msg) => {
      if (msg.command === "bar_code/scan_result") {
        this._result = [
          ...this._result,
          `Result: ${JSON.stringify(msg.payload)}`,
        ];
        if (msg.payload.format !== "qr_code") {
          this._notifyScanner(
            `Wrong barcode scanned! ${msg.payload.format}: ${msg.payload.rawValue}, we need a QR code.`
          );
        } else {
          this._closeScanner();
        }
      } else if (msg.command === "bar_code/aborted") {
        this._removeListener!();
        this._result = [
          ...this._result,
          `Aborted: ${JSON.stringify(msg.payload)}`,
        ];
      }
      return true;
    });
    this.hass.auth.external!.fireMessage({
      type: "bar_code/scan",
      payload: {
        title: "Scan test barcode",
        description: "Scan a barcode to test the scanner.",
        alternative_option_label: "Click to manually enter the test barcode",
      },
    });
  }

  private _closeScanner() {
    this._removeListener!();
    this.hass.auth.external!.fireMessage({
      type: "bar_code/close",
    });
  }

  private _notifyScanner(message: string) {
    this.hass.auth.external!.fireMessage({
      type: "bar_code/notify",
      payload: {
        message,
      },
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "test-scanner-card": TestScannerCard;
  }
}
