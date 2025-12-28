import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../../components/buttons/ha-progress-button";
import type { DeviceRegistryEntry } from "../../../../../../data/device_registry";
import type { HomeAssistant } from "../../../../../../types";
import { invokeZWaveCCApi } from "../../../../../../data/zwave_js";
import "../../../../../../components/ha-textfield";
import "../../../../../../components/ha-select";
import "../../../../../../components/ha-list-item";
import "../../../../../../components/ha-alert";
import "../../../../../../components/ha-formfield";
import "../../../../../../components/ha-switch";
import type { HaProgressButton } from "../../../../../../components/buttons/ha-progress-button";
import type { HaSelect } from "../../../../../../components/ha-select";
import type { HaTextField } from "../../../../../../components/ha-textfield";
import type { HaSwitch } from "../../../../../../components/ha-switch";
import { extractApiErrorMessage } from "../../../../../../data/hassio/common";

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

  protected render() {
    return html`
      <h3>
        ${this.hass.localize(
          "ui.panel.config.zwave_js.node_installer.capability_controls.multilevel_switch.title"
        )}
      </h3>
      ${this._error
        ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
        : ""}
      <ha-select
        .label=${this.hass.localize(
          "ui.panel.config.zwave_js.node_installer.capability_controls.multilevel_switch.direction"
        )}
        id="direction"
      >
        <ha-list-item .value=${"up"} selected
          >${this.hass.localize(
            "ui.panel.config.zwave_js.node_installer.capability_controls.multilevel_switch.up"
          )}</ha-list-item
        >
        <ha-list-item .value=${"down"}
          >${this.hass.localize(
            "ui.panel.config.zwave_js.node_installer.capability_controls.multilevel_switch.down"
          )}</ha-list-item
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

    const direction = (this.shadowRoot!.getElementById("direction") as HaSelect)
      .value;

    const ignoreStartLevel = (
      this.shadowRoot!.getElementById("ignore_start_level") as HaSwitch
    ).checked;

    const startLevel = Number(
      (this.shadowRoot!.getElementById("start_level")! as HaTextField).value
    );

    const options = {
      direction,
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
