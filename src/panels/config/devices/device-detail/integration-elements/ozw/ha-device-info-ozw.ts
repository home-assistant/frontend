import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { DeviceRegistryEntry } from "../../../../../../data/device_registry";
import {
  fetchOZWNodeStatus,
  getIdentifiersFromDevice,
  OZWDevice,
  OZWNodeIdentifiers,
} from "../../../../../../data/ozw";
import { haStyle } from "../../../../../../resources/styles";
import { HomeAssistant } from "../../../../../../types";

@customElement("ha-device-info-ozw")
export class HaDeviceInfoOzw extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public device!: DeviceRegistryEntry;

  @property()
  private node_id = 0;

  @property()
  private ozw_instance = 1;

  @state() private _ozwDevice?: OZWDevice;

  protected updated(changedProperties: PropertyValues) {
    if (changedProperties.has("device")) {
      const identifiers: OZWNodeIdentifiers | undefined =
        getIdentifiersFromDevice(this.device);
      if (!identifiers) {
        return;
      }
      this.ozw_instance = identifiers.ozw_instance;
      this.node_id = identifiers.node_id;

      this._fetchNodeDetails();
    }
  }

  protected async _fetchNodeDetails() {
    this._ozwDevice = await fetchOZWNodeStatus(
      this.hass,
      this.ozw_instance,
      this.node_id
    );
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

  static get styles(): CSSResultGroup {
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
