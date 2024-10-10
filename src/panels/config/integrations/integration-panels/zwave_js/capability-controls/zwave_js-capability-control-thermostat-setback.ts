import { LitElement, css, html } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { DeviceRegistryEntry } from "../../../../../../data/device_registry";
import { HomeAssistant } from "../../../../../../types";
import { invokeZWaveCCApi } from "../../../../../../data/zwave_js";
import "../../../../../../components/ha-button";
import "../../../../../../components/buttons/ha-progress-button";
import "../../../../../../components/ha-textfield";
import "../../../../../../components/ha-select";
import "../../../../../../components/ha-list-item";
import type { HaSelect } from "../../../../../../components/ha-select";
import type { HaTextField } from "../../../../../../components/ha-textfield";
import { extractApiErrorMessage } from "../../../../../../data/hassio/common";
import type { HaProgressButton } from "../../../../../../components/buttons/ha-progress-button";

// enum with special states
enum SpecialState {
  frost_protection = "Frost Protection",
  energy_saving = "Energy Saving",
  unused = "Unused",
}

// enum with setback type
enum SetbackType {
  None = "none",
  Temporary = "temporary",
  Permanent = "permanent",
}

@customElement("zwave_js-capability-control-thermostat_setback")
class ZWaveJSCapabilityThermostatSetback extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public device!: DeviceRegistryEntry;

  @property({ type: Number }) public endpoint!: number;

  @property({ type: Number }) public command_class!: number;

  @property({ type: Number }) public version!: number;

  @state() private _disableSetbackState = false;

  @query("#setback_type") private _setbackTypeInput!: HaSelect;

  @query("#setback_state") private _setbackStateInput!: HaTextField;

  @query("#setback_special_state")
  private _setbackSpecialStateSelect!: HaSelect;

  @state() private _error?: string;

  protected render() {
    return html`
      <h3>
        ${this.hass.localize(
          `ui.panel.config.zwave_js.node_installer.capability_controls.thermostat_setback.title`
        )}
      </h3>
      ${this._error
        ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
        : ""}
      <ha-select
        .label=${this.hass.localize(
          `ui.panel.config.zwave_js.node_installer.capability_controls.thermostat_setback.setback_type.label`
        )}
        id="setback_type"
        .value=${SetbackType.None}
      >
        ${Object.values(SetbackType).map(
          (type) =>
            html`<ha-list-item .value=${type}>
              ${this.hass.localize(
                `ui.panel.config.zwave_js.node_installer.capability_controls.thermostat_setback.setback_type.${type}`
              )}
            </ha-list-item>`
        )}
      </ha-select>
      <div class="setback-state">
        <ha-textfield
          type="number"
          id="setback_state"
          value="0"
          .label=${this.hass.localize(
            `ui.panel.config.zwave_js.node_installer.capability_controls.thermostat_setback.setback_state_label`
          )}
          min="-12.8"
          max="12.0"
          step=".1"
          .helper=${this.hass.localize(
            `ui.panel.config.zwave_js.node_installer.capability_controls.thermostat_setback.setback_state_helper`
          )}
          .disabled=${this._disableSetbackState}
        ></ha-textfield>
        <ha-select
          .label=${this.hass.localize(
            `ui.panel.config.zwave_js.node_installer.capability_controls.thermostat_setback.setback_special_state.label`
          )}
          id="setback_special_state"
          @change=${this._changeSpecialState}
        >
          <ha-list-item selected> </ha-list-item>
          ${Object.keys(SpecialState).map(
            (specialState) =>
              html`<ha-list-item .value=${specialState}>
                ${this.hass.localize(
                  `ui.panel.config.zwave_js.node_installer.capability_controls.thermostat_setback.setback_special_state.${specialState}`
                )}
              </ha-list-item>`
          )}
        </ha-select>
      </div>
      <div class="actions">
        <ha-button class="clear-button" @click=${this._clear}
          >${this.hass.localize("ui.common.clear")}</ha-button
        >
        <ha-progress-button @click=${this._saveSetback}>
          ${this.hass.localize("ui.common.save")}
        </ha-progress-button>
      </div>
    `;
  }

  private _changeSpecialState() {
    this._disableSetbackState = !!this._setbackSpecialStateSelect.value;
  }

  private async _saveSetback(ev: CustomEvent) {
    const button = ev.currentTarget as HaProgressButton;
    button.progress = true;

    this._error = undefined;
    const setbackType = this._setbackStateInput.value;
    let setbackState = this._setbackStateInput.value;
    if (this._setbackSpecialStateSelect.value) {
      setbackState = this._setbackSpecialStateSelect.value;
    }

    try {
      await invokeZWaveCCApi(
        this.hass,
        this.device.id,
        this.command_class,
        this.endpoint,
        "set",
        [
          {
            setbackType,
            setbackState,
          },
        ],
        true
      );
      button.actionSuccess();
    } catch (err) {
      button.actionError();
      this._error = this.hass.localize(
        "ui.panel.config.zwave_js.node_installer.capability_controls.thermostat_setback.save_setback_failed",
        { error: extractApiErrorMessage(err) }
      );
    }

    button.progress = false;
  }

  private _clear() {
    this._error = undefined;
    this._setbackTypeInput.value = SetbackType.None;
    this._setbackStateInput.value = "0";
    this._setbackSpecialStateSelect.value = "";
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 16px;
    }
    :host > ha-select {
      width: 100%;
    }
    .actions {
      width: 100%;
      display: flex;
      justify-content: flex-end;
    }
    .actions .clear-button {
      --mdc-theme-primary: var(--red-color);
    }
    .setback-state {
      width: 100%;
      display: flex;
      gap: 16px;
    }
    .setback-state ha-select,
    ha-textfield {
      flex: 1;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "zwave_js-capability-control-thermostat_setback": ZWaveJSCapabilityThermostatSetback;
  }
}
