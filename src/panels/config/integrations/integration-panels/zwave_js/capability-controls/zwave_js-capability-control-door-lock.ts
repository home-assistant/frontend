import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { DeviceRegistryEntry } from "../../../../../../data/device_registry";
import type { HomeAssistant } from "../../../../../../types";
import { invokeZWaveCCApi } from "../../../../../../data/zwave_js";
import "../../../../../../components/ha-button";
import "../../../../../../components/buttons/ha-progress-button";
import "../../../../../../components/ha-textfield";
import "../../../../../../components/ha-select";
import "../../../../../../components/ha-list-item";
import "../../../../../../components/ha-alert";
import "../../../../../../components/ha-switch";
import "../../../../../../components/ha-formfield";
import "../../../../../../components/ha-spinner";
import type { HaSwitch } from "../../../../../../components/ha-switch";
import type { HaProgressButton } from "../../../../../../components/buttons/ha-progress-button";
import { extractApiErrorMessage } from "../../../../../../data/hassio/common";

type DoorHandleStatus = [boolean, boolean, boolean, boolean];

interface DoorLockConfiguration {
  operationType: number;
  outsideHandlesCanOpenDoorConfiguration: DoorHandleStatus;
  insideHandlesCanOpenDoorConfiguration: DoorHandleStatus;
  lockTimeoutConfiguration?: number;
  autoRelockTime?: number;
  holdAndReleaseTime?: number;
  twistAssist?: boolean;
  blockToBlock?: boolean;
}

enum DoorLockMode {
  Unsecured = 0x00,
  UnsecuredWithTimeout = 0x01,
  InsideUnsecured = 0x10,
  InsideUnsecuredWithTimeout = 0x11,
  OutsideUnsecured = 0x20,
  OutsideUnsecuredWithTimeout = 0x21,
  Unknown = 0xfe,
  Secured = 0xff,
}

interface DoorLockCapabilities {
  supportedOperationTypes: number[];
  supportedDoorLockModes: DoorLockMode[];
  blockToBlockSupported?: boolean;
  twistAssistSupported?: boolean;
  holdAndReleaseSupported?: boolean;
  autoRelockSupported?: boolean;
}

const TIMED_MODES = [
  DoorLockMode.UnsecuredWithTimeout,
  DoorLockMode.InsideUnsecuredWithTimeout,
  DoorLockMode.OutsideUnsecuredWithTimeout,
];

const DEFAULT_CAPABILITIES: DoorLockCapabilities = {
  supportedOperationTypes: [1, 2],
  supportedDoorLockModes: [
    DoorLockMode.Unsecured,
    DoorLockMode.UnsecuredWithTimeout,
    DoorLockMode.InsideUnsecured,
    DoorLockMode.InsideUnsecuredWithTimeout,
    DoorLockMode.OutsideUnsecured,
    DoorLockMode.OutsideUnsecuredWithTimeout,
    DoorLockMode.Secured,
  ],
};

const DEFAULT_MODE = DoorLockMode.Unsecured;

@customElement("zwave_js-capability-control-door_lock")
class ZWaveJSCapabilityDoorLock extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public device!: DeviceRegistryEntry;

  @property({ type: Number }) public endpoint!: number;

  @property({ type: Number }) public command_class!: number;

  @property({ type: Number }) public version!: number;

  @state() private _configuration?: DoorLockConfiguration;

  @state() private _capabilities?: DoorLockCapabilities;

  @state() private _currentDoorLockMode?: DoorLockMode;

  @state() private _error?: string;

  protected render() {
    if (this._error) {
      return html`<ha-alert alert-type="error">${this._error}</ha-alert>`;
    }

    if (
      !this._configuration ||
      !this._capabilities ||
      this._currentDoorLockMode === undefined
    ) {
      return html`<ha-spinner></ha-spinner>`;
    }

    const isValid = this._isValid();

    const supportedDoorLockModes =
      this._configuration.operationType === 2
        ? this._capabilities.supportedDoorLockModes
        : this._capabilities.supportedDoorLockModes.filter(
            (mode) => !TIMED_MODES.includes(mode)
          );

    return html`
      <h3>
        ${this.hass.localize(
          "ui.panel.config.zwave_js.node_installer.capability_controls.door_lock.title"
        )}
      </h3>

      <div class="row">
        <ha-select
          .label=${this.hass.localize(
            "ui.panel.config.zwave_js.node_installer.capability_controls.door_lock.mode"
          )}
          .value=${this._currentDoorLockMode?.toString() ?? ""}
          @selected=${this._doorLockModeChanged}
        >
          ${supportedDoorLockModes.map(
            (mode) => html`
              <ha-list-item .value=${mode.toString()}>
                ${this.hass.localize(
                  `ui.panel.config.zwave_js.node_installer.capability_controls.door_lock.modes.${mode}`
                )}
              </ha-list-item>
            `
          )}
        </ha-select>
      </div>
      <div class="row">
        <ha-select
          .label=${this.hass.localize(
            "ui.panel.config.zwave_js.node_installer.capability_controls.door_lock.operation_type"
          )}
          .value=${this._configuration.operationType.toString()}
          @selected=${this._operationTypeChanged}
        >
          ${this._capabilities.supportedOperationTypes.map(
            (type) => html`
              <ha-list-item .value=${type.toString()}>
                ${this.hass.localize(
                  `ui.panel.config.zwave_js.node_installer.capability_controls.door_lock.operation_types.${type}`
                )}
              </ha-list-item>
            `
          )}
        </ha-select>
      </div>

      ${this._configuration.operationType === 2
        ? html`
            <div class="row">
              <ha-textfield
                type="number"
                .label=${this.hass.localize(
                  "ui.panel.config.zwave_js.node_installer.capability_controls.door_lock.lock_timeout"
                )}
                .value=${this._configuration.lockTimeoutConfiguration?.toString() ??
                ""}
                @change=${this._numberChanged}
                key="lockTimeoutConfiguration"
                required
                min="1"
                .helper=${this.hass.localize(
                  "ui.panel.config.zwave_js.node_installer.capability_controls.door_lock.lock_timeout_helper"
                )}
              >
              </ha-textfield>
            </div>
          `
        : nothing}
      ${this._capabilities?.twistAssistSupported
        ? html`
            <div class="row">
              <ha-formfield
                .label=${this.hass.localize(
                  "ui.panel.config.zwave_js.node_installer.capability_controls.door_lock.twist_assist"
                )}
              >
                <ha-switch
                  @change=${this._booleanChanged}
                  key="twistAssist"
                  .checked=${this._configuration?.twistAssist}
                >
                </ha-switch>
              </ha-formfield>
            </div>
          `
        : nothing}
      ${this._capabilities?.blockToBlockSupported
        ? html`
            <div class="row">
              <ha-formfield
                .label=${this.hass.localize(
                  "ui.panel.config.zwave_js.node_installer.capability_controls.door_lock.block_to_block"
                )}
              >
                <ha-switch
                  @change=${this._booleanChanged}
                  key="blockToBlock"
                  .checked=${this._configuration?.blockToBlock}
                >
                </ha-switch>
              </ha-formfield>
            </div>
          `
        : nothing}
      ${this._capabilities?.autoRelockSupported
        ? html`
            <div class="row">
              <ha-textfield
                type="number"
                .label=${this.hass.localize(
                  "ui.panel.config.zwave_js.node_installer.capability_controls.door_lock.auto_relock_time"
                )}
                .value=${this._configuration?.autoRelockTime?.toString() ?? ""}
                @change=${this._numberChanged}
                key="autoRelockTime"
              >
              </ha-textfield>
            </div>
          `
        : nothing}
      ${this._capabilities?.holdAndReleaseSupported
        ? html`
            <div class="row">
              <ha-textfield
                type="number"
                .label=${this.hass.localize(
                  "ui.panel.config.zwave_js.node_installer.capability_controls.door_lock.hold_release_time"
                )}
                .value=${this._configuration?.holdAndReleaseTime?.toString() ??
                ""}
                @change=${this._numberChanged}
                key="holdAndReleaseTime"
              >
              </ha-textfield>
            </div>
          `
        : nothing}

      <div class="actions">
        <ha-progress-button
          @click=${isValid ? this._saveConfig : undefined}
          .disabled=${!isValid}
        >
          ${this.hass.localize("ui.common.save")}
        </ha-progress-button>
      </div>
    `;
  }

  protected firstUpdated() {
    this._loadConfiguration();
    this._loadCapabilities();
    this._loadCurrentDoorLockMode();
  }

  private async _loadConfiguration() {
    try {
      const config = await invokeZWaveCCApi<DoorLockConfiguration | null>(
        this.hass,
        this.device.id,
        this.command_class,
        this.endpoint,
        "getConfiguration",
        [],
        true
      );
      this._configuration = config ?? {
        // The server can return null but I think a real device will always have a configuration
        operationType: 1,
        outsideHandlesCanOpenDoorConfiguration: [false, false, false, false],
        insideHandlesCanOpenDoorConfiguration: [false, false, false, false],
      };
    } catch (err) {
      this._error = extractApiErrorMessage(err);
    }
  }

  private async _loadCapabilities() {
    try {
      const capabilities = await invokeZWaveCCApi<DoorLockCapabilities | null>(
        this.hass,
        this.device.id,
        this.command_class,
        this.endpoint,
        "getCapabilities",
        [],
        true
      );
      this._capabilities = capabilities ?? DEFAULT_CAPABILITIES;
    } catch (err: any) {
      if (
        err?.code === "FailedZWaveCommand" &&
        err?.message.includes("ZW0302")
      ) {
        // getCapabilities is not supported by some devices
        this._capabilities = DEFAULT_CAPABILITIES;
      } else {
        this._error = extractApiErrorMessage(err);
      }
    }
  }

  private async _loadCurrentDoorLockMode() {
    try {
      const data = await invokeZWaveCCApi<{
        currentMode: DoorLockMode;
      } | null>(
        this.hass,
        this.device.id,
        this.command_class,
        this.endpoint,
        "get",
        [],
        true
      );
      this._currentDoorLockMode = data?.currentMode ?? DEFAULT_MODE;
    } catch (err) {
      this._error = extractApiErrorMessage(err);
    }
  }

  private _isValid() {
    return (
      this._configuration &&
      this._currentDoorLockMode &&
      (this._configuration.operationType !== 2 ||
        this._configuration.lockTimeoutConfiguration) &&
      !(
        this._configuration.operationType !== 2 &&
        TIMED_MODES.includes(this._currentDoorLockMode)
      )
    );
  }

  private _operationTypeChanged(ev: CustomEvent) {
    const target = ev.target as HTMLSelectElement;
    const newType = parseInt(target.value);
    if (this._configuration) {
      this._configuration = {
        ...this._configuration,
        operationType: newType,
        // Clear the timeout configuration if switching away from timed operation
        lockTimeoutConfiguration:
          newType === 2
            ? this._configuration.lockTimeoutConfiguration
            : undefined,
      };
    }
    if (
      newType !== 2 &&
      this._currentDoorLockMode &&
      TIMED_MODES.includes(this._currentDoorLockMode)
    ) {
      // timed modes are not allowed for non-timed operation
      this._currentDoorLockMode = DEFAULT_MODE;
    }
  }

  private _booleanChanged(ev: CustomEvent) {
    const target = ev.target as HaSwitch;
    const key = target.getAttribute("key")!;
    if (this._configuration) {
      this._configuration = {
        ...this._configuration,
        [key]: target.checked,
      };
    }
  }

  private _numberChanged(ev: CustomEvent) {
    const target = ev.target as HTMLInputElement;
    const key = target.getAttribute("key")!;
    const value = parseInt(target.value);
    if (this._configuration) {
      this._configuration = {
        ...this._configuration,
        [key]: Number.isNaN(value) ? undefined : value,
      };
    }
  }

  private _doorLockModeChanged(ev: CustomEvent) {
    const target = ev.target as HTMLSelectElement;
    this._currentDoorLockMode = parseInt(target.value) as DoorLockMode;
  }

  private async _saveConfig(ev: CustomEvent) {
    const button = ev.target as HaProgressButton;
    if (!this._configuration) return;

    button.progress = true;
    this._error = undefined;

    try {
      await invokeZWaveCCApi(
        this.hass,
        this.device.id,
        this.command_class,
        this.endpoint,
        "setConfiguration",
        [this._configuration],
        true
      );
      await invokeZWaveCCApi(
        this.hass,
        this.device.id,
        this.command_class,
        this.endpoint,
        "set",
        [this._currentDoorLockMode],
        true
      );
      button.actionSuccess();
    } catch (err) {
      this._error = extractApiErrorMessage(err);
      button.actionError();
    }

    button.progress = false;
  }

  static styles = css`
    .row {
      margin-top: 8px;
      margin-bottom: 8px;
    }
    .actions {
      text-align: right;
      margin-top: 16px;
    }
    ha-textfield {
      display: block;
      width: 100%;
    }
    .loading {
      padding: 16px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "zwave_js-capability-control-door_lock": ZWaveJSCapabilityDoorLock;
  }
}
