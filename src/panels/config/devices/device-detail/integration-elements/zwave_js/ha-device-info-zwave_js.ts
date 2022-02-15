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
  ConfigEntry,
  getConfigEntries,
} from "../../../../../../data/config_entries";
import {
  fetchZwaveNodeStatus,
  getZwaveJsIdentifiersFromDevice,
  nodeStatus,
  ZWaveJSNodeStatus,
  ZWaveJSNodeIdentifiers,
  SecurityClass,
} from "../../../../../../data/zwave_js";
import { haStyle } from "../../../../../../resources/styles";
import { HomeAssistant } from "../../../../../../types";

@customElement("ha-device-info-zwave_js")
export class HaDeviceInfoZWaveJS extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public device!: DeviceRegistryEntry;

  @state() private _entryId?: string;

  @state() private _configEntry?: ConfigEntry;

  @state() private _multipleConfigEntries = false;

  @state() private _nodeId?: number;

  @state() private _node?: ZWaveJSNodeStatus;

  protected updated(changedProperties: PropertyValues) {
    if (changedProperties.has("device")) {
      const identifiers: ZWaveJSNodeIdentifiers | undefined =
        getZwaveJsIdentifiersFromDevice(this.device);
      if (!identifiers) {
        return;
      }
      this._nodeId = identifiers.node_id;
      this._entryId = this.device.config_entries[0];

      this._fetchNodeDetails();
    }
  }

  protected async _fetchNodeDetails() {
    if (!this._nodeId || !this._entryId) {
      return;
    }

    const configEntries = await getConfigEntries(this.hass);
    let zwaveJsConfEntries = 0;
    for (const entry of configEntries) {
      if (entry.domain !== "zwave_js") {
        continue;
      }
      if (zwaveJsConfEntries) {
        this._multipleConfigEntries = true;
      }
      if (entry.entry_id === this._entryId) {
        this._configEntry = entry;
      }
      if (this._configEntry && this._multipleConfigEntries) {
        break;
      }
      zwaveJsConfEntries++;
    }

    this._node = await fetchZwaveNodeStatus(
      this.hass,
      this._entryId,
      this._nodeId
    );
  }

  protected render(): TemplateResult {
    if (!this._node) {
      return html``;
    }
    return html`
      <h4>
        ${this.hass.localize("ui.panel.config.zwave_js.device_info.zwave_info")}
      </h4>
      ${this._multipleConfigEntries
        ? html`
            <div>
              ${this.hass.localize("ui.panel.config.zwave_js.common.source")}:
              ${this._configEntry!.title}
            </div>
          `
        : ""}
      <div>
        ${this.hass.localize("ui.panel.config.zwave_js.common.node_id")}:
        ${this._node.node_id}
      </div>
      ${!this._node.is_controller_node
        ? html`
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
            <div>
              ${this.hass.localize(
                "ui.panel.config.zwave_js.device_info.highest_security"
              )}:
              ${this._node.highest_security_class !== null
                ? this.hass.localize(
                    `ui.panel.config.zwave_js.security_classes.${
                      SecurityClass[this._node.highest_security_class]
                    }.title`
                  )
                : this._node.is_secure === false
                ? this.hass.localize(
                    "ui.panel.config.zwave_js.security_classes.none.title"
                  )
                : this.hass.localize(
                    "ui.panel.config.zwave_js.device_info.unknown"
                  )}
            </div>
            <div>
              ${this.hass.localize(
                "ui.panel.config.zwave_js.device_info.zwave_plus"
              )}:
              ${this._node.zwave_plus_version
                ? this.hass.localize(
                    "ui.panel.config.zwave_js.device_info.zwave_plus_version",
                    "version",
                    this._node.zwave_plus_version
                  )
                : this.hass.localize("ui.common.no")}
            </div>
          `
        : ""}
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
