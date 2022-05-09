import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { DeviceRegistryEntry } from "../../../../../../data/device_registry";
import { getConfigEntries } from "../../../../../../data/config_entries";
import {
  getZwaveJsIdentifiersFromDevice,
  ZWaveJSNodeIdentifiers,
  ZwaveJSNodeComments,
  fetchZwaveNodeComments,
} from "../../../../../../data/zwave_js";
import { HomeAssistant } from "../../../../../../types";

@customElement("ha-device-alerts-zwave_js")
export class HaDeviceAlertsZWaveJS extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public device!: DeviceRegistryEntry;

  @state() private _entryId?: string;

  @state() private _nodeId?: number;

  @state() private _nodeComments?: ZwaveJSNodeComments;

  protected willUpdate(changedProperties: PropertyValues) {
    super.willUpdate(changedProperties);
    if (changedProperties.has("device")) {
      this._fetchNodeDetails();
    }
  }

  private async _fetchNodeDetails() {
    this._nodeComments = undefined;

    const identifiers: ZWaveJSNodeIdentifiers | undefined =
      getZwaveJsIdentifiersFromDevice(this.device);
    if (!identifiers) {
      return;
    }
    this._nodeId = identifiers.node_id;

    const configEntries = await getConfigEntries(this.hass, {
      domain: "zwave_js",
    });

    const configEntry = configEntries.find((entry) =>
      this.device.config_entries.includes(entry.entry_id)
    );

    if (!configEntry) {
      return;
    }

    this._entryId = configEntry.entry_id;

    this._nodeComments = await fetchZwaveNodeComments(
      this.hass,
      this._entryId,
      this._nodeId
    );
  }

  protected render(): TemplateResult {
    if (this._nodeComments?.comments?.length <= 0) {
      return html``;
    }
    return html`
      <div>
        ${this._nodeComments.comments.map(
          (comment) => html`<ha-alert .alertType=${comment.level}>
            ${comment.text}
          </ha-alert>`
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-alerts-zwave_js": HaDeviceAlertsZWaveJS;
  }
}
