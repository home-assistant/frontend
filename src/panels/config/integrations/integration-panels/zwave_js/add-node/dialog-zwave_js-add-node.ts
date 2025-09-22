import { mdiChevronLeft, mdiClose } from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../../common/dom/fire_event";
import type { HaDialog } from "../../../../../../components/ha-dialog";
import { updateDeviceRegistryEntry } from "../../../../../../data/device_registry";
import type {
  QRProvisioningInformation,
  RequestedGrant,
  SecurityClass,
} from "../../../../../../data/zwave_js";
import {
  cancelSecureBootstrapS2,
  fetchZwaveNetworkStatus,
  InclusionStrategy,
  lookupZwaveDevice,
  MINIMUM_QR_STRING_LENGTH,
  Protocols,
  ProvisioningEntryStatus,
  provisionZwaveSmartStartNode,
  stopZwaveInclusion,
  subscribeAddZwaveNode,
  subscribeNewDevices,
  ZWaveFeature,
  zwaveGrantSecurityClasses,
  zwaveParseQrCode,
  zwaveSupportsFeature,
  zwaveTryParseDskFromQrCode,
  zwaveValidateDskAndEnterPin,
} from "../../../../../../data/zwave_js";
import type { HomeAssistant } from "../../../../../../types";
import {
  backButtonStages,
  closeButtonStages,
  type ZWaveJSAddNodeDevice,
  type ZWaveJSAddNodeSmartStartOptions,
  type ZWaveJSAddNodeStage,
} from "./data";
import type { ZWaveJSAddNodeDialogParams } from "./show-dialog-zwave_js-add-node";

import "../../../../../../components/ha-button";
import "../../../../../../components/ha-dialog";
import "../../../../../../components/ha-dialog-header";
import "../../../../../../components/ha-fade-in";
import "../../../../../../components/ha-icon-button";
import "../../../../../../components/ha-qr-scanner";

import { navigate } from "../../../../../../common/navigate";
import type { EntityRegistryEntry } from "../../../../../../data/entity_registry";
import {
  getAutomaticEntityIds,
  subscribeEntityRegistry,
  updateEntityRegistryEntry,
} from "../../../../../../data/entity_registry";
import { SubscribeMixin } from "../../../../../../mixins/subscribe-mixin";
import "./zwave-js-add-node-added-insecure";
import "./zwave-js-add-node-code-input";
import "./zwave-js-add-node-configure-device";
import "./zwave-js-add-node-failed";
import "./zwave-js-add-node-grant-security-classes";
import "./zwave-js-add-node-loading";
import "./zwave-js-add-node-searching-devices";
import "./zwave-js-add-node-select-method";
import "./zwave-js-add-node-select-security-strategy";

const INCLUSION_TIMEOUT_MINUTES = 5;

@customElement("dialog-zwave_js-add-node")
class DialogZWaveJSAddNode extends SubscribeMixin(LitElement) {
  // #region variables
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _open = false;

  @state() private _step?: ZWaveJSAddNodeStage;

  @state() private _entryId?: string;

  @state() private _controllerSupportsLongRange? = false;

  @state() private _supportsSmartStart?: boolean;

  @state() private _dsk?: string;

  @state() private _dskPin = "";

  @state() private _error?: string;

  @state() private _inclusionStrategy?: InclusionStrategy;

  @state() private _lowSecurity = false;

  @state() private _lowSecurityReason?: number;

  @state() private _device?: ZWaveJSAddNodeDevice;

  @state() private _deviceOptions?: ZWaveJSAddNodeSmartStartOptions;

  @state() private _requestedGrant?: RequestedGrant;

  @state() private _securityClasses: SecurityClass[] = [];

  @state() private _codeInput = "";

  @query("ha-dialog") private _dialog?: HaDialog;

  private _qrProcessing = false;

  private _addNodeTimeoutHandle?: number;

  private _onStop?: () => void;

  private _subscribed?: Promise<UnsubscribeFunc | undefined>;

  private _newDeviceSubscription?: Promise<UnsubscribeFunc | undefined>;

  @state() private _entities: EntityRegistryEntry[] = [];

  // #endregion

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeEntityRegistry(this.hass.connection, (entities) => {
        this._entities = entities;
      }),
    ];
  }

  protected render() {
    if (!this._entryId) {
      return nothing;
    }

    // Prevent accidentally closing the dialog in certain stages
    const preventClose = !!this._step && this._shouldPreventClose(this._step);

    const { headerText, headerHtml } = this._renderHeader();

    return html`
      <ha-dialog
        .open=${this._open}
        @closed=${this._dialogClosed}
        .scrimClickAction=${preventClose ? "" : "close"}
        .escapeKeyAction=${preventClose ? "" : "close"}
        .heading=${headerText}
      >
        <ha-dialog-header slot="heading"> ${headerHtml} </ha-dialog-header>
        ${this._renderStep()}
      </ha-dialog>
    `;
  }

  private _renderHeader(): { headerText: string; headerHtml: TemplateResult } {
    let headerText = this.hass.localize(
      `ui.panel.config.zwave_js.add_node.title`
    );

    if (this._step === "loading") {
      return {
        headerText,
        headerHtml: html`
          <ha-fade-in slot="title" .delay=${1000}>
            <span>${headerText}</span>
          </ha-fade-in>
        `,
      };
    }

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
      case "rename_device":
        titleTranslationKey = "configure_device.title";
        break;
      case "added_insecure":
        titleTranslationKey = "added_insecure.title";
        break;
      case "grant_security_classes":
        titleTranslationKey = "grant_security_classes.title";
        break;
      case "failed":
        titleTranslationKey = "add_device_failed";
        break;
    }

    headerText = this.hass.localize(
      `ui.panel.config.zwave_js.add_node.${titleTranslationKey}`
    );

    return {
      headerText,
      headerHtml: html`
        ${icon
          ? html`<ha-icon-button
              slot="navigationIcon"
              @click=${this._handleCloseOrBack}
              .label=${this.hass.localize("ui.common.close")}
              .path=${icon}
            ></ha-icon-button>`
          : nothing}
        <span slot="title">${headerText}</span>
      `,
    };
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
            @qr-code-scanned=${this._qrCodeScanned}
            @qr-code-closed=${this.closeDialog}
            @qr-code-more-options=${this._qrScanShowMoreOptions}
            .validate=${this._getQrCodeValidationError}
          ></ha-qr-scanner>
        </div>
      `;
    }

    if (this._step === "qr_code_input") {
      return html`
        <zwave-js-add-node-code-input
          .value=${this._codeInput}
          .description=${this.hass.localize(
            "ui.panel.config.zwave_js.add_node.qr.manual.text"
          )}
          .placeholder=${this.hass.localize(
            "ui.panel.config.zwave_js.add_node.qr.manual.placeholder"
          )}
          @value-changed=${this._manualQrCodeInputChange}
          @zwave-submit=${this._qrCodeScanned}
        ></zwave-js-add-node-code-input>
        <ha-button
          slot="primaryAction"
          .disabled=${!this._codeInput}
          @click=${this._qrCodeScanned}
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
          .inclusionStrategy=${this._inclusionStrategy}
          @show-z-wave-security-options=${this
            ._searchDevicesShowSecurityOptions}
          @add-another-z-wave-device=${this._addAnotherDevice}
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
          @z-wave-strategy-selected=${this._setSecurityStrategy}
        ></zwave-js-add-node-select-security-strategy>
        <ha-button
          slot="primaryAction"
          .disabled=${this._inclusionStrategy === undefined}
          @click=${this._searchDevicesWithStrategy}
        >
          ${this.hass.localize(
            "ui.panel.config.zwave_js.add_node.select_method.search_device"
          )}
        </ha-button>`;
    }

    if (this._step === "configure_device") {
      return html`<zwave-js-add-node-configure-device
          .hass=${this.hass}
          .deviceName=${this._device?.name ?? ""}
          .longRangeSupported=${!!this._device?.provisioningInfo?.supportedProtocols?.includes(
            Protocols.ZWaveLongRange
          ) && this._controllerSupportsLongRange}
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
        </ha-button>`;
    }

    if (this._step === "validate_dsk_enter_pin") {
      return html`
        <zwave-js-add-node-code-input
          .value=${this._dskPin}
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
          .disabled=${!this._dskPin || this._dskPin.length !== 5}
          @click=${this._validateDskAndEnterPin}
        >
          ${this.hass.localize(
            "ui.panel.config.zwave_js.add_node.configure_device.add_device"
          )}
        </ha-button>
      `;
    }

    if (
      ["interviewing", "waiting_for_device", "rename_device"].includes(
        this._step ?? ""
      )
    ) {
      return html`
        <zwave-js-add-node-loading
          .description=${this.hass.localize(
            `ui.panel.config.zwave_js.add_node.${this._step !== "rename_device" ? "getting_device_information" : "saving_device"}`
          )}
        ></zwave-js-add-node-loading>
      `;
    }

    if (this._step === "added_insecure") {
      return html`
        <zwave-js-add-node-added-insecure
          .hass=${this.hass}
          .deviceName=${this._device?.name}
          .reason=${this._lowSecurityReason?.toString()}
        ></zwave-js-add-node-added-insecure>
        <ha-button slot="primaryAction" @click=${this._navigateToDevice}>
          ${this.hass.localize(
            "ui.panel.config.zwave_js.add_node.added_insecure.view_device"
          )}
        </ha-button>
      `;
    }

    if (this._step === "grant_security_classes") {
      return html`
        <zwave-js-add-node-grant-security-classes
          .hass=${this.hass}
          .error=${this._error}
          .securityClassOptions=${this._requestedGrant!.securityClasses}
          .selectedSecurityClasses=${this._securityClasses}
          @value-changed=${this._securityClassChange}
        ></zwave-js-add-node-grant-security-classes>
        <ha-button slot="primaryAction" @click=${this._grantSecurityClasses}>
          ${this.hass.localize("ui.common.submit")}
        </ha-button>
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

  public connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("beforeunload", this._onBeforeUnload);
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
    this._controllerSupportsLongRange = params.longRangeSupported;

    this._step = "loading";

    if (this._controllerSupportsLongRange === undefined) {
      try {
        const zwaveNetwork = await fetchZwaveNetworkStatus(this.hass, {
          entry_id: this._entryId,
        });
        this._controllerSupportsLongRange =
          zwaveNetwork?.controller?.supports_long_range;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      }
    }

    if (params.dsk) {
      this._open = true;
      this._dskPin = "";
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
      this._step = "search_devices";
      this._startInclusion();
      return;
    }

    this._showFirstStep();
  }

  /**
   * prevent esc key, click out of dialog and close tab/browser
   */
  private _shouldPreventClose = memoizeOne((step: ZWaveJSAddNodeStage) =>
    [
      "loading",
      "qr_scan",
      "qr_code_input",
      "search_smart_start_device",
      "search_s2_device",
      "choose_security_strategy",
      "configure_device",
      "interviewing",
      "validate_dsk_enter_pin",
      "grant_security_classes",
      "waiting_for_device",
    ].includes(step)
  );

  private _handleCloseOrBack() {
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
        this._inclusionStrategy = undefined;
        this._step = "loading";
        this._startInclusion();
        break;
      case "configure_device":
        this._showFirstStep();
        break;
    }
  }

  private _methodSelected(ev: CustomEvent): void {
    const method = ev.detail.method;
    if (method === "qr_code_webcam") {
      this._step = "qr_scan";
    } else if (method === "qr_code_manual") {
      this._codeInput = "";
      this._step = "qr_code_input";
    } else if (method === "search_device") {
      this._step = "loading";
      this._startInclusion();
    }
  }

  private _qrScanShowMoreOptions() {
    this._open = true;
    this._step = "select_other_method";
  }

  private _searchDevicesShowSecurityOptions() {
    this._unsubscribe();
    this._step = "choose_security_strategy";
  }

  private _searchDevicesWithStrategy() {
    if (this._inclusionStrategy !== undefined) {
      this._step = "loading";
      this._startInclusion();
    }
  }

  private _setSecurityStrategy(ev: CustomEvent): void {
    this._inclusionStrategy = ev.detail.strategy;
  }

  private _startInclusion(
    qrProvisioningInformation?: QRProvisioningInformation,
    dsk?: string
  ): void {
    this._lowSecurity = false;

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
            this._step = "configure_device";
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
    this._addNodeTimeoutHandle = window.setTimeout(
      () => {
        this._unsubscribe();
        this._error = this.hass.localize(
          "ui.panel.config.zwave_js.add_node.timeout_error",
          { minutes: INCLUSION_TIMEOUT_MINUTES }
        );
        this._step = "failed";
      },
      INCLUSION_TIMEOUT_MINUTES * 1000 * 60
    );
  }

  private _validateQrCode = (qrCode: string): boolean =>
    qrCode.length >= MINIMUM_QR_STRING_LENGTH && qrCode.startsWith("90");

  private _getQrCodeValidationError = (qrCode: string): string | undefined =>
    this._validateQrCode(qrCode)
      ? undefined
      : this.hass.localize(
          "ui.panel.config.zwave_js.add_node.qr.invalid_code",
          { code: qrCode }
        );

  private async _qrCodeScanned(ev?: CustomEvent): Promise<void> {
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
      if (!this._codeInput) {
        return;
      }

      if (!this._validateQrCode(this._codeInput)) {
        this._step = "failed";
        this._error = this.hass.localize(
          "ui.panel.config.zwave_js.add_node.qr.invalid_code",
          { code: this._codeInput }
        );
        return;
      }

      qrCodeString = this._codeInput;
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
    } catch (_err: any) {
      // ignore
      // if device is not found in z-wave db set empty as default name
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
      this._error = this.hass.localize(
        "ui.panel.config.zwave_js.add_node.qr.unsupported_code",
        { code: qrCodeString }
      );
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
        const id = await provisionZwaveSmartStartNode(
          this.hass,
          this._entryId!,
          {
            ...this._device.provisioningInfo,
            status: ProvisioningEntryStatus.Active,
          },
          this._deviceOptions.network_type
            ? Number(this._deviceOptions.network_type)
            : undefined,
          this._deviceOptions.name,
          this._deviceOptions.area
        );
        this._device.id = id;
        this._subscribeNewDeviceSearch();
        this._step = "search_smart_start_device";
      } catch (err: any) {
        this._error = err.message;
        this._step = "failed";
      }
    } else {
      this._step = "rename_device";
      const nameChanged = this._device.name !== this._deviceOptions?.name;
      if (nameChanged || this._deviceOptions?.area) {
        const oldDeviceName = this._device.name;
        const newDeviceName = this._deviceOptions!.name;
        try {
          await updateDeviceRegistryEntry(this.hass, this._device.id, {
            name_by_user: this._deviceOptions!.name,
            area_id: this._deviceOptions!.area,
          });

          if (nameChanged) {
            // rename entities

            const entities = this._entities.filter(
              (entity) => entity.device_id === this._device!.id
            );

            const entityIdsMapping = await getAutomaticEntityIds(
              this.hass,
              entities.map((entity) => entity.entity_id)
            );

            await Promise.all(
              entities.map((entity) => {
                const name = entity.name;
                let newName: string | null | undefined;
                const newEntityId = entityIdsMapping[entity.entity_id];

                if (entity.has_entity_name && !entity.name) {
                  newName = undefined;
                } else if (
                  entity.has_entity_name &&
                  (entity.name === oldDeviceName ||
                    entity.name === newDeviceName)
                ) {
                  // clear name if it matches the device name and it uses the device name (entity naming)
                  newName = null;
                } else if (name && name.includes(oldDeviceName)) {
                  newName = name.replace(oldDeviceName, newDeviceName);
                }

                if (
                  (newName === undefined && !newEntityId) ||
                  newEntityId === entity.entity_id
                ) {
                  return undefined;
                }

                return updateEntityRegistryEntry(this.hass!, entity.entity_id, {
                  name: newName || name,
                  new_entity_id: newEntityId || undefined,
                });
              })
            );
          }
        } catch (_err: any) {
          this._error = this.hass.localize(
            "ui.panel.config.zwave_js.add_node.configure_device.save_device_failed"
          );
          this._step = "failed";
          return;
        }
      }

      // if device wasn't added securely show added added-insecure screen
      if (this._lowSecurity) {
        this._step = "added_insecure";
        return;
      }

      this._navigateToDevice();
    }
  }

  private _navigateToDevice() {
    const deviceId = this._device?.id;

    if (deviceId) {
      setTimeout(() => {
        // delay to ensure the node is added after smart start
        // in this case we don't have a subscription to the node's "node added" event
        // and it is near simultaneous with "device registered" event
        navigate(`/config/devices/device/${deviceId}`);
      }, 1000);
    } else {
      this.closeDialog();
    }
  }

  private _subscribeNewDeviceSearch() {
    if (!this._device?.id) {
      return;
    }
    this._newDeviceSubscription = subscribeNewDevices(
      this.hass,
      this._entryId!,
      ({ event, device }) => {
        if (
          event === "device registered" &&
          this._device?.id &&
          device.id === this._device.id
        ) {
          this._unsubscribeNewDeviceSearch();
          this._navigateToDevice();
        }
      }
    );
  }

  private _addAnotherDevice() {
    this._unsubscribeNewDeviceSearch();
    this._showFirstStep();
  }

  private _manualQrCodeInputChange(ev: CustomEvent): void {
    this._codeInput = ev.detail.value;
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

  private async _grantSecurityClasses() {
    this._step = "waiting_for_device";
    this._error = undefined;
    try {
      await zwaveGrantSecurityClasses(
        this.hass,
        this._entryId!,
        this._securityClasses
      );
    } catch (err: any) {
      this._error = err.message;
      this._step = "grant_security_classes";
    }
  }

  private _securityClassChange(ev: CustomEvent) {
    this._securityClasses = ev.detail.value;
  }

  private _unsubscribeNewDeviceSearch() {
    if (this._newDeviceSubscription) {
      this._newDeviceSubscription.then((unsub) => unsub && unsub());
      this._newDeviceSubscription = undefined;
    }
  }

  private _unsubscribe(): void {
    if (this._subscribed) {
      this._subscribed.then((unsub) => unsub && unsub());
      this._subscribed = undefined;

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
      }
    }

    this._unsubscribeNewDeviceSearch();

    this._requestedGrant = undefined;
    this._securityClasses = [];
    this._dsk = undefined;
    this._dskPin = "";
    this._lowSecurity = false;
    this._lowSecurityReason = undefined;
    this._inclusionStrategy = undefined;

    if (this._addNodeTimeoutHandle) {
      clearTimeout(this._addNodeTimeoutHandle);
    }
    this._addNodeTimeoutHandle = undefined;
    window.removeEventListener("beforeunload", this._onBeforeUnload);
  }

  private _dialogClosed() {
    this._unsubscribe();
    this._open = false;
    this._entryId = undefined;
    this._step = undefined;
    this._device = undefined;
    this._error = undefined;
    this._codeInput = "";
    this._deviceOptions = undefined;

    this._onStop?.();
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  public async closeDialog() {
    // special case for validate dsk and enter pin to stop 4 minute waiting process
    if (this._step === "validate_dsk_enter_pin") {
      this._step = "loading";
      try {
        await zwaveValidateDskAndEnterPin(this.hass, this._entryId!, false);
      } catch (err: any) {
        // ignore
        // eslint-disable-next-line no-console
        console.error("Failed to cancel DSK validation");
        // eslint-disable-next-line no-console
        console.error(err);
      }
    }

    if (this._open) {
      this._dialog?.close();
    } else {
      this._dialogClosed();
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("beforeunload", this._onBeforeUnload);

    this._unsubscribe();
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        ha-dialog {
          --mdc-dialog-min-width: 512px;
        }
        @media all and (max-width: 500px), all and (max-height: 500px) {
          ha-dialog {
            --mdc-dialog-min-width: 100vw;
            --mdc-dialog-max-width: 100vw;
            --mdc-dialog-min-height: 100%;
            --mdc-dialog-max-height: 100%;
            --vertical-align-dialog: flex-end;
            --ha-dialog-border-radius: 0;
          }
        }
        ha-fade-in {
          display: block;
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
