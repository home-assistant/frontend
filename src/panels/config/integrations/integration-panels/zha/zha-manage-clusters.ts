import "@material/mwc-list/mwc-list-item";
import "@material/mwc-tab-bar/mwc-tab-bar";
import "@material/mwc-tab/mwc-tab";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { cache } from "lit/directives/cache";
import { stopPropagation } from "../../../../../common/dom/stop_propagation";
import "../../../../../components/ha-card";
import "../../../../../components/ha-select";
import {
  Cluster,
  fetchClustersForZhaDevice,
  ZHADevice,
} from "../../../../../data/zha";
import { haStyle } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { computeClusterKey } from "./functions";
import "./zha-cluster-attributes";
import "./zha-cluster-commands";

declare global {
  // for fire event
  interface HASSDomEvents {
    "zha-cluster-selected": {
      cluster?: Cluster;
    };
  }
}

const tabs = ["attributes", "commands"] as const;

@customElement("zha-manage-clusters")
export class ZHAManageClusters extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public isWide?: boolean;

  @property() public device?: ZHADevice;

  @state() private _selectedClusterIndex = -1;

  @state() private _clusters: Cluster[] = [];

  @state() private _selectedCluster?: Cluster;

  @state() private _currTab: (typeof tabs)[number] = "attributes";

  @state() private _clustersLoaded = false;

  protected willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    if (!this.device) {
      return;
    }
    if (!tabs.includes(this._currTab)) {
      this._currTab = tabs[0];
    }
  }

  protected updated(changedProperties: PropertyValues): void {
    if (changedProperties.has("device")) {
      this._clusters = [];
      this._selectedClusterIndex = -1;
      this._clustersLoaded = false;
      this._fetchClustersForZhaDevice();
    }
    super.updated(changedProperties);
  }

  protected render() {
    if (!this.device || !this._clustersLoaded) {
      return nothing;
    }
    return html`
      <ha-card class="content">
        <div class="node-picker">
          <ha-select
            .label=${this.hass!.localize("ui.panel.config.zha.common.clusters")}
            class="menu"
            .value=${String(this._selectedClusterIndex)}
            @selected=${this._selectedClusterChanged}
            @closed=${stopPropagation}
            fixedMenuPosition
            naturalMenuWidth
          >
            ${this._clusters.map(
              (entry, idx) => html`
                <mwc-list-item .value=${String(idx)}
                  >${computeClusterKey(entry)}</mwc-list-item
                >
              `
            )}
          </ha-select>
        </div>
        ${this._selectedCluster
          ? html`
              <mwc-tab-bar
                .activeIndex=${tabs.indexOf(this._currTab)}
                @MDCTabBar:activated=${this._handleTabChanged}
              >
                ${tabs.map(
                  (tab) => html`
                    <mwc-tab
                      .label=${this.hass.localize(
                        `ui.panel.config.zha.clusters.tabs.${tab}`
                      )}
                    ></mwc-tab>
                  `
                )}
              </mwc-tab-bar>

              <div class="content" tabindex="-1" dialogInitialFocus>
                ${cache(
                  this._currTab === "attributes"
                    ? html`
                        <zha-cluster-attributes
                          .hass=${this.hass}
                          .device=${this.device}
                          .selectedCluster=${this._selectedCluster}
                        ></zha-cluster-attributes>
                      `
                    : html`
                        <zha-cluster-commands
                          .hass=${this.hass}
                          .device=${this.device}
                          .selectedCluster=${this._selectedCluster}
                        ></zha-cluster-commands>
                      `
                )}
              </div>
            `
          : ""}
      </ha-card>
    `;
  }

  private async _fetchClustersForZhaDevice(): Promise<void> {
    if (this.hass) {
      this._clusters = await fetchClustersForZhaDevice(
        this.hass,
        this.device!.ieee
      );
      this._clusters.sort((a, b) => a.name.localeCompare(b.name));
      if (this._clusters.length > 0) {
        this._selectedClusterIndex = 0;
        this._selectedCluster = this._clusters[0];
      }
      this._clustersLoaded = true;
    }
  }

  private _handleTabChanged(ev: CustomEvent): void {
    const newTab = tabs[ev.detail.index];
    if (newTab === this._currTab) {
      return;
    }
    this._currTab = newTab;
  }

  private _selectedClusterChanged(event): void {
    this._selectedClusterIndex = Number(event.target!.value);
    this._selectedCluster = this._clusters[this._selectedClusterIndex];
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-select {
          margin-top: 16px;
        }
        .menu {
          width: 100%;
        }
        .header {
          flex-grow: 1;
        }
        .node-picker {
          align-items: center;
          padding-bottom: 10px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-manage-clusters": ZHAManageClusters;
  }
}
