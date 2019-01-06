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
import { ItemSelectedEvent, Cluster, ZHADeviceEntity } from "./types";
import { fireEvent } from "../../../common/dom/fire_event";

declare global {
  // for fire event
  interface HASSDomEvents {
    "zha-cluster-selected": {
      cluster?: Cluster;
    };
  }
}

export class ZHAClusters extends LitElement {
  public hass?: HomeAssistant;
  public isWide?: boolean;
  public showHelp: boolean;
  public selectedEntity?: ZHADeviceEntity;
  private _selectedClusterIndex: number;
  private _clusters: Cluster[];
  private _haStyle?: DocumentFragment;
  private _ironFlex?: DocumentFragment;

  constructor() {
    super();
    this.showHelp = false;
    this._selectedClusterIndex = -1;
    this._clusters = [];
  }

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      isWide: {},
      showHelp: {},
      selectedEntity: {},
      _selectedClusterIndex: {},
      _clusters: {},
    };
  }

  protected update(changedProperties: PropertyValues): void {
    if (changedProperties.has("selectedEntity")) {
      this._clusters = [];
      this._selectedClusterIndex = -1;
      fireEvent(this, "zha-cluster-selected", {
        cluster: undefined,
      });
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
            .selected="${this._selectedClusterIndex}"
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
      <div ?hidden="${!this.showHelp}" style="color: grey; padding: 16px">
        Select cluster to view attributes and commands
      </div>
    `;
  }

  private async _fetchClustersForZhaNode(): Promise<any> {
    this._clusters = await this.hass!.callWS({
      type: "zha/entities/clusters",
      entity_id: this.selectedEntity!.entity_id,
      ieee: this.selectedEntity!.device_info!.identifiers[0][1],
    });
  }

  private _selectedClusterChanged(event: ItemSelectedEvent): void {
    this._selectedClusterIndex = event.target!.selected;
    fireEvent(this, "zha-cluster-selected", {
      cluster: this._clusters[this._selectedClusterIndex],
    });
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
