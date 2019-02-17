import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import {
  html,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
  CSSResult,
} from "lit-element";
import "@polymer/paper-icon-button/paper-icon-button";
import { HASSDomEvent } from "../../../common/dom/fire_event";
import { Cluster, ZHADevice, fetchBindableDevices } from "../../../data/zha";
import "../../../layouts/ha-app-layout";
import "../../../components/ha-paper-icon-button-arrow-prev";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { ZHAClusterSelectedParams, ZHADeviceSelectedParams } from "./types";
import "./zha-cluster-attributes";
import "./zha-cluster-commands";
import "./zha-network";
import "./zha-node";
import "./zha-binding";

export class HaConfigZha extends LitElement {
  @property() public hass?: HomeAssistant;
  @property() public isWide?: boolean;
  @property() private _selectedDevice?: ZHADevice;
  @property() private _selectedCluster?: Cluster;
  @property() private _bindableDevices: ZHADevice[];

  constructor() {
    super();
    this._bindableDevices = [];
  }

  protected updated(changedProperties: PropertyValues): void {
    if (changedProperties.has("_selectedDevice")) {
      this._fetchBindableDevices();
    }
    super.update(changedProperties);
  }

  protected render(): TemplateResult | void {
    return html`
      <ha-app-layout>
        <app-header slot="header">
          <app-toolbar>
            <ha-paper-icon-button-arrow-prev
              @click="${this._onBackTapped}"
            ></ha-paper-icon-button-arrow-prev>
            <div main-title>Zigbee Home Automation</div>
          </app-toolbar>
        </app-header>

        <zha-network
          .isWide="${this.isWide}"
          .hass="${this.hass}"
        ></zha-network>

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
      </ha-app-layout>
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
      this._bindableDevices = (await fetchBindableDevices(
        this.hass,
        this._selectedDevice!.ieee
      )).sort((a, b) => {
        return a.name.localeCompare(b.name);
      });
    }
  }

  static get styles(): CSSResult[] {
    return [haStyle];
  }

  private _onBackTapped(): void {
    history.back();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-zha": HaConfigZha;
  }
}

customElements.define("ha-config-zha", HaConfigZha);
