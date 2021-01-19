import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { DeviceRegistryEntry } from "../../../../../../data/device_registry";
import {
  getIdentifiersFromDevice,
  fetchNodeStatus,
  ZWaveJSNode,
  ZWaveJSNodeIdentifiers,
  nodeStatus,
} from "../../../../../../data/zwave_js";

import { haStyle } from "../../../../../../resources/styles";
import { HomeAssistant } from "../../../../../../types";

@customElement("ha-device-info-zwave_js")
export class HaDeviceInfoZWaveJS extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public device!: DeviceRegistryEntry;

  @internalProperty() private _entryId?: string;

  @internalProperty() private _nodeId?: number;

  @internalProperty() private _homeId?: string;

  @internalProperty() private _node?: ZWaveJSNode;

  protected updated(changedProperties: PropertyValues) {
    if (changedProperties.has("device")) {
      const identifiers:
        | ZWaveJSNodeIdentifiers
        | undefined = getIdentifiersFromDevice(this.device);
      if (!identifiers) {
        return;
      }
      this._homeId = identifiers.home_id;
      this._nodeId = identifiers.node_id;
      this._entryId = this.device.config_entries[0];

      this._fetchNodeDetails();
    }
  }

  protected async _fetchNodeDetails() {
    if (!this._nodeId || !this._entryId) {
      return;
    }
    this._node = await fetchNodeStatus(this.hass, this._entryId, this._nodeId);
  }

  protected render(): TemplateResult {
    if (!this._node) {
      return html``;
    }
    return html`
      <h4>
        ${this.hass.localize("ui.panel.config.zwave_js.device_info.zwave_info")}
      </h4>
      <div>
        ${this.hass.localize("ui.panel.config.zwave_js.common.home_id")}:
        ${this._homeId}
      </div>
      <div>
        ${this.hass.localize("ui.panel.config.zwave_js.common.node_id")}:
        ${this._node.node_id}
      </div>
      <div>
        ${this.hass.localize(
          "ui.panel.config.zwave_js.device_info.node_status"
        )}:
        ${this.hass.localize(
          `ui.panel.config.zwave_js.node_status.${
            nodeStatus[this._node.status]
          }`
        )}
      </div>
      <div>
        ${this.hass.localize(
          "ui.panel.config.zwave_js.device_info.node_ready"
        )}:
        ${this._node.ready
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
