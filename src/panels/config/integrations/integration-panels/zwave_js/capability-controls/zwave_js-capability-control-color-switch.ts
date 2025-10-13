import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { DeviceRegistryEntry } from "../../../../../../data/device_registry";
import type { HomeAssistant } from "../../../../../../types";
import { invokeZWaveCCApi } from "../../../../../../data/zwave_js";
import "../../../../../../components/ha-alert";
import "../../../../../../components/ha-spinner";
import { extractApiErrorMessage } from "../../../../../../data/hassio/common";
import "./zwave_js-capability-control-multilevel-switch";

enum ColorComponent {
  "Warm White" = 0,
  "Cold White",
  Red,
  Green,
  Blue,
  Amber,
  Cyan,
  Purple,
  Index,
}

@customElement("zwave_js-capability-control-color_switch")
class ZWaveJSCapabilityColorSwitch extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public device!: DeviceRegistryEntry;

  @property({ type: Number }) public endpoint!: number;

  @property({ type: Number }) public command_class!: number;

  @property({ type: Number }) public version!: number;

  @state() private _color_components?: ColorComponent[];

  @state() private _error?: string;

  protected render() {
    if (this._error) {
      return html`<ha-alert alert-type="error">${this._error}</ha-alert>`;
    }
    if (!this._color_components) {
      return html`<ha-spinner></ha-spinner>`;
    }
    return this._color_components.map(
      (color) =>
        html` <h5>
            ${this.hass.localize(
              "ui.panel.config.zwave_js.node_installer.capability_controls.color_switch.color_component"
            )}:
            ${this.hass.localize(
              `ui.panel.config.zwave_js.node_installer.capability_controls.color_switch.colors.${color}`
            )}
          </h5>
          <zwave_js-capability-control-multilevel_switch
            .hass=${this.hass}
            .device=${this.device}
            .endpoint=${this.endpoint}
            .command_class=${this.command_class}
            .version=${this.version}
            .transform_options=${this._transformOptions(color)}
          ></zwave_js-capability-control-multilevel_switch>`
    );
  }

  protected async firstUpdated() {
    try {
      this._color_components = (await invokeZWaveCCApi(
        this.hass,
        this.device.id,
        this.command_class,
        this.endpoint,
        "getSupported",
        [],
        true
      )) as number[];
    } catch (error) {
      this._error = extractApiErrorMessage(error);
    }
  }

  private _transformOptions(color: number) {
    return (opts: Record<string, any>, control: string) =>
      control === "startLevelChange"
        ? {
            ...opts,
            colorComponent: color,
          }
        : color;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zwave_js-capability-control-color_switch": ZWaveJSCapabilityColorSwitch;
  }
}
