import {
  html,
  LitElement,
  PropertyDeclarations,
  PropertyValues,
  TemplateResult,
  CSSResult,
  css,
} from "lit-element";
import "@polymer/paper-card/paper-card";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/buttons/ha-call-service-button";
import "../../../components/ha-service-description";
import { Cluster, fetchClustersForZhaNode, ZHADevice } from "../../../data/zha";
import { haStyle } from "../../../resources/ha-style";
import { HomeAssistant } from "../../../types";
import "../ha-config-section";
import { ItemSelectedEvent } from "./types";

declare global {
  // for fire event
  interface HASSDomEvents {
    "zha-cluster-selected": {
      cluster?: Cluster;
    };
  }
}

const computeClusterKey = (cluster: Cluster): string => {
  return `${cluster.name} (Endpoint id: ${cluster.endpoint_id}, Id: ${
    cluster.id
  }, Type: ${cluster.type})`;
};

export class ZHAClusters extends LitElement {
  public hass?: HomeAssistant;
  public isWide?: boolean;
  public showHelp: boolean;
  public selectedDevice?: ZHADevice;
  private _selectedClusterIndex: number;
  private _clusters: Cluster[];

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
      selectedDevice: {},
      _selectedClusterIndex: {},
      _clusters: {},
    };
  }

  protected updated(changedProperties: PropertyValues): void {
    if (changedProperties.has("selectedDevice")) {
      this._clusters = [];
      this._selectedClusterIndex = -1;
      fireEvent(this, "zha-cluster-selected", {
        cluster: undefined,
      });
      this._fetchClustersForZhaNode();
    }
    super.update(changedProperties);
  }

  protected render(): TemplateResult | void {
    return html`
      <div class="node-picker">
        <paper-dropdown-menu label="Clusters" class="flex">
          <paper-listbox
            slot="dropdown-content"
            .selected="${this._selectedClusterIndex}"
            @iron-select="${this._selectedClusterChanged}"
          >
            ${this._clusters.map(
              (entry) => html`
                <paper-item>${computeClusterKey(entry)}</paper-item>
              `
            )}
          </paper-listbox>
        </paper-dropdown-menu>
      </div>
      ${this.showHelp
        ? html`
            <div class="helpText">
              Select cluster to view attributes and commands
            </div>
          `
        : ""}
    `;
  }

  private async _fetchClustersForZhaNode(): Promise<void> {
    if (this.hass) {
      this._clusters = await fetchClustersForZhaNode(
        this.hass,
        this.selectedDevice!.ieee
      );
      this._clusters.sort((a, b) => {
        return a.name.localeCompare(b.name);
      });
    }
  }

  private _selectedClusterChanged(event: ItemSelectedEvent): void {
    this._selectedClusterIndex = event.target!.selected;
    fireEvent(this, "zha-cluster-selected", {
      cluster: this._clusters[this._selectedClusterIndex],
    });
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        .flex {
          -ms-flex: 1 1 0.000000001px;
          -webkit-flex: 1;
          flex: 1;
          -webkit-flex-basis: 0.000000001px;
          flex-basis: 0.000000001px;
        }

        .node-picker {
          display: -ms-flexbox;
          display: -webkit-flex;
          display: flex;
          -ms-flex-direction: row;
          -webkit-flex-direction: row;
          flex-direction: row;
          -ms-flex-align: center;
          -webkit-align-items: center;
          align-items: center;
          padding-left: 28px;
          padding-right: 28px;
          padding-bottom: 10px;
        }
        .helpText {
          color: grey;
          padding: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-cluster": ZHAClusters;
  }
}

customElements.define("zha-clusters", ZHAClusters);
