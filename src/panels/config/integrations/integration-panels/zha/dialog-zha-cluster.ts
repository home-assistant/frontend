import {
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { HASSDomEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-code-editor";
import { createCloseHeading } from "../../../../../components/ha-dialog";
import {
  Cluster,
  fetchBindableDevices,
  fetchGroups,
  ZHADevice,
  ZHAGroup,
} from "../../../../../data/zha";
import { haStyleDialog } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { sortZHADevices, sortZHAGroups } from "./functions";
import { ZHADeviceZigbeeInfoDialogParams } from "./show-dialog-zha-device-zigbee-info";
import { ZHAClusterSelectedParams } from "./types";
import "./zha-cluster-attributes";
import "./zha-cluster-commands";
import "./zha-clusters";
import "./zha-device-binding";
import "./zha-group-binding";

@customElement("dialog-zha-cluster")
class DialogZHACluster extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _device?: ZHADevice;

  @state() private _selectedCluster?: Cluster;

  @state() private _bindableDevices: ZHADevice[] = [];

  @state() private _groups: ZHAGroup[] = [];

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
        @closed=${this._close}
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize("ui.panel.config.zha.clusters.header")
        )}
      >
        <zha-clusters
          .hass=${this.hass}
          .selectedDevice=${this._device}
          @zha-cluster-selected=${this._onClusterSelected}
        ></zha-clusters>
        ${this._selectedCluster
          ? html`
              <zha-cluster-attributes
                .hass=${this.hass}
                .selectedNode=${this._device}
                .selectedCluster=${this._selectedCluster}
              ></zha-cluster-attributes>
              <zha-cluster-commands
                .hass=${this.hass}
                .selectedNode=${this._device}
                .selectedCluster=${this._selectedCluster}
              ></zha-cluster-commands>
            `
          : ""}
        ${this._bindableDevices.length > 0
          ? html`
              <zha-device-binding-control
                .hass=${this.hass}
                .selectedDevice=${this._device}
                .bindableDevices=${this._bindableDevices}
              ></zha-device-binding-control>
            `
          : ""}
        ${this._device && this._groups.length > 0
          ? html`
              <zha-group-binding-control
                .hass=${this.hass}
                .selectedDevice=${this._device}
                .groups=${this._groups}
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

  static get styles(): CSSResultGroup {
    return haStyleDialog;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-zha-cluster": DialogZHACluster;
  }
}
