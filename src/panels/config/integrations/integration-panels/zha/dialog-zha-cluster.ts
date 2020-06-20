import {
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
  PropertyValues,
} from "lit-element";
import "../../../../../components/ha-code-editor";
import { createCloseHeading } from "../../../../../components/ha-dialog";
import { haStyleDialog } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { ZHADeviceZigbeeInfoDialogParams } from "./show-dialog-zha-device-zigbee-info";
import {
  ZHADevice,
  Cluster,
  ZHAGroup,
  fetchBindableDevices,
  fetchGroups,
} from "../../../../../data/zha";
import { ZHAClusterSelectedParams } from "./types";
import "./zha-cluster-attributes";
import "./zha-cluster-commands";
import "./zha-clusters";
import "./zha-device-binding";
import "./zha-group-binding";
import { HASSDomEvent } from "../../../../../common/dom/fire_event";
import { sortZHADevices, sortZHAGroups } from "./functions";

@customElement("dialog-zha-cluster")
class DialogZHACluster extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() private _device?: ZHADevice;

  @property() private _selectedCluster?: Cluster;

  @property() private _bindableDevices: ZHADevice[] = [];

  @property() private _groups: ZHAGroup[] = [];

  public async showDialog(
    params: ZHADeviceZigbeeInfoDialogParams
  ): Promise<void> {
    this._device = params.device;
  }

  protected updated(changedProperties: PropertyValues): void {
    super.update(changedProperties);
    if (changedProperties.has("_device")) {
      this._fetchData();
    }
  }

  protected render(): TemplateResult {
    if (!this._device) {
      return html``;
    }

    return html`
      <ha-dialog
        open
        hideActions
        @closing="${this._close}"
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize("ui.panel.config.zha.clusters.header")
        )}
      >
        <zha-clusters
          .hass=${this.hass}
          .selectedDevice="${this._device}"
          @zha-cluster-selected="${this._onClusterSelected}"
        ></zha-clusters>
        ${this._selectedCluster
          ? html`
              <zha-cluster-attributes
                .hass=${this.hass}
                .selectedNode="${this._device}"
                .selectedCluster="${this._selectedCluster}"
              ></zha-cluster-attributes>
              <zha-cluster-commands
                .hass=${this.hass}
                .selectedNode="${this._device}"
                .selectedCluster="${this._selectedCluster}"
              ></zha-cluster-commands>
            `
          : ""}
        ${this._bindableDevices.length > 0
          ? html`
              <zha-device-binding-control
                .hass=${this.hass}
                .selectedDevice="${this._device}"
                .bindableDevices="${this._bindableDevices}"
              ></zha-device-binding-control>
            `
          : ""}
        ${this._device && this._groups.length > 0
          ? html`
              <zha-group-binding-control
                .hass=${this.hass}
                .selectedDevice="${this._device}"
                .groups="${this._groups}"
              ></zha-group-binding-control>
            `
          : ""}
      </ha-dialog>
    `;
  }

  private _onClusterSelected(
    selectedClusterEvent: HASSDomEvent<ZHAClusterSelectedParams>
  ): void {
    this._selectedCluster = selectedClusterEvent.detail.cluster;
  }

  private _close(): void {
    this._device = undefined;
  }

  private async _fetchData(): Promise<void> {
    if (this._device && this.hass) {
      this._bindableDevices =
        this._device && this._device.device_type !== "Coordinator"
          ? (await fetchBindableDevices(this.hass, this._device.ieee)).sort(
              sortZHADevices
            )
          : [];
      this._groups = (await fetchGroups(this.hass!)).sort(sortZHAGroups);
    }
  }

  static get styles(): CSSResult {
    return haStyleDialog;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-zha-cluster": DialogZHACluster;
  }
}
