import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../../../components/ha-button";
import { DeviceRegistryEntry } from "../../../../../../data/device_registry";
import { HomeAssistant } from "../../../../../../types";
import { invokeZWaveCCApi } from "../../../../../../data/zwave_js";

@customElement("zwave_js-capability-control-multilevel_switch")
class ZWaveJSCapabilityMultiLevelSwitch extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public device!: DeviceRegistryEntry;

  @property({ type: Number }) public endpoint!: number;

  @property({ type: Number }) public command_class!: number;

  @property({ type: Number }) public version!: number;

  protected render() {
    return html`<h3>Transition</h3>
      <ha-select label="Direction" id="direction">
        <mwc-list-item .value=${"up"} selected>Up</mwc-list-item>
        <mwc-list-item .value=${"down"}>Down</mwc-list-item>
      </ha-select>
      <ha-formfield label="Ignore start level">
        <ha-switch id="ignore_start_level"></ha-switch>
      </ha-formfield>
      <ha-textfield
        type="number"
        id="start_level"
        value="0"
        label="Start level"
      ></ha-textfield>
      <ha-button @click=${this._startTransition}>Start transition</ha-button>
      <ha-button @click=${this._stopTransition}>Stop transition</ha-button>`;
  }

  private async _startTransition() {
    const direction = (this.shadowRoot!.getElementById("direction") as any)
      .value;

    const ignoreStartLevel = (
      this.shadowRoot!.getElementById("ignore_start_level") as any
    ).checked;

    const startLevel = Number(
      (this.shadowRoot!.getElementById("start_level") as any).value
    );

    await invokeZWaveCCApi(
      this.hass,
      this.device.id,
      this.command_class,
      this.endpoint,
      "startLevelChange",
      [{ direction, ignoreStartLevel, startLevel }],
      true
    );
  }

  private async _stopTransition() {
    const direction = (this.shadowRoot!.getElementById("direction") as any)
      .value;

    const ignoreStartLevel = (
      this.shadowRoot!.getElementById("ignore_start_level") as any
    ).checked;

    const startLevel = Number(
      (this.shadowRoot!.getElementById("start_level") as any).value
    );

    await invokeZWaveCCApi(
      this.hass,
      this.device.id,
      this.command_class,
      this.endpoint,
      "stopLevelChange",
      [{ direction, ignoreStartLevel, startLevel }],
      true
    );
  }

  static styles = css`
    ha-select,
    ha-formfield,
    ha-textfield {
      display: block;
      margin-bottom: 8px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "zwave_js-capability-control-multilevel_switch": ZWaveJSCapabilityMultiLevelSwitch;
  }
}
