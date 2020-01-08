import "../../../layouts/hass-subpage";
import "../../../components/ha-paper-icon-button-arrow-prev";
import "./zha-binding";
import "./zha-cluster-attributes";
import "./zha-cluster-commands";
import "./zha-clusters";
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
  css,
} from "lit-element";

import { HASSDomEvent } from "../../../common/dom/fire_event";
import {
  Cluster,
  fetchBindableDevices,
  ZHADevice,
  fetchZHADevice,
} from "../../../data/zha";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { sortZHADevices } from "./functions";
import { ZHAClusterSelectedParams } from "./types";

@customElement("zha-device-page")
export class ZHADevicePage extends LitElement {
  @property() public hass?: HomeAssistant;
  @property() public isWide?: boolean;
  @property() public ieee?: string;
  @property() public device?: ZHADevice;
  @property() private _selectedCluster?: Cluster;
  @property() private _bindableDevices: ZHADevice[] = [];

  protected updated(changedProperties: PropertyValues): void {
    if (changedProperties.has("ieee")) {
      this._fetchData();
    }
    super.update(changedProperties);
  }

  protected render(): TemplateResult | void {
    return html`
      <hass-subpage
        .header=${this.hass!.localize("ui.panel.config.zha.devices.header")}
      >
        <zha-node
          .isWide="${this.isWide}"
          .hass="${this.hass}"
          .device=${this.device}
        ></zha-node>
        <zha-clusters
          .hass="${this.hass}"
          .isWide="${this.isWide}"
          .selectedDevice="${this.device}"
          @zha-cluster-selected="${this._onClusterSelected}"
        ></zha-clusters>
        ${this._selectedCluster
          ? html`
              <zha-cluster-attributes
                .isWide="${this.isWide}"
                .hass="${this.hass}"
                .selectedNode="${this.device}"
                .selectedCluster="${this._selectedCluster}"
              ></zha-cluster-attributes>

              <zha-cluster-commands
                .isWide="${this.isWide}"
                .hass="${this.hass}"
                .selectedNode="${this.device}"
                .selectedCluster="${this._selectedCluster}"
              ></zha-cluster-commands>
            `
          : ""}
        ${this._bindableDevices.length > 0
          ? html`
              <zha-binding-control
                .isWide="${this.isWide}"
                .hass="${this.hass}"
                .selectedDevice="${this.device}"
                .bindableDevices="${this._bindableDevices}"
              ></zha-binding-control>
            `
          : ""}
        <div class="spacer" />
      </hass-subpage>
    `;
  }

  private _onClusterSelected(
    selectedClusterEvent: HASSDomEvent<ZHAClusterSelectedParams>
  ): void {
    this._selectedCluster = selectedClusterEvent.detail.cluster;
  }

  private async _fetchData(): Promise<void> {
    if (this.ieee && this.hass) {
      this.device = await fetchZHADevice(this.hass, this.ieee);
      this._bindableDevices = (
        await fetchBindableDevices(this.hass, this.ieee)
      ).sort(sortZHADevices);
    }
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        .spacer {
          height: 50px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-device-page": ZHADevicePage;
  }
}
