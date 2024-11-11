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
import "../../../../../../components/ha-circular-progress";
import type { HaSwitch } from "../../../../../../components/ha-switch";
import type { HaProgressButton } from "../../../../../../components/buttons/ha-progress-button";
import { extractApiErrorMessage } from "../../../../../../data/hassio/common";

type DoorHandleStatus = [boolean, boolean, boolean, boolean];

type DoorLockConfiguration = {
  operationType: number;
  outsideHandlesCanOpenDoorConfiguration: DoorHandleStatus;
  insideHandlesCanOpenDoorConfiguration: DoorHandleStatus;
  lockTimeoutConfiguration?: number;
  autoRelockTime?: number;
  holdAndReleaseTime?: number;
  twistAssist?: boolean;
  blockToBlock?: boolean;
};

type DoorLockCapabilities = {
  supportedOperationTypes: number[];
  blockToBlockSupported?: boolean;
  twistAssistSupported?: boolean;
  holdAndReleaseSupported?: boolean;
  autoRelockSupported?: boolean;
};

@customElement("zwave_js-capability-control-door_lock")
class ZWaveJSCapabilityDoorLock extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public device!: DeviceRegistryEntry;

  @property({ type: Number }) public endpoint!: number;

  @property({ type: Number }) public command_class!: number;

  @property({ type: Number }) public version!: number;

  @state() private _configuration?: DoorLockConfiguration;

  @state() private _capabilities?: DoorLockCapabilities;

  @state() private _error?: string;

  protected render() {
    if (!this._configuration || !this._capabilities) {
      return html`<ha-circular-progress indeterminate></ha-circular-progress>`;
    }

    const isValid = this._isValid();

    return html`
      <h3>
        ${this.hass.localize(
          "ui.panel.config.zwave_js.node_installer.capability_controls.door_lock.title"
        )}
      </h3>

      ${this._error
        ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
        : ""}

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
      this._capabilities = capabilities ?? {
        supportedOperationTypes: [1, 2],
      };
    } catch (err) {
      this._error = extractApiErrorMessage(err);
    }
  }

  private _isValid() {
    return (
      this._configuration &&
      (this._configuration.operationType !== 2 ||
        this._configuration.lockTimeoutConfiguration)
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
  }

  private _booleanChanged(ev: CustomEvent) {
    const target = ev.target as HaSwitch;
    const key = ev.detail.key;
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
    if (this._configuration) {
      this._configuration = {
        ...this._configuration,
        [key]: parseInt(target.value),
      };
    }
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
