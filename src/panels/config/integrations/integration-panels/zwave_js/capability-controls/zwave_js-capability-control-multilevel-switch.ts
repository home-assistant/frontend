import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../../components/buttons/ha-progress-button";
import type { HaProgressButton } from "../../../../../../components/buttons/ha-progress-button";
import "../../../../../../components/ha-alert";
import "../../../../../../components/ha-formfield";
import "../../../../../../components/ha-select";
import type { HaSelectSelectEvent } from "../../../../../../components/ha-select";
import "../../../../../../components/ha-switch";
import type { HaSwitch } from "../../../../../../components/ha-switch";
import "../../../../../../components/ha-textfield";
import type { HaTextField } from "../../../../../../components/ha-textfield";
import type { DeviceRegistryEntry } from "../../../../../../data/device/device_registry";
import { extractApiErrorMessage } from "../../../../../../data/hassio/common";
import { invokeZWaveCCApi } from "../../../../../../data/zwave_js";
import type { HomeAssistant } from "../../../../../../types";

@customElement("zwave_js-capability-control-multilevel_switch")
class ZWaveJSCapabilityMultiLevelSwitch extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public device!: DeviceRegistryEntry;

  @property({ type: Number }) public endpoint!: number;

  @property({ type: Number }) public command_class!: number;

  @property({ type: Number }) public version!: number;

  @property({ attribute: false }) public transform_options?: (
    opts: Record<string, any>,
    control: string
  ) => unknown;

  @state() private _error?: string;

  @state() private _direction = "up";

  protected render() {
    return html`
      <h3>
        ${this.hass.localize(
          "ui.panel.config.zwave_js.node_installer.capability_controls.multilevel_switch.title"
        )}
      </h3>
      ${this._error
        ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
        : nothing}
      <ha-select
        .label=${this.hass.localize(
          "ui.panel.config.zwave_js.node_installer.capability_controls.multilevel_switch.direction"
        )}
        .value=${this._direction}
        .options=${[
          {
            value: "up",
            label: this.hass.localize(
              "ui.panel.config.zwave_js.node_installer.capability_controls.multilevel_switch.up"
            ),
          },
          {
            value: "down",
            label: this.hass.localize(
              "ui.panel.config.zwave_js.node_installer.capability_controls.multilevel_switch.down"
            ),
          },
        ]}
        @selected=${this._directionChanged}
      >
      </ha-select>
      <ha-formfield
        .label=${this.hass.localize(
          "ui.panel.config.zwave_js.node_installer.capability_controls.multilevel_switch.ignore_start_level"
        )}
      >
        <ha-switch id="ignore_start_level"></ha-switch>
      </ha-formfield>
      <ha-textfield
        type="number"
        id="start_level"
        value="0"
        .label=${this.hass.localize(
          "ui.panel.config.zwave_js.node_installer.capability_controls.multilevel_switch.start_level"
        )}
      ></ha-textfield>
      <div class="actions">
        <ha-progress-button
          .control=${"startLevelChange"}
          @click=${this._controlTransition}
        >
          ${this.hass.localize(
            "ui.panel.config.zwave_js.node_installer.capability_controls.multilevel_switch.start_transition"
          )}
        </ha-progress-button>
        <ha-progress-button
          .control=${"stopLevelChange"}
          @click=${this._controlTransition}
        >
          ${this.hass.localize(
            "ui.panel.config.zwave_js.node_installer.capability_controls.multilevel_switch.stop_transition"
          )}
        </ha-progress-button>
      </div>
    `;
  }

  private async _controlTransition(ev: any) {
    const control = ev.currentTarget!.control;
    const button = ev.currentTarget as HaProgressButton;
    button.progress = true;

    const ignoreStartLevel = (
      this.shadowRoot!.getElementById("ignore_start_level") as HaSwitch
    ).checked;

    const startLevel = Number(
      (this.shadowRoot!.getElementById("start_level")! as HaTextField).value
    );

    const options = {
      direction: this._direction,
      ignoreStartLevel,
      startLevel,
    };

    try {
      button.actionSuccess();
      await invokeZWaveCCApi(
        this.hass,
        this.device.id,
        this.command_class,
        this.endpoint,
        control,
        [
          this.transform_options
            ? this.transform_options(options, control)
            : options,
        ],
        true
      );
    } catch (err) {
      button.actionError();
      this._error = this.hass.localize(
        "ui.panel.config.zwave_js.node_installer.capability_controls.multilevel_switch.control_failed",
        { error: extractApiErrorMessage(err) }
      );
    }

    button.progress = false;
  }

  private _directionChanged(ev: HaSelectSelectEvent) {
    this._direction = ev.detail.value;
  }

  static styles = css`
    ha-select,
    ha-formfield,
    ha-textfield {
      display: block;
      margin-bottom: 8px;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "zwave_js-capability-control-multilevel_switch": ZWaveJSCapabilityMultiLevelSwitch;
  }
}
