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
  getIdentifiersFromDevice,
  ZWaveJSNodeIdentifiers,
} from "../../../../../../data/zwave_js";
import { haStyle } from "../../../../../../resources/styles";
import { HomeAssistant } from "../../../../../../types";
import { showZWaveJSReinterviewNodeDialog } from "../../../../integrations/integration-panels/zwave_js/show-dialog-zwave_js-reinterview-node";
import { showZWaveJSHealNodeDialog } from "../../../../integrations/integration-panels/zwave_js/show-dialog-zwave_js-heal-node";
import { showZWaveJSRemoveFailedNodeDialog } from "../../../../integrations/integration-panels/zwave_js/show-dialog-zwave_js-remove-failed-node";

@customElement("ha-device-actions-zwave_js")
export class HaDeviceActionsZWaveJS extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public device!: DeviceRegistryEntry;

  @state() private _entryId?: string;

  @state() private _nodeId?: number;

  protected updated(changedProperties: PropertyValues) {
    if (changedProperties.has("device")) {
      this._entryId = this.device.config_entries[0];

      const identifiers: ZWaveJSNodeIdentifiers | undefined =
        getIdentifiersFromDevice(this.device);
      if (!identifiers) {
        return;
      }
      this._nodeId = identifiers.node_id;
    }
  }

  protected render(): TemplateResult {
    return html`
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
        ${this.hass.localize("ui.panel.config.zwave_js.device_info.heal_node")}
      </mwc-button>
      <mwc-button @click=${this._removeFailedNode}>
        ${this.hass.localize(
          "ui.panel.config.zwave_js.device_info.remove_failed"
        )}
      </mwc-button>
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
