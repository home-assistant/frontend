import "@material/mwc-list/mwc-list-item";
import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { shouldHandleRequestSelectedEvent } from "../../../../../../common/mwc/handle-request-selected-event";
import { navigate } from "../../../../../../common/navigate";
import { DeviceRegistryEntry } from "../../../../../../data/device_registry";
import { fetchZHADevice, ZHADevice } from "../../../../../../data/zha";
import { showConfirmationDialog } from "../../../../../../dialogs/generic/show-dialog-box";
import { HomeAssistant } from "../../../../../../types";
import { showZHAClusterDialog } from "../../../../integrations/integration-panels/zha/show-dialog-zha-cluster";
import { showZHADeviceChildrenDialog } from "../../../../integrations/integration-panels/zha/show-dialog-zha-device-children";
import { showZHADeviceZigbeeInfoDialog } from "../../../../integrations/integration-panels/zha/show-dialog-zha-device-zigbee-info";
import { showZHAReconfigureDeviceDialog } from "../../../../integrations/integration-panels/zha/show-dialog-zha-reconfigure-device";

@customElement("ha-device-actions-zha")
export class HaDeviceActionsZha extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public device!: DeviceRegistryEntry;

  @state() private _zhaDevice?: ZHADevice;

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
            <mwc-list-item @request-selected=${this._onReconfigureNodeClick}>
              ${this.hass!.localize(
                "ui.dialogs.zha_device_info.buttons.reconfigure"
              )}
            </mwc-list-item>
          `
        : ""}
      ${this._zhaDevice.power_source === "Mains" &&
      (this._zhaDevice.device_type === "Router" ||
        this._zhaDevice.device_type === "Coordinator")
        ? html`
            <mwc-list-item @request-selected=${this._onAddDevicesClick}>
              ${this.hass!.localize("ui.dialogs.zha_device_info.buttons.add")}
            </mwc-list-item>
            <mwc-list-item
              @request-selected=${this._handleDeviceChildrenClicked}
            >
              ${this.hass!.localize(
                "ui.dialogs.zha_device_info.buttons.device_children"
              )}
            </mwc-list-item>
          `
        : ""}
      ${this._zhaDevice.device_type !== "Coordinator"
        ? html`
            <mwc-list-item @request-selected=${this._handleZigbeeInfoClicked}>
              ${this.hass!.localize(
                "ui.dialogs.zha_device_info.buttons.zigbee_information"
              )}
            </mwc-list-item>
            <mwc-list-item @request-selected=${this._showClustersDialog}>
              ${this.hass!.localize(
                "ui.dialogs.zha_device_info.buttons.clusters"
              )}
            </mwc-list-item>
            <mwc-list-item
              @request-selected=${this._onViewInVisualizationClick}
            >
              ${this.hass!.localize(
                "ui.dialogs.zha_device_info.buttons.view_in_visualization"
              )}
            </mwc-list-item>
            <mwc-list-item
              class="warning"
              @request-selected=${this._removeDevice}
            >
              ${this.hass!.localize(
                "ui.dialogs.zha_device_info.buttons.remove"
              )}
            </mwc-list-item>
          `
        : ""}
    `;
  }

  private async _showClustersDialog(ev): Promise<void> {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    await showZHAClusterDialog(this, { device: this._zhaDevice! });
  }

  private async _onReconfigureNodeClick(ev): Promise<void> {
    if (!this.hass || !shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    showZHAReconfigureDeviceDialog(this, { device: this._zhaDevice! });
  }

  private _onAddDevicesClick(ev) {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    navigate(`/config/zha/add/${this._zhaDevice!.ieee}`);
  }

  private _onViewInVisualizationClick(ev) {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    navigate(`/config/zha/visualization/${this._zhaDevice!.device_reg_id}`);
  }

  private async _handleZigbeeInfoClicked(ev) {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    showZHADeviceZigbeeInfoDialog(this, { device: this._zhaDevice! });
  }

  private async _handleDeviceChildrenClicked(ev) {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    showZHADeviceChildrenDialog(this, { device: this._zhaDevice! });
  }

  private async _removeDevice(ev) {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    const confirmed = await showConfirmationDialog(this, {
      text: this.hass.localize(
        "ui.dialogs.zha_device_info.confirmations.remove"
      ),
    });

    if (!confirmed) {
      return;
    }

    await this.hass.callService("zha", "remove", {
      ieee: this._zhaDevice!.ieee,
    });

    history.back();
  }
}
