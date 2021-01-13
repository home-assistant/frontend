import {
  customElement,
  html,
  LitElement,
  property,
  query,
  TemplateResult,
} from "lit-element";
import memoizeOne from "memoize-one";
import { computeRTLDirection } from "../../../../../common/util/compute_rtl";
import "../../../../../components/data-table/ha-data-table";
import type {
  DataTableColumnContainer,
  HaDataTable,
} from "../../../../../components/data-table/ha-data-table";
import type { Cluster } from "../../../../../data/zha";
import type { HomeAssistant } from "../../../../../types";
import { formatAsPaddedHex } from "./functions";

export interface ClusterRowData extends Cluster {
  cluster?: Cluster;
  cluster_id?: string;
}

@customElement("zha-clusters-data-table")
export class ZHAClustersDataTable extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow = false;

  @property() public clusters: Cluster[] = [];

  @query("ha-data-table", true) private _dataTable!: HaDataTable;

  private _clusters = memoizeOne((clusters: Cluster[]) => {
    let outputClusters: ClusterRowData[] = clusters;

    outputClusters = outputClusters.map((cluster) => {
      return {
        ...cluster,
        cluster_id: cluster.endpoint_id + "-" + cluster.id,
      };
    });

    return outputClusters;
  });

  private _columns = memoizeOne(
    (narrow: boolean): DataTableColumnContainer =>
      narrow
        ? {
            name: {
              title: "Name",
              sortable: true,
              direction: "asc",
              grows: true,
            },
          }
        : {
            name: {
              title: "Name",
              sortable: true,
              direction: "asc",
              grows: true,
            },
            id: {
              title: "ID",
              template: (id: number) => {
                return html` ${formatAsPaddedHex(id)} `;
              },
              sortable: true,
              width: "15%",
            },
            endpoint_id: {
              title: "Endpoint ID",
              sortable: true,
              width: "15%",
            },
          }
  );

  public clearSelection() {
    this._dataTable.clearSelection();
  }

  protected render(): TemplateResult {
    return html`
      <ha-data-table
        .columns=${this._columns(this.narrow)}
        .data=${this._clusters(this.clusters)}
        .id=${"cluster_id"}
        selectable
        auto-height
        .dir=${computeRTLDirection(this.hass)}
        .searchLabel=${this.hass.localize("ui.components.data-table.search")}
        .noDataText=${this.hass.localize("ui.components.data-table.no-data")}
      ></ha-data-table>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-clusters-data-table": ZHAClustersDataTable;
  }
}
