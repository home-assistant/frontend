import "@material/mwc-button/mwc-button";
import "@material/mwc-list/mwc-list-item";
import { mdiCamera } from "@mdi/js";
import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import type QrScanner from "qr-scanner";
import { fireEvent } from "../common/dom/fire_event";
import { stopPropagation } from "../common/dom/stop_propagation";
import { LocalizeFunc } from "../common/translations/localize";
import "./ha-alert";
import "./ha-button-menu";
import "./ha-textfield";
import type { HaTextField } from "./ha-textfield";

@customElement("ha-qr-scanner")
class HaQrScanner extends LitElement {
  @property() localize!: LocalizeFunc;

  @state() private _cameras?: QrScanner.Camera[];

  @state() private _error?: string;

  private _qrScanner?: QrScanner;

  private _qrNotFoundCount = 0;

  @query("video", true) private _video!: HTMLVideoElement;

  @query("#canvas-container", true) private _canvasContainer!: HTMLDivElement;

  @query("ha-textfield") private _manualInput?: HaTextField;

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._qrNotFoundCount = 0;
    if (this._qrScanner) {
      this._qrScanner.stop();
      this._qrScanner.destroy();
      this._qrScanner = undefined;
    }
    while (this._canvasContainer.lastChild) {
      this._canvasContainer.removeChild(this._canvasContainer.lastChild);
    }
  }

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated && navigator.mediaDevices) {
      this._loadQrScanner();
    }
  }

  protected firstUpdated() {
    if (navigator.mediaDevices) {
      this._loadQrScanner();
    }
  }

  protected updated(changedProps: PropertyValues) {
    if (changedProps.has("_error") && this._error) {
      fireEvent(this, "qr-code-error", { message: this._error });
    }
  }

  protected render(): TemplateResult {
    return html`${this._error
      ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
      : ""}
    ${navigator.mediaDevices
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
                      <mwc-list-item
                        .value=${camera.id}
                        @click=${this._cameraChanged}
                        >${camera.label}</mwc-list-item
                      >
                    `
                  )}
                </ha-button-menu>`
              : ""}
          </div>`
      : html`<ha-alert alert-type="warning">
            ${!window.isSecureContext
              ? this.localize("ui.components.qr-scanner.only_https_supported")
              : this.localize("ui.components.qr-scanner.not_supported")}
          </ha-alert>
          <p>${this.localize("ui.components.qr-scanner.manual_input")}</p>
          <div class="row">
            <ha-textfield
              .label=${this.localize("ui.components.qr-scanner.enter_qr_code")}
              @keyup=${this._manualKeyup}
              @paste=${this._manualPaste}
            ></ha-textfield>
            <mwc-button @click=${this._manualSubmit}
              >${this.localize("ui.common.submit")}</mwc-button
            >
          </div>`}`;
  }

  private async _loadQrScanner() {
    const QrScanner = (await import("qr-scanner")).default;
    if (!(await QrScanner.hasCamera())) {
      this._error = "No camera found";
      return;
    }
    QrScanner.WORKER_PATH = "/static/js/qr-scanner-worker.min.js";
    this._listCameras(QrScanner);
    this._qrScanner = new QrScanner(
      this._video,
      this._qrCodeScanned,
      this._qrCodeError
    );
    // @ts-ignore
    const canvas = this._qrScanner.$canvas;
    this._canvasContainer.appendChild(canvas);
    canvas.style.display = "block";
    try {
      await this._qrScanner.start();
    } catch (err: any) {
      this._error = err;
    }
  }

  private async _listCameras(qrScanner: typeof QrScanner): Promise<void> {
    this._cameras = await qrScanner.listCameras(true);
  }

  private _qrCodeError = (err: any) => {
    if (err === "No QR code found") {
      this._qrNotFoundCount++;
      if (this._qrNotFoundCount === 250) {
        this._error = err;
      }
      return;
    }
    this._error = err.message || err;
    // eslint-disable-next-line no-console
    console.log(err);
  };

  private _qrCodeScanned = async (qrCodeString: string): Promise<void> => {
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
    }
  `;
}

declare global {
  // for fire event
  interface HASSDomEvents {
    "qr-code-scanned": { value: string };
    "qr-code-error": { message: string };
  }

  interface HTMLElementTagNameMap {
    "ha-qr-scanner": HaQrScanner;
  }
}
