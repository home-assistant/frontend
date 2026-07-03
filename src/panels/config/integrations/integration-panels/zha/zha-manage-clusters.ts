import { mdiChevronDown } from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { cache } from "lit/directives/cache";
import memoizeOne from "memoize-one";
import "../../../../../components/ha-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-generic-picker";
import type { HaGenericPicker } from "../../../../../components/ha-generic-picker";
import type { PickerComboBoxItem } from "../../../../../components/ha-picker-combo-box";
import "../../../../../components/ha-spinner";
import "../../../../../components/ha-svg-icon";
import type { Cluster, ZHADevice } from "../../../../../data/zha";
import { fetchClustersForZhaDevice } from "../../../../../data/zha";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, ValueChangedEvent } from "../../../../../types";
import { computeClusterSecondary, computeClusterValue } from "./functions";
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

  @property({ attribute: false }) public device?: ZHADevice;

  @state() private _selectedClusterValue?: string;

  @state() private _clusters: Cluster[] = [];

  @state() private _selectedCluster?: Cluster;

  @state() private _currTab: (typeof tabs)[number] = "attributes";

  @state() private _clustersLoaded = false;

  @state() private _clustersError?: string;

  @query("ha-generic-picker") private _clusterPicker?: HaGenericPicker;

  protected willUpdate(changedProps: PropertyValues<this>) {
    super.willUpdate(changedProps);
    if (!this.device) {
      return;
    }
    if (!tabs.includes(this._currTab)) {
      this._currTab = tabs[0];
    }
  }

  protected updated(changedProperties: PropertyValues<this>): void {
    const oldDevice = changedProperties.get("device");
    const deviceChanged =
      changedProperties.has("device") && this.device?.ieee !== oldDevice?.ieee;

    if (deviceChanged) {
      this._clusters = [];
      this._selectedClusterValue = undefined;
      this._selectedCluster = undefined;
      this._clustersLoaded = false;
      this._clustersError = undefined;
      this._fetchClustersForZhaDevice();
    }
    super.updated(changedProperties);
  }

  protected render() {
    if (!this.device) {
      return nothing;
    }

    if (!this._clustersLoaded) {
      return html`
        <ha-card class="loading-card">
          <ha-spinner size="large"></ha-spinner>
        </ha-card>
      `;
    }

    if (this._clustersError) {
      return html`<ha-card class="empty-card">${this._clustersError}</ha-card>`;
    }

    if (!this._clusters.length) {
      return html`
        <ha-card class="empty-card">
          ${this.hass.localize("ui.panel.config.zha.clusters.no_clusters")}
        </ha-card>
      `;
    }

    return html`
      <ha-card class="cluster-detail-card">
        ${this._renderClusterHeader()}
        ${
          this._selectedCluster
            ? html`
                ${this._renderClusterSegmentedTabs()}
                ${this._renderSelectedClusterPanel()}
              `
            : nothing
        }
      </ha-card>
    `;
  }

  private _renderClusterHeader(): TemplateResult {
    return html`
      <div class="cluster-header">
        <div class="cluster-heading">
          <div class="cluster-name">${this._selectedCluster?.name}</div>
          <div class="cluster-description">
            ${
              this._selectedCluster
                ? computeClusterSecondary(
                    this._selectedCluster,
                    this.hass.localize
                  )
                : nothing
            }
          </div>
        </div>
        ${this._renderClusterPicker()}
      </div>
    `;
  }

  private _renderClusterPicker(): TemplateResult {
    return html`
      <ha-generic-picker
        no-sort
        class="menu"
        .label=${this.hass.localize("ui.panel.config.zha.clusters.header")}
        .searchLabel=${this.hass.localize(
          "ui.panel.config.zha.clusters.change_cluster"
        )}
        .getItems=${this._clusterItems(this._clusters, this.hass.localize)}
        .value=${this._selectedClusterValue}
        .notFoundLabel=${this.hass.localize(
          "ui.panel.config.zha.clusters.no_clusters"
        )}
        @value-changed=${this._selectedClusterChanged}
        hide-clear-icon
      >
        <ha-button
          slot="field"
          appearance="plain"
          @click=${this._openClusterPicker}
        >
          ${this.hass.localize("ui.panel.config.zha.clusters.change_cluster")}
          <ha-svg-icon slot="end" .path=${mdiChevronDown}></ha-svg-icon>
        </ha-button>
      </ha-generic-picker>
    `;
  }

  private _renderClusterSegmentedTabs(): TemplateResult {
    return html`
      <div class="cluster-tabs" role="tablist">
        ${tabs.map(
          (tab) => html`
            <button
              role="tab"
              type="button"
              data-tab=${tab}
              aria-selected=${this._currTab === tab}
              class=${this._currTab === tab ? "active" : ""}
              @click=${this._clusterTabClicked}
            >
              ${this.hass.localize(`ui.panel.config.zha.clusters.tabs.${tab}`)}
            </button>
          `
        )}
      </div>
    `;
  }

  private _renderSelectedClusterPanel(): TemplateResult {
    return cache(
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
    );
  }

  private async _fetchClustersForZhaDevice(): Promise<void> {
    if (this.hass && this.device) {
      const ieee = this.device.ieee;
      try {
        this._clusters = await fetchClustersForZhaDevice(this.hass, ieee);
        if (this.device?.ieee !== ieee) {
          return;
        }
        this._clusters.sort((a, b) => a.name.localeCompare(b.name));
        if (this._clusters.length > 0) {
          this._selectCluster(this._clusters[0]);
        }
      } catch (_err: any) {
        if (this.device?.ieee === ieee) {
          this._clustersError = this.hass.localize(
            "ui.panel.config.zha.clusters.load_failed"
          );
        }
      } finally {
        if (this.device?.ieee === ieee) {
          this._clustersLoaded = true;
        }
      }
    }
  }

  private _clusterTabClicked(event: Event): void {
    this._selectClusterTab(
      (event.currentTarget as HTMLElement).dataset.tab as (typeof tabs)[number]
    );
  }

  private _selectClusterTab(newTab: (typeof tabs)[number]): void {
    if (newTab === this._currTab) {
      return;
    }
    this._currTab = newTab;
  }

  private _selectedClusterChanged(event: ValueChangedEvent<string>): void {
    this._selectClusterValue(event.detail.value);
  }

  private _openClusterPicker(event: Event): void {
    event.stopPropagation();
    this._clusterPicker?.open();
  }

  private _selectClusterValue(value?: string): void {
    this._selectCluster(
      this._clusters.find((cluster) => computeClusterValue(cluster) === value)
    );
  }

  private _selectCluster(cluster?: Cluster): void {
    this._selectedCluster = cluster;
    this._selectedClusterValue = cluster
      ? computeClusterValue(cluster)
      : undefined;
  }

  private _clusterItems = memoizeOne(
    (clusters: Cluster[], localize: HomeAssistant["localize"]) =>
      (): PickerComboBoxItem[] =>
        clusters.map((cluster) => ({
          id: computeClusterValue(cluster),
          primary: cluster.name,
          secondary: computeClusterSecondary(cluster, localize),
          sorting_label: cluster.name,
        }))
  );

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          display: block;
        }

        .loading-card,
        .empty-card {
          display: flex;
          justify-content: center;
          padding: var(--ha-space-8);
        }

        .empty-card {
          color: var(--secondary-text-color);
          text-align: center;
        }

        .cluster-detail-card {
          overflow: hidden;
        }

        .cluster-header {
          align-items: center;
          border-bottom: 1px solid var(--divider-color);
          display: flex;
          flex-wrap: wrap;
          gap: var(--ha-space-4);
          justify-content: space-between;
          padding: var(--ha-space-4) var(--ha-space-4) var(--ha-space-2);
        }

        .cluster-heading {
          min-width: 0;
        }

        .cluster-name {
          color: var(--primary-text-color);
          font-size: var(--ha-font-size-xl);
          font-weight: var(--ha-font-weight-medium);
          line-height: var(--ha-line-height-condensed);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .cluster-description {
          color: var(--secondary-text-color);
          font-size: var(--ha-font-size-m);
          margin-top: var(--ha-space-1);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .cluster-header ha-button {
          flex: none;
        }

        .menu {
          width: auto;
        }

        .cluster-tabs {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .cluster-tabs button {
          appearance: none;
          background: none;
          border: 0;
          border-bottom: 2px solid transparent;
          color: var(--primary-text-color);
          cursor: pointer;
          font: inherit;
          font-size: var(--ha-font-size-m);
          font-weight: var(--ha-font-weight-medium);
          min-width: 0;
          padding: var(--ha-space-3) var(--ha-space-2);
        }

        .cluster-tabs button.active {
          border-bottom-color: var(--primary-color);
          color: var(--primary-color);
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
