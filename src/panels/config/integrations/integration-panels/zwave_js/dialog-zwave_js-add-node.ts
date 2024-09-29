import "@material/mwc-button/mwc-button";
import { mdiAlertCircle, mdiCheckCircle, mdiQrcodeScan } from "@mdi/js";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-alert";
import type { HaCheckbox } from "../../../../../components/ha-checkbox";
import "../../../../../components/ha-circular-progress";
import { createCloseHeading } from "../../../../../components/ha-dialog";
import "../../../../../components/ha-checkbox";
import "../../../../../components/ha-formfield";
import "../../../../../components/ha-qr-scanner";
import "../../../../../components/ha-radio";
import "../../../../../components/ha-switch";
import "../../../../../components/ha-textfield";
import type { HaTextField } from "../../../../../components/ha-textfield";
import {
  InclusionStrategy,
  MINIMUM_QR_STRING_LENGTH,
  provisionZwaveSmartStartNode,
  QRProvisioningInformation,
  RequestedGrant,
  SecurityClass,
  stopZwaveInclusion,
  subscribeAddZwaveNode,
  ZWaveFeature,
  zwaveGrantSecurityClasses,
  zwaveParseQrCode,
  zwaveSupportsFeature,
  zwaveTryParseDskFromQrCode,
  zwaveValidateDskAndEnterPin,
} from "../../../../../data/zwave_js";
import { haStyle, haStyleDialog } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { ZWaveJSAddNodeDialogParams } from "./show-dialog-zwave_js-add-node";

export interface ZWaveJSAddNodeDevice {
  id: string;
  name: string;
}

@customElement("dialog-zwave_js-add-node")
class DialogZWaveJSAddNode extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: ZWaveJSAddNodeDialogParams;

  @state() private _entryId?: string;

  @state() private _status?:
    | "loading"
    | "started"
    | "started_specific"
    | "choose_strategy"
    | "qr_scan"
    | "interviewing"
    | "failed"
    | "timed_out"
    | "finished"
    | "provisioned"
    | "validate_dsk_enter_pin"
    | "grant_security_classes"
    | "waiting_for_device";

  @state() private _device?: ZWaveJSAddNodeDevice;

  @state() private _stages?: string[];

  @state() private _inclusionStrategy?: InclusionStrategy;

  @state() private _dsk?: string;

  @state() private _error?: string;

  @state() private _requestedGrant?: RequestedGrant;

  @state() private _securityClasses: SecurityClass[] = [];

  @state() private _lowSecurity = false;

  @state() private _supportsSmartStart?: boolean;

  private _addNodeTimeoutHandle?: number;

  private _subscribed?: Promise<UnsubscribeFunc>;

  private _qrProcessing = false;

  public connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("beforeunload", this._onBeforeUnload);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubscribe();
  }

  public async showDialog(params: ZWaveJSAddNodeDialogParams): Promise<void> {
    this._params = params;
    this._entryId = params.entry_id;
    this._status = "loading";
    this._checkSmartStartSupport();
    this._startInclusion();
  }

  @query("#pin-input") private _pinInput?: HaTextField;

  protected render() {
    if (!this._entryId) {
      return nothing;
    }

    // Prevent accidentally closing the dialog in certain stages
    const preventClose = this._shouldPreventClose();

    const heading = this.hass.localize(
      "ui.panel.config.zwave_js.add_node.title"
    );

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${preventClose
          ? heading
          : createCloseHeading(this.hass, heading)}
        scrimClickAction=${ifDefined(preventClose ? "" : undefined)}
        escapeKeyAction=${ifDefined(preventClose ? "" : undefined)}
      >
        ${this._status === "loading"
          ? html`<div style="display: flex; justify-content: center;">
              <ha-circular-progress
                size="large"
                indeterminate
              ></ha-circular-progress>
            </div>`
          : this._status === "waiting_for_device"
            ? html`<div class="flex-container">
                <ha-circular-progress indeterminate></ha-circular-progress>
                <p>
                  ${this.hass.localize(
                    "ui.panel.config.zwave_js.add_node.waiting_for_device"
                  )}
                </p>
              </div>`
            : this._status === "choose_strategy"
              ? html`<h3>Choose strategy</h3>
                  <div class="flex-column">
                    <ha-formfield
                      .label=${html`<b>Secure if possible</b>
                        <div class="secondary">
                          Requires user interaction during inclusion. Fast and
                          secure with S2 when supported. Allows manually
                          selecting which security keys to grant. Fallback to
                          legacy S0 or no encryption when necessary.
                        </div>`}
                    >
                      <ha-radio
                        name="strategy"
                        @change=${this._handleStrategyChange}
                        .value=${InclusionStrategy.Default}
                        .checked=${this._inclusionStrategy ===
                          InclusionStrategy.Default ||
                        this._inclusionStrategy === undefined}
                      >
                      </ha-radio>
                    </ha-formfield>
                    <ha-formfield
                      .label=${html`<b>Legacy Secure</b>
                        <div class="secondary">
                          Uses the older S0 security that is secure, but slow
                          due to a lot of overhead. Allows securely including S2
                          capable devices which fail to be included with S2.
                        </div>`}
                    >
                      <ha-radio
                        name="strategy"
                        @change=${this._handleStrategyChange}
                        .value=${InclusionStrategy.Security_S0}
                        .checked=${this._inclusionStrategy ===
                        InclusionStrategy.Security_S0}
                      >
                      </ha-radio>
                    </ha-formfield>
                    <ha-formfield
                      .label=${html`<b>Insecure</b>
                        <div class="secondary">Do not use encryption.</div>`}
                    >
                      <ha-radio
                        name="strategy"
                        @change=${this._handleStrategyChange}
                        .value=${InclusionStrategy.Insecure}
                        .checked=${this._inclusionStrategy ===
                        InclusionStrategy.Insecure}
                      >
                      </ha-radio>
                    </ha-formfield>
                  </div>
                  <mwc-button
                    slot="primaryAction"
                    @click=${this._startManualInclusion}
                  >
                    Search device
                  </mwc-button>`
              : this._status === "qr_scan"
                ? html` <ha-qr-scanner
                      .hass=${this.hass}
                      .localize=${this.hass.localize}
                      .error=${this._error}
                      @qr-code-scanned=${this._qrCodeScanned}
                      @qr-code-error=${this._qrCodeError}
                      @qr-code-closed=${this._startOver}
                    ></ha-qr-scanner>
                    <mwc-button
                      slot="secondaryAction"
                      @click=${this._startOver}
                    >
                      ${this.hass.localize(
                        "ui.panel.config.zwave_js.common.back"
                      )}
                    </mwc-button>`
                : this._status === "validate_dsk_enter_pin"
                  ? html`
                <p>
                  Please enter the 5-digit PIN for your device and verify that
                  the rest of the device-specific key matches the one that can
                  be found on your device or the manual.
                </p>
                ${
                  this._error
                    ? html`<ha-alert alert-type="error">
                        ${this._error}
                      </ha-alert>`
                    : ""
                }
                <div class="flex-container">
                <ha-textfield
                  label="PIN"
                  id="pin-input"
                  @keyup=${this._handlePinKeyUp}
                ></ha-textfield>
                ${this._dsk}
                </div>
                <mwc-button
                  slot="primaryAction"
                  @click=${this._validateDskAndEnterPin}
                >
                  Submit
                </mwc-button>
              </div>
            `
                  : this._status === "grant_security_classes"
                    ? html`
                        <h3>
                          The device has requested the following security
                          classes:
                        </h3>
                        ${this._error
                          ? html`<ha-alert alert-type="error"
                              >${this._error}</ha-alert
                            >`
                          : ""}
                        <div class="flex-column">
                          ${this._requestedGrant?.securityClasses
                            .sort((a, b) => {
                              // Put highest security classes at the top, S0 at the bottom
                              if (a === SecurityClass.S0_Legacy) return 1;
                              if (b === SecurityClass.S0_Legacy) return -1;
                              return b - a;
                            })
                            .map(
                              (securityClass) =>
                                html`<ha-formfield
                                  .label=${html`<b
                                      >${this.hass.localize(
                                        `ui.panel.config.zwave_js.security_classes.${SecurityClass[securityClass]}.title`
                                      )}</b
                                    >
                                    <div class="secondary">
                                      ${this.hass.localize(
                                        `ui.panel.config.zwave_js.security_classes.${SecurityClass[securityClass]}.description`
                                      )}
                                    </div>`}
                                >
                                  <ha-checkbox
                                    @change=${this._handleSecurityClassChange}
                                    .value=${securityClass}
                                    .checked=${this._securityClasses.includes(
                                      securityClass
                                    )}
                                  >
                                  </ha-checkbox>
                                </ha-formfield>`
                            )}
                        </div>
                        <mwc-button
                          slot="primaryAction"
                          .disabled=${!this._securityClasses.length}
                          @click=${this._grantSecurityClasses}
                        >
                          Submit
                        </mwc-button>
                      `
                    : this._status === "timed_out"
                      ? html`
                          <h3>Timed out!</h3>
                          <p>
                            We have not found any device in inclusion mode. Make
                            sure the device is active and in inclusion mode.
                          </p>
                          <mwc-button
                            slot="primaryAction"
                            @click=${this._startOver}
                          >
                            Retry
                          </mwc-button>
                        `
                      : this._status === "started_specific"
                        ? html`<h3>
                              ${this.hass.localize(
                                "ui.panel.config.zwave_js.add_node.searching_device"
                              )}
                            </h3>
                            <ha-circular-progress
                              indeterminate
                            ></ha-circular-progress>
                            <p>
                              ${this.hass.localize(
                                "ui.panel.config.zwave_js.add_node.follow_device_instructions"
                              )}
                            </p>`
                        : this._status === "started"
                          ? html`
                              <div class="select-inclusion">
                                <div class="outline">
                                  <h2>
                                    ${this.hass.localize(
                                      "ui.panel.config.zwave_js.add_node.searching_device"
                                    )}
                                  </h2>
                                  <ha-circular-progress
                                    indeterminate
                                  ></ha-circular-progress>
                                  <p>
                                    ${this.hass.localize(
                                      "ui.panel.config.zwave_js.add_node.follow_device_instructions"
                                    )}
                                  </p>
                                  <p>
                                    <button
                                      class="link"
                                      @click=${this._chooseInclusionStrategy}
                                    >
                                      ${this.hass.localize(
                                        "ui.panel.config.zwave_js.add_node.choose_inclusion_strategy"
                                      )}
                                    </button>
                                  </p>
                                </div>
                                ${this._supportsSmartStart
                                  ? html`<div class="outline">
                                      <h2>
                                        ${this.hass.localize(
                                          "ui.panel.config.zwave_js.add_node.qr_code"
                                        )}
                                      </h2>
                                      <ha-svg-icon
                                        .path=${mdiQrcodeScan}
                                      ></ha-svg-icon>
                                      <p>
                                        ${this.hass.localize(
                                          "ui.panel.config.zwave_js.add_node.qr_code_paragraph"
                                        )}
                                      </p>
                                      <p>
                                        <mwc-button @click=${this._scanQRCode}>
                                          ${this.hass.localize(
                                            "ui.panel.config.zwave_js.add_node.scan_qr_code"
                                          )}
                                        </mwc-button>
                                      </p>
                                    </div>`
                                  : ""}
                              </div>
                              <mwc-button
                                slot="primaryAction"
                                @click=${this.closeDialog}
                              >
                                ${this.hass.localize("ui.common.cancel")}
                              </mwc-button>
                            `
                          : this._status === "interviewing"
                            ? html`
                                <div class="flex-container">
                                  <ha-circular-progress
                                    indeterminate
                                  ></ha-circular-progress>
                                  <div class="status">
                                    <p>
                                      <b
                                        >${this.hass.localize(
                                          "ui.panel.config.zwave_js.add_node.interview_started"
                                        )}</b
                                      >
                                    </p>
                                    ${this._stages
                                      ? html` <div class="stages">
                                          ${this._stages.map(
                                            (stage) => html`
                                              <span class="stage">
                                                <ha-svg-icon
                                                  .path=${mdiCheckCircle}
                                                  class="success"
                                                ></ha-svg-icon>
                                                ${stage}
                                              </span>
                                            `
                                          )}
                                        </div>`
                                      : ""}
                                  </div>
                                </div>
                                <mwc-button
                                  slot="primaryAction"
                                  @click=${this.closeDialog}
                                >
                                  ${this.hass.localize("ui.common.close")}
                                </mwc-button>
                              `
                            : this._status === "failed"
                              ? html`
                                  <div class="flex-container">
                                    <div class="status">
                                      <ha-alert
                                        alert-type="error"
                                        .title=${this.hass.localize(
                                          "ui.panel.config.zwave_js.add_node.inclusion_failed"
                                        )}
                                      >
                                        ${this._error ||
                                        this.hass.localize(
                                          "ui.panel.config.zwave_js.add_node.check_logs"
                                        )}
                                      </ha-alert>
                                      ${this._stages
                                        ? html` <div class="stages">
                                            ${this._stages.map(
                                              (stage) => html`
                                                <span class="stage">
                                                  <ha-svg-icon
                                                    .path=${mdiCheckCircle}
                                                    class="success"
                                                  ></ha-svg-icon>
                                                  ${stage}
                                                </span>
                                              `
                                            )}
                                          </div>`
                                        : ""}
                                    </div>
                                  </div>
                                  <mwc-button
                                    slot="primaryAction"
                                    @click=${this.closeDialog}
                                  >
                                    ${this.hass.localize("ui.common.close")}
                                  </mwc-button>
                                `
                              : this._status === "finished"
                                ? html`
                                    <div class="flex-container">
                                      <ha-svg-icon
                                        .path=${this._lowSecurity
                                          ? mdiAlertCircle
                                          : mdiCheckCircle}
                                        class=${this._lowSecurity
                                          ? "warning"
                                          : "success"}
                                      ></ha-svg-icon>
                                      <div class="status">
                                        <p>
                                          ${this.hass.localize(
                                            "ui.panel.config.zwave_js.add_node.inclusion_finished"
                                          )}
                                        </p>
                                        ${this._lowSecurity
                                          ? html`<ha-alert
                                              alert-type="warning"
                                              title="The device was added insecurely"
                                            >
                                              There was an error during secure
                                              inclusion. You can try again by
                                              excluding the device and adding it
                                              again.
                                            </ha-alert>`
                                          : ""}
                                        <a
                                          href=${`/config/devices/device/${this._device?.id}`}
                                        >
                                          <mwc-button>
                                            ${this.hass.localize(
                                              "ui.panel.config.zwave_js.add_node.view_device"
                                            )}
                                          </mwc-button>
                                        </a>
                                        ${this._stages
                                          ? html` <div class="stages">
                                              ${this._stages.map(
                                                (stage) => html`
                                                  <span class="stage">
                                                    <ha-svg-icon
                                                      .path=${mdiCheckCircle}
                                                      class="success"
                                                    ></ha-svg-icon>
                                                    ${stage}
                                                  </span>
                                                `
                                              )}
                                            </div>`
                                          : ""}
                                      </div>
                                    </div>
                                    <mwc-button
                                      slot="primaryAction"
                                      @click=${this.closeDialog}
                                    >
                                      ${this.hass.localize("ui.common.close")}
                                    </mwc-button>
                                  `
                                : this._status === "provisioned"
                                  ? html` <div class="flex-container">
                                        <ha-svg-icon
                                          .path=${mdiCheckCircle}
                                          class="success"
                                        ></ha-svg-icon>
                                        <div class="status">
                                          <p>
                                            ${this.hass.localize(
                                              "ui.panel.config.zwave_js.add_node.provisioning_finished"
                                            )}
                                          </p>
                                        </div>
                                      </div>
                                      <mwc-button
                                        slot="primaryAction"
                                        @click=${this.closeDialog}
                                      >
                                        ${this.hass.localize("ui.common.close")}
                                      </mwc-button>`
                                  : ""}
      </ha-dialog>
    `;
  }

  private _shouldPreventClose(): boolean {
    return (
      this._status === "started_specific" ||
      this._status === "validate_dsk_enter_pin" ||
      this._status === "grant_security_classes" ||
      this._status === "waiting_for_device"
    );
  }

  private _chooseInclusionStrategy(): void {
    this._unsubscribe();
    this._status = "choose_strategy";
  }

  private _handleStrategyChange(ev: CustomEvent): void {
    this._inclusionStrategy = (ev.target as any).value;
  }

  private _handleSecurityClassChange(ev: CustomEvent): void {
    const checkbox = ev.currentTarget as HaCheckbox;
    const securityClass = Number(checkbox.value);
    if (checkbox.checked && !this._securityClasses.includes(securityClass)) {
      this._securityClasses = [...this._securityClasses, securityClass];
    } else if (!checkbox.checked) {
      this._securityClasses = this._securityClasses.filter(
        (val) => val !== securityClass
      );
    }
  }

  private async _scanQRCode(): Promise<void> {
    this._unsubscribe();
    this._status = "qr_scan";
  }

  private _qrCodeScanned(ev: CustomEvent): void {
    if (this._qrProcessing) {
      return;
    }
    this._handleQrCodeScanned(ev.detail.value);
  }

  private _qrCodeError(ev: CustomEvent): void {
    this._error = ev.detail.message;
  }

  private async _handleQrCodeScanned(qrCodeString: string): Promise<void> {
    this._error = undefined;
    if (this._status !== "qr_scan" || this._qrProcessing) {
      return;
    }
    this._qrProcessing = true;
    const dsk = await zwaveTryParseDskFromQrCode(
      this.hass,
      this._entryId!,
      qrCodeString
    );
    if (dsk) {
      this._status = "loading";
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
      return;
    }
    this._status = "loading";
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
        this._status = "provisioned";
        if (this._params?.addedCallback) {
          this._params.addedCallback();
        }
      } catch (err: any) {
        this._error = err.message;
        this._status = "failed";
      }
    } else if (provisioningInfo.version === 0) {
      this._inclusionStrategy = InclusionStrategy.Security_S2;
      this._startInclusion(provisioningInfo);
    } else {
      this._error = "This QR code is not supported";
      this._status = "failed";
    }
  }

  private _handlePinKeyUp(ev: KeyboardEvent) {
    if (ev.key === "Enter") {
      this._validateDskAndEnterPin();
    }
  }

  private async _validateDskAndEnterPin(): Promise<void> {
    this._status = "waiting_for_device";
    this._error = undefined;
    try {
      await zwaveValidateDskAndEnterPin(
        this.hass,
        this._entryId!,
        this._pinInput!.value as string
      );
    } catch (err: any) {
      this._error = err.message;
      this._status = "validate_dsk_enter_pin";
      await this.updateComplete;
      this._pinInput?.focus();
    }
  }

  private async _grantSecurityClasses(): Promise<void> {
    this._status = "waiting_for_device";
    this._error = undefined;
    try {
      await zwaveGrantSecurityClasses(
        this.hass,
        this._entryId!,
        this._securityClasses
      );
    } catch (err: any) {
      this._error = err.message;
      this._status = "grant_security_classes";
    }
  }

  private _startManualInclusion() {
    if (!this._inclusionStrategy) {
      this._inclusionStrategy = InclusionStrategy.Default;
    }
    this._startInclusion();
  }

  private async _checkSmartStartSupport() {
    this._supportsSmartStart = (
      await zwaveSupportsFeature(
        this.hass,
        this._entryId!,
        ZWaveFeature.SmartStart
      )
    ).supported;
  }

  private _startOver(_ev: Event) {
    this._startInclusion();
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
        if (message.event === "inclusion started") {
          this._status = specificDevice ? "started_specific" : "started";
        }
        if (message.event === "inclusion failed") {
          this._unsubscribe();
          this._status = "failed";
        }
        if (message.event === "inclusion stopped") {
          // We either found a device, or it failed, either way, cancel the timeout as we are no longer searching
          if (this._addNodeTimeoutHandle) {
            clearTimeout(this._addNodeTimeoutHandle);
          }
          this._addNodeTimeoutHandle = undefined;
        }

        if (message.event === "node found") {
          // The user may have to enter a PIN. Until then prevent accidentally
          // closing the dialog
          this._status = "waiting_for_device";
        }

        if (message.event === "validate dsk and enter pin") {
          this._status = "validate_dsk_enter_pin";
          this._dsk = message.dsk;
        }

        if (message.event === "grant security classes") {
          if (this._inclusionStrategy === undefined) {
            zwaveGrantSecurityClasses(
              this.hass,
              this._entryId!,
              message.requested_grant.securityClasses,
              message.requested_grant.clientSideAuth
            );
            return;
          }
          this._requestedGrant = message.requested_grant;
          this._securityClasses = message.requested_grant.securityClasses;
          this._status = "grant_security_classes";
        }

        if (message.event === "device registered") {
          this._device = message.device;
        }
        if (message.event === "node added") {
          this._status = "interviewing";
          this._lowSecurity = message.node.low_security;
        }

        if (message.event === "interview completed") {
          this._unsubscribe();
          this._status = "finished";
          if (this._params?.addedCallback) {
            this._params.addedCallback();
          }
        }

        if (message.event === "interview stage completed") {
          if (this._stages === undefined) {
            this._stages = [message.stage];
          } else {
            this._stages = [...this._stages, message.stage];
          }
        }
      },
      this._inclusionStrategy,
      qrProvisioningInformation,
      undefined,
      undefined,
      dsk
    );
    this._addNodeTimeoutHandle = window.setTimeout(() => {
      this._unsubscribe();
      this._status = "timed_out";
    }, 90000);
  }

  private _onBeforeUnload = (event: BeforeUnloadEvent) => {
    if (this._shouldPreventClose()) {
      event.preventDefault();
    }
    event.returnValue = true;
  };

  private _unsubscribe(): void {
    if (this._subscribed) {
      this._subscribed.then((unsub) => unsub());
      this._subscribed = undefined;
    }
    if (this._entryId) {
      stopZwaveInclusion(this.hass, this._entryId);
    }
    this._requestedGrant = undefined;
    this._dsk = undefined;
    this._securityClasses = [];
    this._status = undefined;
    if (this._addNodeTimeoutHandle) {
      clearTimeout(this._addNodeTimeoutHandle);
    }
    this._addNodeTimeoutHandle = undefined;
    window.removeEventListener("beforeunload", this._onBeforeUnload);
  }

  public closeDialog(): void {
    this._unsubscribe();
    this._inclusionStrategy = undefined;
    this._entryId = undefined;
    this._status = undefined;
    this._device = undefined;
    this._stages = undefined;
    this._error = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      haStyle,
      css`
        h3 {
          margin-top: 0;
        }

        .success {
          color: var(--success-color);
        }

        .warning {
          color: var(--warning-color);
        }

        .stages {
          margin-top: 16px;
          display: grid;
        }

        .flex-container .stage ha-svg-icon {
          width: 16px;
          height: 16px;
          margin-right: 0px;
          margin-inline-end: 0px;
          margin-inline-start: initial;
        }
        .stage {
          padding: 8px;
        }

        .flex-container {
          display: flex;
          align-items: center;
        }

        .flex-column {
          display: flex;
          flex-direction: column;
        }

        .flex-column ha-formfield {
          padding: 8px 0;
        }

        .select-inclusion {
          display: flex;
          align-items: center;
        }

        .select-inclusion .outline:nth-child(2) {
          margin-left: 16px;
          margin-inline-start: 16px;
          margin-inline-end: initial;
        }

        .select-inclusion .outline {
          border: 1px solid var(--divider-color);
          border-radius: 4px;
          padding: 16px;
          min-height: 250px;
          text-align: center;
          flex: 1;
        }

        @media all and (max-width: 500px) {
          .select-inclusion {
            flex-direction: column;
          }

          .select-inclusion .outline:nth-child(2) {
            margin-left: 0;
            margin-inline-start: 0;
            margin-inline-end: initial;
            margin-top: 16px;
          }
        }

        ha-svg-icon {
          width: 68px;
          height: 48px;
        }
        ha-textfield {
          display: block;
        }
        .secondary {
          color: var(--secondary-text-color);
        }

        .flex-container ha-circular-progress,
        .flex-container ha-svg-icon {
          margin-right: 20px;
          margin-inline-end: 20px;
          margin-inline-start: initial;
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
