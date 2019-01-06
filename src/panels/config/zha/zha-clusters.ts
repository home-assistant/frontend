import {
  html,
  LitElement,
  PropertyDeclarations,
  PropertyValues,
} from "@polymer/lit-element";
import { TemplateResult } from "lit-html";
import "@polymer/paper-card/paper-card";
import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import "../../../components/buttons/ha-call-service-button";
import "../../../components/ha-service-description";
import "../ha-config-section";

import { HomeAssistant } from "../../../types";
import "../../../resources/ha-style";
import { HassEntity } from "home-assistant-js-websocket";
import { ItemSelectedEvent, Cluster } from "./types";

export class ZHAClusters extends LitElement {
  public hass?: HomeAssistant;
  public isWide?: boolean;
  public showHelp: boolean;
  public selectedEntity?: HassEntity;
  public selectedCluster?: Cluster;
  public selectedClusterIndex: number;
  private _clusters: Cluster[];
  private _haStyle?: DocumentFragment;
  private _ironFlex?: DocumentFragment;

  constructor() {
    super();
    this.showHelp = false;
    this.selectedClusterIndex = -1;
    this._clusters = [];
  }

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      isWide: {},
      showHelp: {},
      selectedEntity: {},
      selectedCluster: {},
      selectedClusterIndex: {},
    };
  }

  protected update(changedProperties: PropertyValues) {
    if (changedProperties.has("selectedEntity")) {
      this._fetchClustersForZhaNode();
    }
    super.update(changedProperties);
  }

  protected render(): TemplateResult {
    return html`
      ${this._renderStyle()} ${this._renderClusterPicker()}
    `;
  }

  private _renderClusterPicker(): TemplateResult {
    return html`
      <div class="node-picker">
        <paper-dropdown-menu dynamic-align="" label="Clusters" class="flex">
          <paper-listbox
            slot="dropdown-content"
            @iron-select="${this._selectedClusterChanged}"
          >
            ${
              this._clusters.map(
                (entry) => html`
                  <paper-item>${this._computeClusterKey(entry)}</paper-item>
                `
              )
            }
          </paper-listbox>
        </paper-dropdown-menu>
      </div>
      ${
        this.showHelp
          ? html`
              <div style="color: grey; padding: 16px">
                Select entity to view per-entity options
              </div>
            `
          : ""
      }
    `;
  }

  private async _fetchClustersForZhaNode() {
    this._clusters = await this.hass!.callWS({
      type: "zha/entities/clusters",
      entity_id: this.selectedEntity!.entity_id,
      ieee: this.selectedEntity!.device_info.connections[0][1],
    });
  }

  private _selectedClusterChanged(event: ItemSelectedEvent): void {
    this.selectedClusterIndex = event.target!.selected;
    this.selectedCluster = this._clusters[this.selectedClusterIndex];
  }

  private _computeClusterKey(cluster: Cluster): string {
    return (
      cluster.name + " (id: " + cluster.id + ", type: " + cluster.type + ")"
    );
  }

  private _renderStyle(): TemplateResult {
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
      <style>
        .node-picker {
          @apply --layout-horizontal;
          @apply --layout-center-center;
          padding-left: 28px;
          padding-right: 28px;
          padding-bottom: 10px;
        }
      </style>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-cluster": ZHAClusters;
  }
}

customElements.define("zha-clusters", ZHAClusters);
