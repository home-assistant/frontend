import {
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
  TemplateResult,
  css,
  PropertyValues,
} from "lit-element";
import { DeviceRegistryEntry } from "../../../../../../data/device_registry";
import { haStyle } from "../../../../../../resources/styles";
import { HomeAssistant } from "../../../../../../types";
import { OZWDevice, fetchOZWNodeStatus } from "../../../../../../data/ozw";

@customElement("ha-device-info-ozw")
export class HaDeviceInfoOzw extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public device!: DeviceRegistryEntry;

  @internalProperty() private _ozwDevice?: OZWDevice;

  protected updated(changedProperties: PropertyValues) {
    if (changedProperties.has("device")) {
      const ozwConnection = this.device.identifiers.find(
        (conn) => conn[0] === "ozw"
      );
      if (!ozwConnection) {
        return;
      }
      const identifiers = ozwConnection[1].split(".");
      fetchOZWNodeStatus(this.hass, identifiers[0], identifiers[1]).then(
        (device) => {
          this._ozwDevice = device;
        }
      );
    }
  }

  protected render(): TemplateResult {
    if (!this._ozwDevice) {
      return html``;
    }
    return html`
      <h4>
        ${this.hass.localize("ui.panel.config.ozw.device_info.zwave_info")}
      </h4>
      <div>
        ${this.hass.localize("ui.panel.config.ozw.common.node_id")}:
        ${this._ozwDevice.node_id}
      </div>
      <div>
        ${this.hass.localize("ui.panel.config.ozw.device_info.stage")}:
        ${this._ozwDevice.node_query_stage}
      </div>
      <div>
        ${this.hass.localize("ui.panel.config.ozw.common.ozw_instance")}:
        ${this._ozwDevice.ozw_instance}
      </div>
      <div>
        ${this.hass.localize("ui.panel.config.ozw.device_info.node_failed")}:
        ${this._ozwDevice.is_failed
          ? this.hass.localize("ui.common.yes")
          : this.hass.localize("ui.common.no")}
      </div>
    `;
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        h4 {
          margin-bottom: 4px;
        }
        div {
          word-break: break-all;
          margin-top: 2px;
        }
      `,
    ];
  }
}
