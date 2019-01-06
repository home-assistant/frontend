import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import { HomeAssistant } from "../../../types";

import "../../../layouts/ha-app-layout";
import "../../../resources/ha-style";

import "./zha-network";
import "./zha-node";
import "./zha-cluster-commands";
import "./zha-cluster-attributes";
import { HassEntity } from "home-assistant-js-websocket";
import { Cluster } from "./types";

export class HaConfigZha extends LitElement {
  public hass?: HomeAssistant;
  public isWide?: boolean;
  private _haStyle?: DocumentFragment;
  private _ironFlex?: DocumentFragment;
  private _selectedNode?: HassEntity;
  private _selectedCluster?: Cluster;
  private _selectedEntity?: HassEntity;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      isWide: {},
      _selectedCluster: {},
      _selectedEntity: {},
      _selectedNode: {},
    };
  }

  protected render(): TemplateResult {
    return html`
      ${this.renderStyle()}
      <ha-app-layout has-scrolling-region="">
        <app-header slot="header" fixed="">
          <app-toolbar>
            <paper-icon-button
              icon="hass:arrow-left"
              @click="${this._onBackTapped}"
            ></paper-icon-button>
            <div main-title="">Zigbee Home Automation</div>
          </app-toolbar>
        </app-header>

        <zha-network
          id="zha-network"
          .isWide="${this.isWide}"
          .hass="${this.hass}"
        ></zha-network>

        <zha-node
          id="zha-node"
          .isWide="${this.isWide}"
          .hass="${this.hass}"
          @zha-cluster-selected="${this._onClusterSelected}"
          @zha-node-selected="${this._onNodeSelected}"
          @zha-entity-selected="${this._onEntitySelected}"
        ></zha-node>
        ${
          this._selectedCluster
            ? html`
                <zha-cluster-attributes
                  id="zha-cluster-attributes"
                  .isWide="${this.isWide}"
                  .hass="${this.hass}"
                  .selectedNode="${this._selectedNode}"
                  .selectedEntity="${this._selectedEntity}"
                  .selectedCluster="${this._selectedCluster}"
                ></zha-cluster-attributes>

                <zha-cluster-commands
                  id="zha-cluster-commands"
                  .isWide="${this.isWide}"
                  .hass="${this.hass}"
                  .selectedCluster="${this._selectedCluster}"
                ></zha-cluster-commands>
              `
            : ""
        }
      </ha-app-layout>
    `;
  }

  private _onClusterSelected(selectedClusterEvent): void {
    this._selectedCluster = selectedClusterEvent.detail.cluster;
  }

  private _onNodeSelected(selectedNodeEvent): void {
    this._selectedNode = selectedNodeEvent.detail.node;
    this._selectedCluster = undefined;
    this._selectedEntity = undefined;
  }

  private _onEntitySelected(selectedEntityEvent): void {
    this._selectedEntity = selectedEntityEvent.detail.entity;
  }

  private renderStyle(): TemplateResult {
    if (!this._haStyle) {
      this._haStyle = document.importNode(
        (document.getElementById("ha-style")!
          .children[0] as HTMLTemplateElement).content,
        true
      );
    }
    if (!this._ironFlex) {
      this._ironFlex = document.importNode(
        (document.getElementById("iron-flex")!
          .children[0] as HTMLTemplateElement).content,
        true
      );
    }
    return html`
      ${this._ironFlex} ${this._haStyle}
    `;
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
