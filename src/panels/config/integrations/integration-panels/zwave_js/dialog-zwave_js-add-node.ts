import { mdiChevronLeft, mdiClose } from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import memoizeOne from "memoize-one";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import {
  cancelSecureBootstrapS2,
  InclusionStrategy,
  MINIMUM_QR_STRING_LENGTH,
  provisionZwaveSmartStartNode,
  stopZwaveInclusion,
  subscribeAddZwaveNode,
  ZWaveFeature,
  zwaveGrantSecurityClasses,
  zwaveParseQrCode,
  zwaveSupportsFeature,
  zwaveTryParseDskFromQrCode,
  type QRProvisioningInformation,
  type RequestedGrant,
  type SecurityClass,
} from "../../../../../data/zwave_js";
import type { HomeAssistant } from "../../../../../types";
import type { ZWaveJSAddNodeDialogParams } from "./show-dialog-zwave_js-add-node";
import {
  backButtonStages,
  closeButtonStages,
  type ZWaveJSAddNodeStage,
} from "./add-node/data";
import type { HaMdDialog } from "../../../../../components/ha-md-dialog";

import "../../../../../components/ha-md-dialog";
import "../../../../../components/ha-spinner";
import "../../../../../components/ha-fade-in";
import "../../../../../components/ha-dialog-header";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-button";
import "../../../../../components/ha-qr-scanner";
import "./add-node/zwave-js-add-node-select-method";

const INCLUSION_TIMEOUT = 300000; // 5 minutes

export interface ZWaveJSAddNodeDevice {
  id: string;
  name: string;
}

@customElement("dialog-zwave_js-add-node")
class DialogZWaveJSAddNode extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _open = false;

  @state() private _step?: ZWaveJSAddNodeStage;

  @state() private _entryId?: string;

  @state() private _dsk?: string;

  @state() private _error?: string;

  @state() private _supportsSmartStart?: boolean;

  @state() private _inclusionStrategy?: InclusionStrategy;

  @state() private _stages?: string[];

  @state() private _lowSecurity = false;

  @state() private _lowSecurityReason?: number;
  
  @state() private _device?: ZWaveJSAddNodeDevice;
  
  @state() private _requestedGrant?: RequestedGrant;

  @state() private _securityClasses: SecurityClass[] = [];

  private _qrProcessing = false;

  private _addNodeTimeoutHandle?: number;

  @query("ha-md-dialog") private _dialog?: HaMdDialog;

  private _onStop?: () => void;

  private _subscribed?: Promise<UnsubscribeFunc | undefined>;

  protected render() {
    if (!this._entryId) {
      return nothing;
    }

    // Prevent accidentally closing the dialog in certain stages
    const preventClose = !!this._step && this._shouldPreventClose(this._step);

    return html`
      <ha-md-dialog
        .open=${this._open}
        .disableCancelAction=${preventClose}
        @closed=${this._dialogClosed}
      >
        <ha-dialog-header slot="headline">
          ${this._renderHeader()}
        </ha-dialog-header>
        ${this._renderStep()}
      </ha-md-dialog>
    `;
  }

  public connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("beforeunload", this._onBeforeUnload);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("beforeunload", this._onBeforeUnload);

    this._unsubscribe();
  }

  private _onBeforeUnload = (event: BeforeUnloadEvent) => {
    if (this._step && this._shouldPreventClose(this._step)) {
      event.preventDefault();
      // support for legacy browsers
      event.returnValue = true;
    }
  };

  public async showDialog(params: ZWaveJSAddNodeDialogParams): Promise<void> {
    if (this._step) {
      // already started
      return;
    }
    this._onStop = params?.onStop;
    this._entryId = params.entry_id;
    this._step = "loading";

    if (params.dsk) {
      this._open = true;
      this._step = "validate_dsk_enter_pin";
      this._dsk = params.dsk;

      this._startInclusion();
      return;
    }

    this._supportsSmartStart = (
      await zwaveSupportsFeature(
        this.hass,
        this._entryId!,
        ZWaveFeature.SmartStart
      )
    ).supported;

    if (this._supportsSmartStart) {
      if (this.hass.auth.external?.config.hasBarCodeScanner) {
        this._step = "qr_scan";
      } else {
        this._step = "select_method";
        this._open = true;
      }
    } else {
      this._open = true;
      this._step = "started";
      this._startInclusion();
    }
  }

  private _shouldPreventClose = memoizeOne((step: ZWaveJSAddNodeStage) =>
    [
      "loading",
      "started_specific",
      "validate_dsk_enter_pin",
      "grant_security_classes",
      "waiting_for_device",
    ].includes(step)
  );

  private _handleBack() {
    if (this._step && closeButtonStages.includes(this._step!)) {
      this.closeDialog();
    } else if (this._step === "select_other_method") {
      this._step = "qr_scan";
    } else if (this._step === "qr_scan") {
      this._step = "select_method";
    }
  }

  private _renderHeader() {
    let icon: string | undefined;
    if (this._step && closeButtonStages.includes(this._step)) {
      icon = mdiClose;
    } else if (this._step && backButtonStages.includes(this._step)) {
      icon = mdiChevronLeft;
    }

    let titleTranslationKey = "title";

    switch (this._step) {
      case "qr_scan":
        titleTranslationKey = "scan_qr_code";
        break;
    }

    return html`
      ${icon
        ? html`<ha-icon-button
            slot="navigationIcon"
            @click=${this._handleBack}
            .label=${this.hass.localize("ui.common.close")}
            .path=${icon}
          ></ha-icon-button>`
        : nothing}
      <span slot="title" id="dialog-light-color-favorite-title"
        >${this.hass.localize(
          `ui.panel.config.zwave_js.add_node.${titleTranslationKey}`
        )}</span
      >
    `;
  }

  private _renderStep() {
    if (["select_method", "select_other_method"].includes(this._step!)) {
      return html`<zwave-js-add-node-select-method slot="content"
        .hass=${this.hass}
        .hideQrWebcam=${this._step === "select_other_method"}
        @z-wave-method-selected=${this._methodSelected}
      ></zwave-js-add-node-select-method>`;
    }
    
    if (this._step === "qr_scan") {
      return html`
        <div slot="content">
          <ha-qr-scanner
            slot="content"
            .hass=${this.hass}
            @qr-code-scanned=${this._handleQrCodeScanned}
            @qr-code-closed=${this.closeDialog}
            @qr-code-more-options=${this._showMoreOptions}
          ></ha-qr-scanner>
        </div>
      `;
    }

    return html`<div class="loading" slot="content">
      <ha-fade-in .delay=${1000}>
        <ha-spinner size="large"></ha-spinner>
      </ha-fade-in>
    </div>`;
  }

  private _methodSelected(ev: CustomEvent): void {
    const method = ev.detail.method;
    if (method === "qr_code_webcam") {
      this._step = "qr_scan";
    } else if (method === "qr_code_manual") {
      this._step = "qr_code_input";
    } else if (method === "search_device") {
      this._step = "loading";
      this._startInclusion();
    }
  }

  private _showMoreOptions() {
    this._open = true;
    this._step = "select_other_method";
  }

  private _startInclusion(
    qrProvisioningInformation?: QRProvisioningInformation,
    dsk?: string
  ): void {
    if (!this.hass) {
      return;
    }
    this._lowSecurity = false;
    const specificDevice = qrProvisioningInformation || dsk;
    this._subscribed = subscribeAddZwaveNode(
      this.hass,
      this._entryId!,
      (message) => {
        switch (message.event) {
          case "inclusion started":
            this._step = specificDevice ? "started_specific" : "started";
            break;
          case "inclusion failed":
            this._unsubscribe();
            this._step = "failed";
            break;
          case "inclusion stopped":
            // We either found a device, or it failed, either way, cancel the timeout as we are no longer searching
            if (this._addNodeTimeoutHandle) {
              clearTimeout(this._addNodeTimeoutHandle);
            }
            this._addNodeTimeoutHandle = undefined;
            break;
          case "node found":
            // The user may have to enter a PIN. Until then prevent accidentally
            // closing the dialog
            this._step = "waiting_for_device";
            break;
          case "validate dsk and enter pin":
            this._step = "validate_dsk_enter_pin";
            this._dsk = message.dsk;
            break;
          case "grant security classes":
            if (this._inclusionStrategy === undefined) {
              zwaveGrantSecurityClasses(
                this.hass,
                this._entryId!,
                message.requested_grant.securityClasses,
                message.requested_grant.clientSideAuth
              );
              break;
            }
            this._requestedGrant = message.requested_grant;
            this._securityClasses = message.requested_grant.securityClasses;
            this._step = "grant_security_classes";
            break;
          case "device registered":
            this._device = message.device;
            break;
          case "node added":
            this._step = "interviewing";
            this._lowSecurity = message.node.low_security;
            this._lowSecurityReason = message.node.low_security_reason;
            break;
          case "interview completed":
            this._unsubscribe();
            this._step = "finished";
            break;
          case "interview stage completed":
            if (this._stages === undefined) {
              this._stages = [message.stage];
            } else {
              this._stages = [...this._stages, message.stage];
            }
            break;
        }
      },
      qrProvisioningInformation,
      undefined,
      undefined,
      dsk,
      this._inclusionStrategy
    ).catch((err) => {
      this._error = err.message;
      this._step = "failed";
      return undefined;
    });
    this._addNodeTimeoutHandle = window.setTimeout(() => {
      this._unsubscribe();
      this._step = "timed_out";
    }, INCLUSION_TIMEOUT);
  }
  
  private async _handleQrCodeScanned(ev: CustomEvent): Promise<void> {
    const qrCodeString = ev.detail.value;
    this._error = undefined;
    this._open = true;

    if (this._step !== "qr_scan" || this._qrProcessing) {
      return;
    }

    this._qrProcessing = true;
    const dsk = await zwaveTryParseDskFromQrCode(
      this.hass,
      this._entryId!,
      qrCodeString
    );

    if (dsk) {
      this._step = "loading";
      // wait for QR scanner to be removed before resetting qr processing
      this.updateComplete.then(() => {
        this._qrProcessing = false;
      });
      this._inclusionStrategy = InclusionStrategy.Security_S2;
      this._startInclusion(undefined, dsk);
      return;
    }

    if (
      qrCodeString.length < MINIMUM_QR_STRING_LENGTH ||
      !qrCodeString.startsWith("90")
    ) {
      this._qrProcessing = false;
      this._error = `Invalid QR code (${qrCodeString})`;
      this._step = "failed";
      return;
    }

    let provisioningInfo: QRProvisioningInformation;

    try {
      provisioningInfo = await zwaveParseQrCode(
        this.hass,
        this._entryId!,
        qrCodeString
      );
    } catch (err: any) {
      this._qrProcessing = false;
      this._error = err.message;
      this._step = "failed";
      return;
    }

    this._step = "loading";
    // wait for QR scanner to be removed before resetting qr processing
    this.updateComplete.then(() => {
      this._qrProcessing = false;
    });

    if (provisioningInfo.version === 1) {
      try {
        await provisionZwaveSmartStartNode(
          this.hass,
          this._entryId!,
          provisioningInfo
        );
        this._step = "provisioned";
      } catch (err: any) {
        this._error = err.message;
        this._step = "failed";
      }
    } else if (provisioningInfo.version === 0) {
      this._inclusionStrategy = InclusionStrategy.Security_S2;
      this._startInclusion(provisioningInfo);
    } else {
      this._error = "This QR code is not supported";
      this._step = "failed";
    }
  }

  private _unsubscribe(): void {
    if (this._subscribed) {
      this._subscribed.then((unsub) => unsub && unsub());
      this._subscribed = undefined;
    }
    if (this._entryId) {
      stopZwaveInclusion(this.hass, this._entryId);
      if (
        this._step &&
        [
          "waiting_for_device",
          "validate_dsk_enter_pin",
          "grant_security_classes",
        ].includes(this._step)
      ) {
        cancelSecureBootstrapS2(this.hass, this._entryId);
      }
      this._onStop?.();
    }
    this._requestedGrant = undefined;
    this._dsk = undefined;
    this._securityClasses = [];
    this._step = undefined;
    if (this._addNodeTimeoutHandle) {
      clearTimeout(this._addNodeTimeoutHandle);
    }
    this._addNodeTimeoutHandle = undefined;
    window.removeEventListener("beforeunload", this._onBeforeUnload);
  }

  private _dialogClosed(): void {
    this._unsubscribe();
    this._open = false;
    this._inclusionStrategy = undefined;
    this._entryId = undefined;
    this._step = undefined;
    this._device = undefined;
    this._stages = undefined;
    this._error = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  public closeDialog(): void {
    if (this._open) {
      this._dialog?.close();
    } else {
      this._dialogClosed();
    }
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        ha-md-dialog {
          --dialog-content-padding: 0 24px 24px;
          --md-dialog-min-height: 320px;
          --md-dialog-min-width: 560px;
        }
        .loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-zwave_js-add-node": DialogZWaveJSAddNode;
  }
}
