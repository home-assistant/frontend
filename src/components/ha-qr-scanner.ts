import "@material/mwc-button/mwc-button";
import { mdiCamera } from "@mdi/js";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing, PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import type QrScanner from "qr-scanner";
import { fireEvent } from "../common/dom/fire_event";
import { stopPropagation } from "../common/dom/stop_propagation";
import { LocalizeFunc } from "../common/translations/localize";
import { addExternalBarCodeListener } from "../external_app/external_app_entrypoint";
import { HomeAssistant } from "../types";
import "./ha-alert";
import "./ha-button-menu";
import "./ha-list-item";
import "./ha-textfield";
import type { HaTextField } from "./ha-textfield";

@customElement("ha-qr-scanner")
class HaQrScanner extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public localize!: LocalizeFunc;

  @property() public description?: string;

  @property({ attribute: "alternative_option_label" })
  public alternativeOptionLabel?: string;

  @property() public error?: string;

  @state() private _cameras?: QrScanner.Camera[];

  @state() private _manual = false;

  private _qrScanner?: QrScanner;

  private _qrNotFoundCount = 0;

  private _removeListener?: UnsubscribeFunc;

  @query("video", true) private _video?: HTMLVideoElement;

  @query("#canvas-container", true) private _canvasContainer?: HTMLDivElement;

  @query("ha-textfield") private _manualInput?: HaTextField;

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._qrNotFoundCount = 0;
    if (this._nativeBarcodeScanner) {
      this._closeExternalScanner();
    }
    if (this._qrScanner) {
      this._qrScanner.stop();
      this._qrScanner.destroy();
      this._qrScanner = undefined;
    }
    while (this._canvasContainer?.lastChild) {
      this._canvasContainer.removeChild(this._canvasContainer.lastChild);
    }
  }

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated) {
      this._loadQrScanner();
    }
  }

  protected firstUpdated() {
    this._loadQrScanner();
  }

  protected updated(changedProps: PropertyValues) {
    if (changedProps.has("error") && this.error) {
      alert(`error: ${this.error}`);
      this._notifyExternalScanner(this.error);
    }
  }

  protected render() {
    if (this._nativeBarcodeScanner && !this._manual) {
      return nothing;
    }

    return html`${this.error
      ? html`<ha-alert alert-type="error">${this.error}</ha-alert>`
      : ""}
    ${navigator.mediaDevices && !this._manual
      ? html`<video></video>
          <div id="canvas-container">
            ${this._cameras && this._cameras.length > 1
              ? html`<ha-button-menu fixed @closed=${stopPropagation}>
                  <ha-icon-button
                    slot="trigger"
                    .label=${this.localize(
                      "ui.components.qr-scanner.select_camera"
                    )}
                    .path=${mdiCamera}
                  ></ha-icon-button>
                  ${this._cameras!.map(
                    (camera) => html`
                      <ha-list-item
                        .value=${camera.id}
                        @click=${this._cameraChanged}
                      >
                        ${camera.label}
                      </ha-list-item>
                    `
                  )}
                </ha-button-menu>`
              : nothing}
          </div>`
      : html`${this._manual
            ? nothing
            : html`<ha-alert alert-type="warning">
                ${!window.isSecureContext
                  ? this.localize(
                      "ui.components.qr-scanner.only_https_supported"
                    )
                  : this.localize("ui.components.qr-scanner.not_supported")}
              </ha-alert>`}
          <p>${this.localize("ui.components.qr-scanner.manual_input")}</p>
          <div class="row">
            <ha-textfield
              .label=${this.localize("ui.components.qr-scanner.enter_qr_code")}
              @keyup=${this._manualKeyup}
              @paste=${this._manualPaste}
            ></ha-textfield>
            <mwc-button @click=${this._manualSubmit}>
              ${this.localize("ui.common.submit")}
            </mwc-button>
          </div>`}`;
  }

  private get _nativeBarcodeScanner(): boolean {
    return Boolean(this.hass.auth.external?.config.hasBarCodeScanner);
  }

  private async _loadQrScanner() {
    if (this._nativeBarcodeScanner) {
      this._openExternalScanner();
      return;
    }
    if (!navigator.mediaDevices) {
      return;
    }
    const QrScanner = (await import("qr-scanner")).default;
    if (!(await QrScanner.hasCamera())) {
      this._reportError("No camera found");
      return;
    }
    QrScanner.WORKER_PATH = "/static/js/qr-scanner-worker.min.js";
    this._listCameras(QrScanner);
    this._qrScanner = new QrScanner(
      this._video!,
      this._qrCodeScanned,
      this._qrCodeError
    );
    // @ts-ignore
    const canvas = this._qrScanner.$canvas;
    this._canvasContainer!.appendChild(canvas);
    canvas.style.display = "block";
    try {
      await this._qrScanner.start();
    } catch (err: any) {
      this._reportError(err);
    }
  }

  private async _listCameras(qrScanner: typeof QrScanner): Promise<void> {
    this._cameras = await qrScanner.listCameras(true);
  }

  private _qrCodeError = (err: any) => {
    if (err === "No QR code found") {
      this._qrNotFoundCount++;
      if (this._qrNotFoundCount === 250) {
        this._reportError(err);
      }
      return;
    }
    this._reportError(err.message || err);
    // eslint-disable-next-line no-console
    console.log(err);
  };

  private _qrCodeScanned = (qrCodeString: string): void => {
    this._qrNotFoundCount = 0;
    fireEvent(this, "qr-code-scanned", { value: qrCodeString });
  };

  private _manualKeyup(ev: KeyboardEvent) {
    if (ev.key === "Enter") {
      this._qrCodeScanned((ev.target as HaTextField).value);
    }
  }

  private _manualPaste(ev: ClipboardEvent) {
    this._qrCodeScanned(
      // @ts-ignore
      (ev.clipboardData || window.clipboardData).getData("text")
    );
  }

  private _manualSubmit() {
    this._qrCodeScanned(this._manualInput!.value);
  }

  private _cameraChanged(ev: CustomEvent): void {
    this._qrScanner?.setCamera((ev.target as any).value);
  }

  private _openExternalScanner() {
    this._removeListener = addExternalBarCodeListener((msg) => {
      if (msg.command === "bar_code/scan_result") {
        if (msg.payload.format !== "qr_code") {
          this._notifyExternalScanner(
            `Wrong barcode scanned! ${msg.payload.format}: ${msg.payload.rawValue}, we need a QR code.`
          );
        } else {
          this._qrCodeScanned(msg.payload.rawValue);
        }
      } else if (msg.command === "bar_code/aborted") {
        this._closeExternalScanner();
        if (msg.payload.reason === "canceled") {
          fireEvent(this, "qr-code-closed");
        } else {
          this._manual = true;
        }
      }
      return true;
    });
    this.hass.auth.external!.fireMessage({
      type: "bar_code/scan",
      payload: {
        title: this.title || "Scan QR code",
        description: this.description || "Scan a barcode.",
        alternative_option_label:
          this.alternativeOptionLabel || "Click to manually enter the barcode",
      },
    });
  }

  private _closeExternalScanner() {
    this._removeListener?.();
    this._removeListener = undefined;
    this.hass.auth.external!.fireMessage({
      type: "bar_code/close",
    });
  }

  private _notifyExternalScanner(message: string) {
    if (!this.hass.auth.external) {
      return;
    }
    this.hass.auth.external.fireMessage({
      type: "bar_code/notify",
      payload: {
        message,
      },
    });
    this.error = undefined;
  }

  private _reportError(message: string) {
    fireEvent(this, "qr-code-error", { message });
  }

  static styles = css`
    canvas {
      width: 100%;
    }
    #canvas-container {
      position: relative;
    }
    ha-button-menu {
      position: absolute;
      bottom: 8px;
      right: 8px;
      inset-inline-end: 8px;
      inset-inline-start: initial;
      background: #727272b2;
      color: white;
      border-radius: 50%;
    }
    .row {
      display: flex;
      align-items: center;
    }
    ha-textfield {
      flex: 1;
      margin-right: 8px;
      margin-inline-end: 8px;
      margin-inline-start: initial;
    }
  `;
}

declare global {
  // for fire event
  interface HASSDomEvents {
    "qr-code-scanned": { value: string };
    "qr-code-error": { message: string };
    "qr-code-closed": undefined;
  }

  interface HTMLElementTagNameMap {
    "ha-qr-scanner": HaQrScanner;
  }
}
