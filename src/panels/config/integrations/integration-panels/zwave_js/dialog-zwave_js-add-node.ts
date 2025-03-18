import "@shoelace-style/shoelace/dist/components/animation/animation";
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
  lookupZwaveDevice,
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
import "./add-node/zwave-js-add-node-searching-devices";
import "./add-node/zwave-js-add-node-select-security-strategy";
import type { HaTextField } from "../../../../../components/ha-textfield";

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

  @state() private _manualQrCodeInput = "";

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
      this._step = "search_devices";
      this._startInclusion();
    }
  }

  private _shouldPreventClose = memoizeOne((step: ZWaveJSAddNodeStage) =>
    [
      "loading",
      "search_specific_device",
      "validate_dsk_enter_pin",
      "grant_security_classes",
      "waiting_for_device",
    ].includes(step)
  );

  private _handleBack() {
    if (
      (this._step && closeButtonStages.includes(this._step!)) ||
      (this._step === "search_devices" && !this._supportsSmartStart)
    ) {
      this.closeDialog();
      return;
    }

    switch (this._step) {
      case "select_other_method":
        this._step = "qr_scan";
        break;
      case "qr_scan":
        this._step = "select_method";
        break;
      case "qr_code_input":
        if (this.hass.auth.external?.config.hasBarCodeScanner) {
          this._step = "select_other_method";
          break;
        }
        this._step = "select_method";
        break;
      case "search_devices":
        this._unsubscribe();
        if (
          this._supportsSmartStart &&
          this.hass.auth.external?.config.hasBarCodeScanner
        ) {
          this._step = "select_other_method";
          break;
        } else if (this._supportsSmartStart) {
          this._step = "select_method";
          break;
        }
        break;
      case "choose_security_strategy":
        this._step = "search_devices";
        break;
    }
  }

  private _renderHeader() {
    let icon: string | undefined;
    if (
      (this._step && closeButtonStages.includes(this._step)) ||
      (this._step === "search_devices" && !this._supportsSmartStart)
    ) {
      icon = mdiClose;
    } else if (
      (this._step && backButtonStages.includes(this._step)) ||
      (this._step === "search_devices" && this._supportsSmartStart)
    ) {
      icon = mdiChevronLeft;
    }

    let titleTranslationKey = "title";

    switch (this._step) {
      case "qr_scan":
        titleTranslationKey = "qr.scan_code";
        break;
      case "qr_code_input":
        titleTranslationKey = "qr.manual.title";
        break;
      case "select_other_method":
        titleTranslationKey = "qr.other_add_options";
        break;
      case "search_devices":
        titleTranslationKey = "searching_devices";
        break;
      case "search_specific_device":
        titleTranslationKey = "specific_device.title";
        break;
      case "choose_security_strategy":
        titleTranslationKey = "security_options";
        break;
    }

    if (this._step === "loading") {
      return html`
        <ha-fade-in slot="title" .delay=${1000}>
          <span id="dialog-light-color-favorite-title"
            >${this.hass.localize(
              `ui.panel.config.zwave_js.add_node.${titleTranslationKey}`
            )}</span
          >
        </ha-fade-in>
      `;
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
      return html`<zwave-js-add-node-select-method
        slot="content"
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

    if (this._step === "qr_code_input") {
      return html`
        <div slot="content" class="qr-code-input">
          <p>
            ${this.hass.localize(
              "ui.panel.config.zwave_js.add_node.qr.manual.text"
            )}
          </p>
          <ha-textfield
            .placeholder=${this.hass.localize(
              "ui.panel.config.zwave_js.add_node.qr.manual.placeholder"
            )}
            .value=${this._manualQrCodeInput}
            @input=${this._manualQrCodeInputChange}
          ></ha-textfield>
        </div>
        <div slot="actions">
          <ha-button
            .disabled=${!this._manualQrCodeInput}
            @click=${this._handleQrCodeScanned}
          >
            ${this.hass.localize("ui.common.next")}
          </ha-button>
        </div>
      `;
    }

    if (
      this._step === "search_devices" ||
      this._step === "search_specific_device"
    ) {
      return html`
        <zwave-js-add-node-searching-devices
          .hass=${this.hass}
          slot="content"
          .specificDevice=${this._step === "search_specific_device"}
          @show-z-wave-security-options=${this._showSecurityOptions}
          @add-another-z-wave-device=${this._addAnotherDevice}
        ></zwave-js-add-node-searching-devices>
        ${this._step === "search_specific_device"
          ? html`
              <div slot="actions">
                <ha-button @click=${this.closeDialog}>
                  ${this.hass.localize("ui.common.close")}
                </ha-button>
              </div>
            `
          : nothing}
      `;
    }

    if (this._step === "choose_security_strategy") {
      return html` <zwave-js-add-node-select-security-strategy
          slot="content"
          .hass=${this.hass}
          .inclusionStrategy=${this._inclusionStrategy ||
          InclusionStrategy.Default}
          @z-wave-strategy-selected=${this._setStrategy}
        ></zwave-js-add-node-select-security-strategy>

        <div slot="actions">
          <ha-button @click=${this._handleBack}>
            ${this.hass.localize("ui.common.back")}
          </ha-button>
        </div>`;
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

  private _showSecurityOptions() {
    this._step = "choose_security_strategy";
  }

  private _setStrategy(ev: CustomEvent): void {
    this._inclusionStrategy = ev.detail.strategy;
  }

  private _addAnotherDevice() {
    // TODO
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
            this._step = specificDevice
              ? "search_specific_device"
              : "search_devices";
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
    let qrCodeString: string;
    this._error = undefined;
    this._open = true;

    if (
      (this._step !== "qr_scan" && this._step !== "qr_code_input") ||
      this._qrProcessing
    ) {
      return;
    }

    if (this._step === "qr_code_input") {
      if (!this._manualQrCodeInput) {
        return;
      }

      qrCodeString = this._manualQrCodeInput;
    } else {
      qrCodeString = ev.detail.value;
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
      const device = await lookupZwaveDevice(
        this.hass,
        this._entryId!,
        provisioningInfo.manufacturerId,
        provisioningInfo.productType,
        provisioningInfo.productId,
        provisioningInfo.applicationVersion
      );
      // @TODO: use device.description to set the device name
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

  private _manualQrCodeInputChange(ev: InputEvent): void {
    this._manualQrCodeInput = (ev.target as HaTextField).value;
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
        ha-fade-in {
          display: block;
        }
        .loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
        }

        .qr-code-input ha-textfield {
          width: 100%;
        }
        .qr-code-input p {
          color: var(--secondary-text-color);
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
