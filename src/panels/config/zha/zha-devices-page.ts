import "../../../components/ha-paper-icon-button-arrow-prev";
import "./zha-binding";
import "./zha-cluster-attributes";
import "./zha-cluster-commands";
import "./zha-node";
import "@polymer/paper-icon-button/paper-icon-button";

import {
  CSSResult,
  html,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
  customElement,
} from "lit-element";

import { HASSDomEvent } from "../../../common/dom/fire_event";
import { Cluster, fetchBindableDevices, ZHADevice } from "../../../data/zha";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { sortZHADevices } from "./functions";
import { ZHAClusterSelectedParams, ZHADeviceSelectedParams } from "./types";

@customElement("zha-devices-page")
export class ZHADevicesPage extends LitElement {
  @property() public hass?: HomeAssistant;
  @property() public isWide?: boolean;
  @property() private _selectedDevice?: ZHADevice;
  @property() private _selectedCluster?: Cluster;
  @property() private _bindableDevices: ZHADevice[] = [];

  protected updated(changedProperties: PropertyValues): void {
    if (changedProperties.has("_selectedDevice")) {
      this._fetchBindableDevices();
    }
    super.update(changedProperties);
  }

  protected render(): TemplateResult | void {
    return html`
      <zha-node
        .isWide="${this.isWide}"
        .hass="${this.hass}"
        @zha-cluster-selected="${this._onClusterSelected}"
        @zha-node-selected="${this._onDeviceSelected}"
      ></zha-node>
      ${this._selectedCluster
        ? html`
            <zha-cluster-attributes
              .isWide="${this.isWide}"
              .hass="${this.hass}"
              .selectedNode="${this._selectedDevice}"
              .selectedCluster="${this._selectedCluster}"
            ></zha-cluster-attributes>

            <zha-cluster-commands
              .isWide="${this.isWide}"
              .hass="${this.hass}"
              .selectedNode="${this._selectedDevice}"
              .selectedCluster="${this._selectedCluster}"
            ></zha-cluster-commands>
          `
        : ""}
      ${this._selectedDevice && this._bindableDevices.length > 0
        ? html`
            <zha-binding-control
              .isWide="${this.isWide}"
              .hass="${this.hass}"
              .selectedDevice="${this._selectedDevice}"
              .bindableDevices="${this._bindableDevices}"
            ></zha-binding-control>
          `
        : ""}
    `;
  }

  private _onClusterSelected(
    selectedClusterEvent: HASSDomEvent<ZHAClusterSelectedParams>
  ): void {
    this._selectedCluster = selectedClusterEvent.detail.cluster;
  }

  private _onDeviceSelected(
    selectedNodeEvent: HASSDomEvent<ZHADeviceSelectedParams>
  ): void {
    this._selectedDevice = selectedNodeEvent.detail.node;
    this._selectedCluster = undefined;
  }

  private async _fetchBindableDevices(): Promise<void> {
    if (this._selectedDevice && this.hass) {
      this._bindableDevices = (
        await fetchBindableDevices(this.hass, this._selectedDevice!.ieee)
      ).sort(sortZHADevices);
    }
  }

  static get styles(): CSSResult[] {
    return [haStyle];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-devices-page": ZHADevicesPage;
  }
}
