import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { ReactiveController, ReactiveControllerHost } from "lit";
import { html, nothing } from "lit";
import { isComponentLoaded } from "../../../../../../common/config/is_component_loaded";
import { ContextSubscriptionController } from "../../../../../../common/decorators/consume";
import { computeDeviceNameDisplay } from "../../../../../../common/entity/compute_device_name";
import { configEntriesContext } from "../../../../../../data/context";
import {
  fetchESPHomeDeviceCapabilities,
  fetchESPHomeDeviceWizard,
  type ESPHomeDeviceCapabilities,
  type ESPHomeDeviceWizard,
} from "../../../../../../data/esphome";
import {
  countRemainingESPHomeCapabilities,
  type ESPHomeDeviceEntityRef,
  deriveESPHomeSetupStatus,
  getESPHomeAudioControls,
  getESPHomeSwitch,
  getESPHomeSetupCapabilityIds,
  getESPHomeWizardSwitches,
  hasESPHomeBluetoothSwitch,
  hasESPHomeSetupCapabilities,
  isESPHomeSerialConfigured,
  isESPHomeSetupDeferred,
  isMusicAssistantConfigured,
  withDeferredESPHomeDevice,
} from "../../../../../../data/esphome_setup";
import {
  saveFrontendUserData,
  subscribeFrontendUserData,
  type ESPHomeFrontendUserData,
} from "../../../../../../data/frontend";
import { listSerialPortsWithUsage } from "../../../../../../data/usb";
import { showESPHomeDeviceSetupDialog } from "../../../../../../dialogs/esphome-device-setup/show-dialog-esphome-device-setup";
import { showAlertDialog } from "../../../../../../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../../../../../types";
import { getWsErrorMessage } from "../../../../../../util/ws-error";
import "../../../../../../components/ha-alert";
import "../../ha-esphome-setup-banner";
import "../../ha-esphome-setup-reminder";

type ESPHomeSetupHost = ReactiveControllerHost &
  HTMLElement & { hass: HomeAssistant };

/**
 * ESPHome setup state for the device page, loaded only for ESPHome devices.
 * The page renders the banner and the reminder in different places, so this
 * controller owns the state and renders both.
 */
export class ESPHomeSetupController implements ReactiveController {
  private _deviceId?: string;

  private _capabilities?: ESPHomeDeviceCapabilities;

  private _wizard?: ESPHomeDeviceWizard;

  /** Undefined until a USB usage scan succeeds. Failures keep the previous value. */
  private _serialConfigured?: boolean;

  private _serialError?: string;

  private _userData: ESPHomeFrontendUserData | null = null;

  private _userDataReady = false;

  private _unsubUserData?: UnsubscribeFunc;

  private _userDataSubscribed = false;

  private _userDataSubGeneration = 0;

  private _capabilitiesRequest = 0;

  private _musicAssistantConfigured = false;

  constructor(
    private readonly _host: ESPHomeSetupHost,
    private readonly _getEntities: () => ESPHomeDeviceEntityRef[]
  ) {
    this._host.addController(this);
    new ContextSubscriptionController(
      this._host,
      configEntriesContext,
      (entries) => {
        const configured = isMusicAssistantConfigured(entries);
        if (configured !== this._musicAssistantConfigured) {
          this._musicAssistantConfigured = configured;
          this._host.requestUpdate();
        }
      }
    );
  }

  public hostConnected(): void {
    if (this._deviceId) {
      this._subscribeUserData();
    }
  }

  public hostDisconnected(): void {
    this._unsubscribeUserData();
  }

  public clear(): void {
    this._capabilitiesRequest += 1;
    this._deviceId = undefined;
    this._unsubscribeUserData();
    this._userData = null;
    this._userDataReady = false;
    this._clearCapabilities();
  }

  public async refresh(deviceId: string): Promise<void> {
    const request = ++this._capabilitiesRequest;
    if (this._deviceId !== deviceId) {
      this._deviceId = deviceId;
      this._clearCapabilities();
    }
    const stillCurrent = () =>
      request === this._capabilitiesRequest && this._deviceId === deviceId;
    this._subscribeUserData();
    const hass = this._host.hass;
    try {
      const [capabilities, wizard] = await Promise.all([
        fetchESPHomeDeviceCapabilities(hass, deviceId),
        fetchESPHomeDeviceWizard(hass, deviceId),
      ]);
      if (!stillCurrent()) {
        return;
      }
      let serialConfigured = this._serialConfigured;
      let serialError: string | undefined;
      if (
        capabilities.serial_proxies.length > 0 &&
        isComponentLoaded(hass.config, "usb")
      ) {
        try {
          const ports = await listSerialPortsWithUsage(hass);
          if (!stillCurrent()) {
            return;
          }
          serialConfigured = isESPHomeSerialConfigured(
            capabilities.serial_proxies,
            ports
          );
        } catch (err: unknown) {
          if (!stillCurrent()) {
            return;
          }
          serialError =
            getWsErrorMessage(err) ??
            hass.localize("ui.panel.config.serial.loading_error");
        }
      } else {
        serialConfigured = false;
      }
      this._capabilities = capabilities;
      this._wizard = wizard;
      this._serialConfigured = serialConfigured;
      this._serialError = serialError;
      this._host.requestUpdate();
    } catch (_err) {
      if (stillCurrent()) {
        this._clearCapabilities();
      }
    }
  }

  public renderReminder() {
    const state = this._state();
    if (!state || (!state.deferred && state.remaining > 0)) {
      return nothing;
    }
    return html`<ha-esphome-setup-reminder
      .remaining=${state.remaining}
      .count=${state.count}
      @esphome-setup=${this._openDialog}
    ></ha-esphome-setup-reminder>`;
  }

  public renderBanner(deviceName: string) {
    const state = this._state();
    return html`
      ${
        this._serialError
          ? html`<ha-alert alert-type="error" class="fullwidth"
              >${this._serialError}</ha-alert
            >`
          : nothing
      }
      ${
        state && !state.deferred && state.remaining > 0
          ? html`<ha-esphome-setup-banner
              class="fullwidth"
              .deviceName=${deviceName}
              .status=${state.status}
              @esphome-setup=${this._openDialog}
              @esphome-setup-later=${this._defer}
            ></ha-esphome-setup-banner>`
          : nothing
      }
    `;
  }

  private _state() {
    const deviceId = this._deviceId;
    if (!deviceId || !this._capabilities || !this._userDataReady) {
      return undefined;
    }
    const hass = this._host.hass;
    const switches = getESPHomeWizardSwitches(this._wizard);
    const audio = getESPHomeAudioControls(
      deviceId,
      this._getEntities(),
      hass.states,
      switches.sendspin
    );
    if (
      !hasESPHomeSetupCapabilities(this._capabilities, {
        bluetoothSwitch: hasESPHomeBluetoothSwitch(
          switches.bluetooth,
          this._getEntities()
        ),
        mediaPlayerSupported: audio.supported,
      })
    ) {
      return undefined;
    }
    let status = deriveESPHomeSetupStatus(this._capabilities, {
      bluetoothEnabled: getESPHomeSwitch(switches.bluetooth, hass.states)?.on,
      mediaPlayerSupported: audio.supported,
      sendspinSupported: Boolean(audio.sendspinEntityId),
      sendspinEnabled: audio.sendspinOn,
      musicAssistantConfigured: this._musicAssistantConfigured,
      serialConfigured: this._serialConfigured,
    });
    // Unknown usage is not a completed setup. List the row so the banner stays,
    // without storing a configured or unconfigured scan.
    if (
      this._capabilities.serial_proxies.length > 0 &&
      this._serialConfigured === undefined
    ) {
      status = { ...status, serial: "not-started" };
    }
    return {
      status,
      deferred: isESPHomeSetupDeferred(this._userData, deviceId),
      remaining: countRemainingESPHomeCapabilities(status),
      count: getESPHomeSetupCapabilityIds(status).length,
    };
  }

  private _clearCapabilities() {
    this._capabilities = undefined;
    this._wizard = undefined;
    this._serialConfigured = undefined;
    this._serialError = undefined;
    this._host.requestUpdate();
  }

  private _unsubscribeUserData() {
    this._userDataSubGeneration += 1;
    this._userDataSubscribed = false;
    this._unsubUserData?.();
    this._unsubUserData = undefined;
  }

  private async _subscribeUserData() {
    if (this._userDataSubscribed || !this._host.isConnected) {
      return;
    }
    this._userDataSubscribed = true;
    const generation = this._userDataSubGeneration;
    try {
      const unsub = await subscribeFrontendUserData(
        this._host.hass.connection,
        "esphome",
        ({ value }) => {
          if (generation !== this._userDataSubGeneration) {
            return;
          }
          this._userData = value;
          this._userDataReady = true;
          this._host.requestUpdate();
        }
      );
      if (generation !== this._userDataSubGeneration) {
        unsub();
        return;
      }
      this._unsubUserData = unsub;
    } catch (_err) {
      if (generation !== this._userDataSubGeneration) {
        return;
      }
      this._userDataSubscribed = false;
      this._userData = null;
      this._userDataReady = true;
      this._host.requestUpdate();
    }
  }

  private _openDialog = () => {
    const deviceId = this._deviceId;
    if (!deviceId) {
      return;
    }
    const hass = this._host.hass;
    const device = hass.devices[deviceId];
    showESPHomeDeviceSetupDialog(this._host, {
      deviceId,
      deviceName: device
        ? computeDeviceNameDisplay(device, hass.localize)
        : undefined,
      capabilities: this._capabilities,
      wizard: this._wizard,
      mediaPlayerSupported: getESPHomeAudioControls(
        deviceId,
        this._getEntities(),
        hass.states,
        getESPHomeWizardSwitches(this._wizard).sendspin
      ).supported,
      dialogClosedCallback: () => {
        if (this._deviceId === deviceId) {
          this.refresh(deviceId);
        }
      },
    });
  };

  private _defer = async () => {
    const deviceId = this._deviceId;
    if (!deviceId) {
      return;
    }
    const previous = this._userData;
    const deferred = withDeferredESPHomeDevice(previous, deviceId);
    this._userData = deferred;
    this._host.requestUpdate();
    try {
      await saveFrontendUserData(
        this._host.hass.connection,
        "esphome",
        deferred
      );
    } catch (err: unknown) {
      if (this._userData === deferred) {
        this._userData = previous;
        this._host.requestUpdate();
      }
      await showAlertDialog(this._host, {
        text:
          getWsErrorMessage(err) ??
          this._host.hass.localize(
            "ui.panel.config.devices.esphome.setup_error_defer"
          ),
      });
    }
  };
}
