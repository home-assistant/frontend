import { mdiCamera } from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
// The BarcodeDetector Web API is not yet supported in all browsers,
// and "qr-scanner" defaults to a suboptimal implementation if it is not available.
// The following import makes a better implementation available that is based on a
// WebAssembly port of ZXing:
import { prepareZXingModule } from "barcode-detector";
import type QrScanner from "qr-scanner";
import { fireEvent } from "../common/dom/fire_event";
import { stopPropagation } from "../common/dom/stop_propagation";
import { addExternalBarCodeListener } from "../external_app/external_app_entrypoint";
import type { HomeAssistant } from "../types";
import "./ha-alert";
import "./ha-button";
import "./ha-button-menu";
import "./ha-list-item";
import "./ha-spinner";
import "./ha-textfield";
import type { HaTextField } from "./ha-textfield";

prepareZXingModule({
  overrides: {
    locateFile: (path: string, prefix: string) => {
      if (path.endsWith(".wasm")) {
        return "/static/js/zxing_reader.wasm";
      }
      return prefix + path;
    },
  },
});

@customElement("ha-qr-scanner")
class HaQrScanner extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public description?: string;

  @property({ attribute: "alternative_option_label" })
  public alternativeOptionLabel?: string;

  @property({ attribute: false }) public validate?: (
    value: string
  ) => string | undefined;

  @state() private _cameras?: QrScanner.Camera[];

  @state() private _loading = true;

  @state() private _error?: string;

  @state() private _warning?: string;

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

  protected render() {
    if (this._nativeBarcodeScanner) {
      return nothing;
    }

    return html`${this._error || this._warning
      ? html`<ha-alert
          .alertType=${this._error ? "error" : "warning"}
          class=${this._error ? "" : "warning"}
        >
          ${this._error || this._warning}
          ${this._error
            ? html` <ha-button @click=${this._retry} slot="action">
                ${this.hass.localize("ui.components.qr-scanner.retry")}
              </ha-button>`
            : nothing}
        </ha-alert>`
      : nothing}
    ${navigator.mediaDevices
      ? html`<video></video>
          <div id="canvas-container">
            ${this._loading
              ? html`<div class="loading">
                  <ha-spinner active></ha-spinner>
                </div>`
              : nothing}
            ${!this._loading &&
            !this._error &&
            this._cameras &&
            this._cameras.length > 1
              ? html`<ha-button-menu fixed @closed=${stopPropagation}>
                  <ha-icon-button
                    slot="trigger"
                    .label=${this.hass.localize(
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
      : html`<ha-alert alert-type="warning">
            ${!window.isSecureContext
              ? this.hass.localize(
                  "ui.components.qr-scanner.only_https_supported"
                )
              : this.hass.localize("ui.components.qr-scanner.not_supported")}
          </ha-alert>
          <p>${this.hass.localize("ui.components.qr-scanner.manual_input")}</p>
          <div class="row">
            <ha-textfield
              .label=${this.hass.localize(
                "ui.components.qr-scanner.enter_qr_code"
              )}
              @keyup=${this._manualKeyup}
              @paste=${this._manualPaste}
            ></ha-textfield>
            <ha-button @click=${this._manualSubmit}>
              ${this.hass.localize("ui.common.submit")}
            </ha-button>
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
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const QrScanner = (await import("qr-scanner")).default;
    if (!(await QrScanner.hasCamera())) {
      this._reportError(
        this.hass.localize("ui.components.qr-scanner.no_camera_found")
      );
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
      this._loading = false;
    } catch (err: any) {
      this._reportError(err);
    }
  }

  private async _listCameras(qrScanner: typeof QrScanner): Promise<void> {
    this._cameras = await qrScanner.listCameras(true);
  }

  private _qrCodeError = (err: any) => {
    if (err.endsWith("No QR code found")) {
      this._qrNotFoundCount++;
      if (this._qrNotFoundCount >= 250) {
        this._reportWarning(err);
      }
      return;
    }
    this._reportError(err.message || err);
    // eslint-disable-next-line no-console
    console.log(err);
  };

  private _qrCodeScanned = (qrCodeString: string): void => {
    this._warning = undefined;
    this._qrNotFoundCount = 0;
    if (this.validate) {
      const validationMessage = this.validate(qrCodeString);

      if (validationMessage) {
        this._reportWarning(validationMessage);
        return;
      }
    }

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
            this.hass.localize("ui.components.qr-scanner.wrong_code", {
              format: msg.payload.format,
              rawValue: msg.payload.rawValue,
            })
          );
        } else {
          this._qrCodeScanned(msg.payload.rawValue);
        }
      } else if (msg.command === "bar_code/aborted") {
        this._closeExternalScanner();
        if (msg.payload.reason === "canceled") {
          fireEvent(this, "qr-code-closed");
        } else {
          fireEvent(this, "qr-code-more-options");
        }
      }
      return true;
    });
    this.hass.auth.external!.fireMessage({
      type: "bar_code/scan",
      payload: {
        title:
          this.title ||
          this.hass.localize("ui.components.qr-scanner.app.title"),
        description:
          this.description ||
          this.hass.localize("ui.components.qr-scanner.app.description"),
        alternative_option_label:
          this.alternativeOptionLabel ||
          this.hass.localize(
            "ui.components.qr-scanner.app.alternativeOptionLabel"
          ),
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
    if (!this._nativeBarcodeScanner) {
      return;
    }
    this.hass.auth.external!.fireMessage({
      type: "bar_code/notify",
      payload: {
        message,
      },
    });
    this._warning = undefined;
    this._error = undefined;
  }

  private _reportError(message: string) {
    const canvas = this._qrScanner?.$canvas;
    if (canvas) {
      canvas.style.display = "none";
    }
    this._error = message;
  }

  private _reportWarning(message: string) {
    if (this._nativeBarcodeScanner) {
      this._notifyExternalScanner(message);
    } else {
      this._warning = message;
    }
  }

  private async _retry() {
    if (this._qrScanner) {
      this._loading = true;
      this._error = undefined;
      this._warning = undefined;
      const canvas = this._qrScanner.$canvas;
      canvas.style.display = "block";
      this._qrNotFoundCount = 0;
      await this._qrScanner.start();
      this._loading = false;
    }
  }

  static styles = css`
    :root {
      position: relative;
    }
    canvas {
      width: 100%;
      border-radius: 16px;
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
    .loading {
      display: flex;
      position: absolute;
      align-items: center;
      justify-content: center;
      height: 100%;
      width: 100%;
    }
    ha-alert {
      display: block;
    }
    ha-alert.warning {
      position: absolute;
      z-index: 1;
      background-color: var(--primary-background-color);
      top: 0;
      width: calc(100% - 48px);
    }
  `;
}

declare global {
  // for fire event
  interface HASSDomEvents {
    "qr-code-scanned": { value: string };
    "qr-code-closed": undefined;
    "qr-code-more-options": undefined;
  }

  interface HTMLElementTagNameMap {
    "ha-qr-scanner": HaQrScanner;
  }
}
