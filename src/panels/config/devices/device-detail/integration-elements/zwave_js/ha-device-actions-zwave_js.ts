import "@material/mwc-button/mwc-button";
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
  fetchZwaveNodeStatus,
  getZwaveJsIdentifiersFromDevice,
  ZWaveJSNodeIdentifiers,
  ZWaveJSNodeStatus,
} from "../../../../../../data/zwave_js";
import { haStyle } from "../../../../../../resources/styles";
import { HomeAssistant } from "../../../../../../types";
import { showZWaveJSReinterviewNodeDialog } from "../../../../integrations/integration-panels/zwave_js/show-dialog-zwave_js-reinterview-node";
import { showZWaveJSHealNodeDialog } from "../../../../integrations/integration-panels/zwave_js/show-dialog-zwave_js-heal-node";
import { showZWaveJSRemoveFailedNodeDialog } from "../../../../integrations/integration-panels/zwave_js/show-dialog-zwave_js-remove-failed-node";
import { getConfigEntries } from "../../../../../../data/config_entries";

@customElement("ha-device-actions-zwave_js")
export class HaDeviceActionsZWaveJS extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public device!: DeviceRegistryEntry;

  @state() private _entryId?: string;

  @state() private _nodeId?: number;

  @state() private _node?: ZWaveJSNodeStatus;

  public willUpdate(changedProperties: PropertyValues) {
    if (changedProperties.has("device")) {
      this._fetchNodeDetails();
    }
  }

  protected async _fetchNodeDetails() {
    this._node = undefined;

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
      ${!this._node.is_controller_node
        ? html`
            <a
              .href=${`/config/zwave_js/node_config/${this.device.id}?config_entry=${this._entryId}`}
            >
              <mwc-button>
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.device_info.device_config"
                )}
              </mwc-button>
            </a>
            <mwc-button @click=${this._reinterviewClicked}>
              ${this.hass.localize(
                "ui.panel.config.zwave_js.device_info.reinterview_device"
              )}
            </mwc-button>
            <mwc-button @click=${this._healNodeClicked}>
              ${this.hass.localize(
                "ui.panel.config.zwave_js.device_info.heal_node"
              )}
            </mwc-button>
            <mwc-button @click=${this._removeFailedNode}>
              ${this.hass.localize(
                "ui.panel.config.zwave_js.device_info.remove_failed"
              )}
            </mwc-button>
          `
        : ""}
    `;
  }

  private async _reinterviewClicked() {
    if (!this._nodeId || !this._entryId) {
      return;
    }
    showZWaveJSReinterviewNodeDialog(this, {
      entry_id: this._entryId,
      node_id: this._nodeId,
    });
  }

  private async _healNodeClicked() {
    if (!this._nodeId || !this._entryId) {
      return;
    }
    showZWaveJSHealNodeDialog(this, {
      entry_id: this._entryId,
      node_id: this._nodeId,
      device: this.device,
    });
  }

  private async _removeFailedNode() {
    if (!this._nodeId || !this._entryId) {
      return;
    }
    showZWaveJSRemoveFailedNodeDialog(this, {
      entry_id: this._entryId,
      node_id: this._nodeId,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        a {
          text-decoration: none;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-actions-zwave_js": HaDeviceActionsZWaveJS;
  }
}
