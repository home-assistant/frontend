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
  getZwaveJsIdentifiersFromDevice,
  ZWaveJSNodeIdentifiers,
  ZwaveJSNodeMetadata,
  fetchZwaveNodeMetadata,
} from "../../../../../../data/zwave_js";
import { haStyle } from "../../../../../../resources/styles";
import { HomeAssistant } from "../../../../../../types";

@customElement("ha-device-alerts-zwave_js")
export class HaDeviceAlertsZWaveJS extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public device!: DeviceRegistryEntry;

  @state() private _entryId?: string;

  @state() private _configEntry?: ConfigEntry;

  @state() private _multipleConfigEntries = false;

  @state() private _nodeId?: number;

  @state() private _nodeMetadata?: ZwaveJSNodeMetadata;

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

    const configEntries = await getConfigEntries(this.hass, {
      domain: "zwave_js",
    });
    let zwaveJsConfEntries = 0;
    for (const entry of configEntries) {
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

    this._nodeMetadata = await fetchZwaveNodeMetadata(
      this.hass,
      this._entryId,
      this._nodeId
    );
  }

  protected render(): TemplateResult {
    if (!this._nodeMetadata || this._nodeMetadata.comments?.length <= 0) {
      return html``;
    }
    return html`
      <div>
        ${this._nodeMetadata.comments.map(
          (comment) => html`<ha-alert .alertType=${comment.level}>
            ${comment.text}
          </ha-alert>`
        )}
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

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-alerts-zwave_js": HaDeviceAlertsZWaveJS;
  }
}
