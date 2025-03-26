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
  Protocols,
  provisionZwaveSmartStartNode,
  stopZwaveInclusion,
  subscribeAddZwaveNode,
  ZWaveFeature,
  zwaveGrantSecurityClasses,
  zwaveParseQrCode,
  zwaveSupportsFeature,
  zwaveTryParseDskFromQrCode,
  zwaveValidateDskAndEnterPin,
  type QRProvisioningInformation,
} from "../../../../../data/zwave_js";
import type { HomeAssistant } from "../../../../../types";
import type { ZWaveJSAddNodeDialogParams } from "./show-dialog-zwave_js-add-node";
import {
  backButtonStages,
  closeButtonStages,
  type ZWaveJSAddNodeDevice,
  type ZWaveJSAddNodeSmartStartOptions,
  type ZWaveJSAddNodeStage,
} from "./add-node/data";
import { updateDeviceRegistryEntry } from "../../../../../data/device_registry";
import type { HaDialog } from "../../../../../components/ha-dialog";

import "../../../../../components/ha-dialog";
import "../../../../../components/ha-dialog-header";
import "../../../../../components/ha-spinner";
import "../../../../../components/ha-fade-in";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-button";
import "../../../../../components/ha-qr-scanner";

import "./add-node/zwave-js-add-node-select-method";
import "./add-node/zwave-js-add-node-searching-devices";
import "./add-node/zwave-js-add-node-select-security-strategy";
import "./add-node/zwave-js-add-node-failed";
import "./add-node/zwave-js-add-node-configure-device";
import "./add-node/zwave-js-add-node-code-input";
import "./add-node/zwave-js-add-node-loading";

const INCLUSION_TIMEOUT = 300000; // 5 minutes

@customElement("dialog-zwave_js-add-node")
class DialogZWaveJSAddNode extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _open = false;

  @state() private _step?: ZWaveJSAddNodeStage;

  @state() private _entryId?: string;

  @state() private _controllerLongRandeSupported = false;

  @state() private _dsk?: string;

  @state() private _error?: string;

  @state() private _supportsSmartStart?: boolean;

  @state() private _inclusionStrategy?: InclusionStrategy;

  // @state() private _lowSecurity = false;

  // @state() private _lowSecurityReason?: number;

  @state() private _device?: ZWaveJSAddNodeDevice;

  @state() private _deviceOptions?: ZWaveJSAddNodeSmartStartOptions;

  // @state() private _requestedGrant?: RequestedGrant;

  // @state() private _securityClasses: SecurityClass[] = [];

  @state() private _manualQrCodeInput = "";

  @state() private _dskPin = "";

  private _qrProcessing = false;

  private _addNodeTimeoutHandle?: number;

  @query("ha-dialog") private _dialog?: HaDialog;

  private _onStop?: () => void;

  private _subscribed?: Promise<UnsubscribeFunc | undefined>;

  protected render() {
    if (!this._entryId) {
      return nothing;
    }

    // Prevent accidentally closing the dialog in certain stages
    const preventClose = !!this._step && this._shouldPreventClose(this._step);

    return html`
      <ha-dialog
        .open=${this._open}
        @closed=${this._dialogClosed}
        .scrimClickAction=${preventClose ? "" : "close"}
        .escapeKeyAction=${preventClose ? "" : "close"}
        .heading=${"-"}
      >
        <ha-dialog-header slot="heading">
          ${this._renderHeader()}
        </ha-dialog-header>
        ${this._renderStep()}
      </ha-dialog>
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

  private _showFirstStep() {
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

  public async showDialog(params: ZWaveJSAddNodeDialogParams): Promise<void> {
    if (this._step) {
      // already started
      return;
    }
    this._onStop = params?.onStop;
    this._entryId = params.entry_id;
    this._controllerLongRandeSupported = params.longRangeSupported;
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

    if (params?.inclusionOngoing) {
      this._open = true;
      this._startInclusion();
      return;
    }

    this._showFirstStep();
  }

  private _shouldPreventClose = memoizeOne((step: ZWaveJSAddNodeStage) =>
    [
      "loading",
      "search_smart_start_device",
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
      case "configure_device":
        this._showFirstStep();
        break;
    }
  }

  private _renderHeader() {
    let icon: string | undefined;
    if (
      (this._step && closeButtonStages.includes(this._step)) ||
      (this._step === "search_devices" && !this._supportsSmartStart) ||
      (this._step === "configure_device" && this._device?.id)
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
      case "search_smart_start_device":
        titleTranslationKey = "specific_device.title";
        break;
      case "choose_security_strategy":
        titleTranslationKey = "security_options";
        break;
      case "validate_dsk_enter_pin":
        titleTranslationKey = "validate_dsk_pin.title";
        break;
      case "configure_device":
        titleTranslationKey = "configure_device.title";
        break;
      case "failed":
        titleTranslationKey = "add_device_failed";
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
        .hass=${this.hass}
        .hideQrWebcam=${this._step === "select_other_method"}
        @z-wave-method-selected=${this._methodSelected}
      ></zwave-js-add-node-select-method>`;
    }

    if (this._step === "qr_scan") {
      return html`
        <div>
          <ha-qr-scanner
            .hass=${this.hass}
            @qr-code-scanned=${this._handleQrCodeScanned}
            @qr-code-closed=${this.closeDialog}
            @qr-code-more-options=${this._showMoreOptions}
            .validate=${this._validateAndError}
          ></ha-qr-scanner>
        </div>
      `;
    }

    if (this._step === "qr_code_input") {
      return html`
        <zwave-js-add-node-code-input
          .value=${this._manualQrCodeInput}
          .description=${this.hass.localize(
            "ui.panel.config.zwave_js.add_node.qr.manual.text"
          )}
          .placeholder=${this.hass.localize(
            "ui.panel.config.zwave_js.add_node.qr.manual.placeholder"
          )}
          @value-changed=${this._manualQrCodeInputChange}
          @zwave-submit=${this._handleQrCodeScanned}
        ></zwave-js-add-node-code-input>
        <ha-button
          slot="primaryAction"
          .disabled=${!this._manualQrCodeInput}
          @click=${this._handleQrCodeScanned}
        >
          ${this.hass.localize("ui.common.next")}
        </ha-button>
      `;
    }

    if (
      this._step === "search_devices" ||
      this._step === "search_smart_start_device" ||
      this._step === "search_s2_device"
    ) {
      return html`
        <zwave-js-add-node-searching-devices
          .hass=${this.hass}
          .smartStart=${this._step === "search_smart_start_device"}
          .showAddAnotherDevice=${this._step === "search_smart_start_device"}
          .showSecurityOptions=${this._step === "search_devices"}
          @show-z-wave-security-options=${this._showSecurityOptions}
          @add-another-z-wave-device=${this._showFirstStep}
        ></zwave-js-add-node-searching-devices>
        ${this._step === "search_smart_start_device"
          ? html`
              <ha-button slot="primaryAction" @click=${this.closeDialog}>
                ${this.hass.localize("ui.common.close")}
              </ha-button>
            `
          : nothing}
      `;
    }

    if (this._step === "choose_security_strategy") {
      return html`<zwave-js-add-node-select-security-strategy
        .hass=${this.hass}
        .inclusionStrategy=${this._inclusionStrategy ||
        InclusionStrategy.Default}
        @z-wave-strategy-selected=${this._setStrategy}
      ></zwave-js-add-node-select-security-strategy>`;
    }

    if (this._step === "configure_device") {
      return html`<zwave-js-add-node-configure-device
          .hass=${this.hass}
          .deviceName=${this._device?.name ?? ""}
          .longRangeSupported=${!!this._device?.provisioningInfo?.supportedProtocols?.includes(
            Protocols.ZWaveLongRange
          ) && this._controllerLongRandeSupported}
          @value-changed=${this._setDeviceOptions}
        ></zwave-js-add-node-configure-device>
        <ha-button
          slot="primaryAction"
          .disabled=${!this._deviceOptions?.name}
          @click=${this._saveDevice}
        >
          ${this.hass.localize(
            this._device?.id
              ? "ui.common.save"
              : "ui.panel.config.zwave_js.add_node.configure_device.add_device"
          )}
        </ha-button> `;
    }

    if (this._step === "validate_dsk_enter_pin") {
      return html`
        <zwave-js-add-node-code-input
          .value=${this._manualQrCodeInput}
          .description=${this.hass.localize(
            "ui.panel.config.zwave_js.add_node.validate_dsk_pin.text"
          )}
          .placeholder=${this.hass.localize(
            "ui.panel.config.zwave_js.add_node.validate_dsk_pin.placeholder"
          )}
          .referenceKey=${this._dsk!}
          @value-changed=${this._dskPinChanged}
          @zwave-submit=${this._validateDskAndEnterPin}
          numeric
          .error=${this._error}
        ></zwave-js-add-node-code-input>
        <ha-button
          slot="primaryAction"
          .disabled=${!this._dskPin || this._dskPin.length < 5}
          @click=${this._validateDskAndEnterPin}
        >
          ${this.hass.localize(
            "ui.panel.config.zwave_js.add_node.configure_device.add_device"
          )}
        </ha-button>
      `;
    }

    if (this._step === "interviewing" || this._step === "waiting_for_device") {
      return html`
        <zwave-js-add-node-loading
          .description=${this.hass.localize(
            "ui.panel.config.zwave_js.add_node.getting_device_information"
          )}
        ></zwave-js-add-node-loading>
      `;
    }

    if (this._step === "failed") {
      return html`
        <zwave-js-add-node-failed
          .error=${this._error}
          .hass=${this.hass}
          .device=${this._device}
        ></zwave-js-add-node-failed>
      `;
    }

    return html`<zwave-js-add-node-loading
      .delay=${1000}
    ></zwave-js-add-node-loading>`;
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

  private _startInclusion(
    qrProvisioningInformation?: QRProvisioningInformation,
    dsk?: string
  ): void {
    // this._lowSecurity = false;
    const s2Device = qrProvisioningInformation || dsk;
    this._subscribed = subscribeAddZwaveNode(
      this.hass,
      this._entryId!,
      (message) => {
        switch (message.event) {
          case "inclusion started":
            this._step = s2Device ? "search_s2_device" : "search_devices";
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
            // this._requestedGrant = message.requested_grant;
            // this._securityClasses = message.requested_grant.securityClasses;
            this._step = "grant_security_classes";
            break;
          case "device registered":
            this._device = message.device;
            this._step = "configure_device";
            break;
          case "node added":
            this._step = "interviewing";
            // this._lowSecurity = message.node.low_security;
            // this._lowSecurityReason = message.node.low_security_reason;
            break;
          case "interview completed":
            this._unsubscribe();
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

  private _validateQrCode = (qrCode: string): boolean =>
    qrCode.length >= MINIMUM_QR_STRING_LENGTH && qrCode.startsWith("90");

  private _validateAndError = (qrCode: string): string | undefined =>
    this._validateQrCode(qrCode)
      ? undefined
      : this.hass.localize(
          "ui.panel.config.zwave_js.add_node.qr.invalid_code",
          { code: qrCode }
        );

  private async _handleQrCodeScanned(ev?: CustomEvent): Promise<void> {
    let qrCodeString: string;
    this._error = undefined;
    this._open = true;

    if (
      (this._step !== "qr_scan" && this._step !== "qr_code_input") ||
      this._qrProcessing ||
      (this._step === "qr_scan" && !ev?.detail.value)
    ) {
      return;
    }

    if (this._step === "qr_code_input") {
      if (!this._manualQrCodeInput) {
        return;
      }

      if (!this._validateQrCode(this._manualQrCodeInput)) {
        this._step = "failed";
        this._error = this.hass.localize(
          "ui.panel.config.zwave_js.add_node.qr.invalid_code",
          { code: this._manualQrCodeInput }
        );
        return;
      }

      qrCodeString = this._manualQrCodeInput;
    } else {
      qrCodeString = ev!.detail.value;
    }

    this._qrProcessing = true;
    const dsk = await zwaveTryParseDskFromQrCode(
      this.hass,
      this._entryId!,
      qrCodeString
    );

    if (dsk) {
      // own screen add device inclusion
      this._step = "loading";
      // wait for QR scanner to be removed before resetting qr processing
      this.updateComplete.then(() => {
        this._qrProcessing = false;
      });
      this._inclusionStrategy = InclusionStrategy.Security_S2;
      this._startInclusion(undefined, dsk);
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

    let deviceName = "";
    try {
      const device = await lookupZwaveDevice(
        this.hass,
        this._entryId!,
        provisioningInfo.manufacturerId,
        provisioningInfo.productType,
        provisioningInfo.productId,
        provisioningInfo.applicationVersion
      );

      deviceName = device?.description ?? "";
    } catch (err: any) {
      // if device is not found in z-wave db set empty as default name
      // eslint-disable-next-line no-console
      console.error(err);
    }

    this._device = {
      name: deviceName,
      provisioningInfo,
    };

    // wait for QR scanner to be removed before resetting qr processing
    this.updateComplete.then(() => {
      this._qrProcessing = false;
    });

    if (provisioningInfo.version === 1) {
      this._step = "configure_device";
    } else if (provisioningInfo.version === 0) {
      this._step = "loading";
      this._inclusionStrategy = InclusionStrategy.Security_S2;
      this._startInclusion(provisioningInfo);
    } else {
      this._error = "This QR code is not supported";
      this._step = "failed";
    }
  }

  private _setDeviceOptions(ev: CustomEvent) {
    this._deviceOptions = ev.detail.value;
  }

  private async _saveDevice() {
    // smart start device
    if (!this._device?.id) {
      if (!this._deviceOptions?.name || !this._device?.provisioningInfo) {
        return;
      }

      this._step = "loading";

      try {
        await provisionZwaveSmartStartNode(
          this.hass,
          this._entryId!,
          this._device.provisioningInfo,
          this._deviceOptions.network_type
            ? Number(this._deviceOptions.network_type)
            : undefined,
          this._deviceOptions.name,
          this._deviceOptions.area
        );
        // TODO subscribe search smart start device
        this._step = "search_smart_start_device";
      } catch (err: any) {
        this._error = err.message;
        this._step = "failed";
      }
    } else {
      // included device
      if (this._device.name !== this._deviceOptions?.name) {
        try {
          await updateDeviceRegistryEntry(this.hass, this._device.id, {
            name_by_user: this._deviceOptions!.name,
            area_id: this._deviceOptions!.area,
          });
        } catch (_err: any) {
          this._error = this.hass.localize(
            "ui.panel.config.zwave_js.add_node.configure_device.save_device_failed"
          );
          this._step = "failed";
        }

        // TODO
        // try {
        //   const entities = await fetchEntityRegistry(this.hass.connection);

        //   const deviceEntities = entities
        //     .filter((entity) => entity.device_id === this._device!.id)
        //     .map((entity) => ({
        //       ...entity,
        //       stateName: computeEntityName(this.hass, entity),
        //     }));

        //   const updateProms = deviceEntities.map((entity) => {
        //     const name = entity.name || entity.stateName;
        //     let newEntityId: string | null = null;
        //     let newName: string | null = null;

        //     if (name && name.includes(oldDeviceName)) {
        //       newName = name.replace(` ${ieeeTail}`, "");
        //       newName = newName.replace(oldDeviceName, newDeviceName);
        //       newEntityId = entity.entity_id.replace(`_${ieeeTail}`, "");
        //       newEntityId = newEntityId.replace(
        //         oldDeviceEntityId,
        //         newDeviceEntityId
        //       );
        //     }

        //     if (!newName && !newEntityId) {
        //       return undefined;
        //     }

        //     return updateEntityRegistryEntry(this.hass!, entity.entity_id, {
        //       name: newName || name,
        //       disabled_by: entity.disabled_by,
        //       new_entity_id: newEntityId || entity.entity_id,
        //     });
        //   });
        //   await Promise.all(updateProms);
        // } catch (_err: any) {
        //   // TODO
        // }
      }

      // if not finished yet show interviewing loading screen
      this._step = !this._subscribed ? "finished" : "interviewing";
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
    // this._requestedGrant = undefined;
    this._dsk = undefined;
    // this._securityClasses = [];
    this._step = undefined;
    if (this._addNodeTimeoutHandle) {
      clearTimeout(this._addNodeTimeoutHandle);
    }
    this._addNodeTimeoutHandle = undefined;
    window.removeEventListener("beforeunload", this._onBeforeUnload);
  }

  private _manualQrCodeInputChange(ev: CustomEvent): void {
    this._manualQrCodeInput = ev.detail.value;
  }

  private _dskPinChanged(ev: CustomEvent): void {
    this._dskPin = ev.detail.value;
  }

  private async _validateDskAndEnterPin(): Promise<void> {
    this._step = "waiting_for_device";
    this._error = undefined;
    try {
      await zwaveValidateDskAndEnterPin(
        this.hass,
        this._entryId!,
        this._dskPin
      );
    } catch (err: any) {
      this._error = err.message;
      this._step = "validate_dsk_enter_pin";
    }
  }

  private _dialogClosed() {
    this._unsubscribe();
    this._open = false;
    this._inclusionStrategy = undefined;
    this._entryId = undefined;
    this._step = undefined;
    this._device = undefined;
    this._error = undefined;
    this._manualQrCodeInput = "";
    this._dskPin = "";
    this._dsk = undefined;
    this._deviceOptions = undefined;
    // this._requestedGrant = undefined;
    // this._securityClasses = [];
    // this._lowSecurity = false;
    // this._lowSecurityReason = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  public async closeDialog() {
    // special case for validate dsk and enter pin to stop 4 minute waiting process
    if (this._step === "validate_dsk_enter_pin") {
      this._step = "loading";
      try {
        await zwaveValidateDskAndEnterPin(this.hass, this._entryId!, false);
      } catch (_err: any) {
        // ignore
      }
    }

    if (this._open) {
      this._dialog?.close();
    } else {
      this._dialogClosed();
    }
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        ha-dialog {
          --mdc-dialog-min-width: 512px;
        }
        @media all and (max-width: 500px), all and (max-height: 500px) {
          ha-dialog {
            --mdc-dialog-min-width: calc(
              100vw - env(safe-area-inset-right) - env(safe-area-inset-left)
            );
            --mdc-dialog-max-width: calc(
              100vw - env(safe-area-inset-right) - env(safe-area-inset-left)
            );
            --mdc-dialog-min-height: 100%;
            --mdc-dialog-max-height: 100%;
            --vertical-align-dialog: flex-end;
            --ha-dialog-border-radius: 0;
          }
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-zwave_js-add-node": DialogZWaveJSAddNode;
  }
}
