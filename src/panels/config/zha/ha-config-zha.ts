import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import {
  html,
  LitElement,
  PropertyDeclarations,
  TemplateResult,
  CSSResult,
} from "lit-element";
import "@polymer/paper-icon-button/paper-icon-button";
import { HassEntity } from "home-assistant-js-websocket";
import { HASSDomEvent } from "../../../common/dom/fire_event";
import { Cluster } from "../../../data/zha";
import "../../../layouts/ha-app-layout";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { ZHAClusterSelectedParams, ZHANodeSelectedParams } from "./types";
import "./zha-cluster-attributes";
import "./zha-cluster-commands";
import "./zha-network";
import "./zha-node";

export class HaConfigZha extends LitElement {
  public hass?: HomeAssistant;
  public isWide?: boolean;
  private _selectedNode?: HassEntity;
  private _selectedCluster?: Cluster;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      isWide: {},
      _selectedCluster: {},
      _selectedNode: {},
    };
  }

  protected render(): TemplateResult | void {
    return html`
      <ha-app-layout>
        <app-header slot="header">
          <app-toolbar>
            <paper-icon-button
              icon="hass:arrow-left"
              @click="${this._onBackTapped}"
            ></paper-icon-button>
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
          @zha-node-selected="${this._onNodeSelected}"
        ></zha-node>
        ${this._selectedCluster
          ? html`
              <zha-cluster-attributes
                .isWide="${this.isWide}"
                .hass="${this.hass}"
                .selectedNode="${this._selectedNode}"
                .selectedCluster="${this._selectedCluster}"
              ></zha-cluster-attributes>

              <zha-cluster-commands
                .isWide="${this.isWide}"
                .hass="${this.hass}"
                .selectedNode="${this._selectedNode}"
                .selectedCluster="${this._selectedCluster}"
              ></zha-cluster-commands>
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

  private _onNodeSelected(
    selectedNodeEvent: HASSDomEvent<ZHANodeSelectedParams>
  ): void {
    this._selectedNode = selectedNodeEvent.detail.node;
    this._selectedCluster = undefined;
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
