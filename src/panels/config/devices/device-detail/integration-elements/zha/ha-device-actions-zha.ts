import {
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
  css,
  PropertyValues,
} from "lit-element";
import { DeviceRegistryEntry } from "../../../../../../data/device_registry";
import { haStyle } from "../../../../../../resources/styles";
import { HomeAssistant } from "../../../../../../types";
import {
  ZHADevice,
  fetchZHADevice,
  reconfigureNode,
} from "../../../../../../data/zha";
import { navigate } from "../../../../../../common/navigate";
import { showZHADeviceZigbeeInfoDialog } from "../../../../integrations/integration-panels/zha/show-dialog-zha-device-zigbee-info";
import { showConfirmationDialog } from "../../../../../../dialogs/generic/show-dialog-box";
import { showZHAClusterDialog } from "../../../../integrations/integration-panels/zha/show-dialog-zha-cluster";

@customElement("ha-device-actions-zha")
export class HaDeviceActionsZha extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public device!: DeviceRegistryEntry;

  @property() private _zhaDevice?: ZHADevice;

  protected updated(changedProperties: PropertyValues) {
    if (changedProperties.has("device")) {
      const zigbeeConnection = this.device.connections.find(
        (conn) => conn[0] === "zigbee"
      );
      if (!zigbeeConnection) {
        return;
      }
      fetchZHADevice(this.hass, zigbeeConnection[1]).then((device) => {
        this._zhaDevice = device;
      });
    }
  }

  protected render(): TemplateResult {
    if (!this._zhaDevice) {
      return html``;
    }
    return html`
      ${this._zhaDevice.device_type !== "Coordinator"
        ? html`
            <mwc-button @click=${this._onReconfigureNodeClick}>
              ${this.hass!.localize(
                "ui.dialogs.zha_device_info.buttons.reconfigure"
              )}
            </mwc-button>
          `
        : ""}
      ${this._zhaDevice.power_source === "Mains" &&
      (this._zhaDevice.device_type === "Router" ||
        this._zhaDevice.device_type === "Coordinator")
        ? html`
            <mwc-button @click=${this._onAddDevicesClick}>
              ${this.hass!.localize("ui.dialogs.zha_device_info.buttons.add")}
            </mwc-button>
          `
        : ""}
      ${this._zhaDevice.device_type !== "Coordinator"
        ? html`
            <mwc-button @click=${this._handleZigbeeInfoClicked}>
              ${this.hass!.localize(
                "ui.dialogs.zha_device_info.buttons.zigbee_information"
              )}
            </mwc-button>
            <mwc-button @click=${this._showClustersDialog}>
              ${this.hass!.localize(
                "ui.dialogs.zha_device_info.buttons.clusters"
              )}
            </mwc-button>
            <mwc-button class="warning" @click=${this._removeDevice}>
              ${this.hass!.localize(
                "ui.dialogs.zha_device_info.buttons.remove"
              )}
            </mwc-button>
          `
        : ""}
    `;
  }

  private async _showClustersDialog(): Promise<void> {
    await showZHAClusterDialog(this, { device: this._zhaDevice! });
  }

  private async _onReconfigureNodeClick(): Promise<void> {
    if (!this.hass) {
      return;
    }
    reconfigureNode(this.hass, this._zhaDevice!.ieee);
  }

  private _onAddDevicesClick() {
    navigate(this, "/config/zha/add/" + this._zhaDevice!.ieee);
  }

  private async _handleZigbeeInfoClicked() {
    showZHADeviceZigbeeInfoDialog(this, { device: this._zhaDevice! });
  }

  private async _removeDevice() {
    const confirmed = await showConfirmationDialog(this, {
      text: this.hass.localize(
        "ui.dialogs.zha_device_info.confirmations.remove"
      ),
    });

    if (!confirmed) {
      return;
    }

    this.hass.callService("zha", "remove", {
      ieee_address: this._zhaDevice!.ieee,
    });
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        :host {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }
      `,
    ];
  }
}
