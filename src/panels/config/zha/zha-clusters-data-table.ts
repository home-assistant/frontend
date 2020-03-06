import "../../../components/data-table/ha-data-table";
import "../../../components/entity/ha-state-icon";

import memoizeOne from "memoize-one";

import {
  LitElement,
  html,
  TemplateResult,
  property,
  customElement,
} from "lit-element";
import { HomeAssistant } from "../../../types";
// tslint:disable-next-line
import { DataTableColumnContainer } from "../../../components/data-table/ha-data-table";
// tslint:disable-next-line
import { Cluster } from "../../../data/zha";
import { formatAsPaddedHex } from "./functions";

export interface ClusterRowData extends Cluster {
  cluster?: Cluster;
  cluster_id?: string;
}

@customElement("zha-clusters-data-table")
export class ZHAClustersDataTable extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public narrow = false;
  @property() public clusters: Cluster[] = [];

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
                return html`
                  ${formatAsPaddedHex(id)}
                `;
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

  protected render(): TemplateResult {
    return html`
      <ha-data-table
        .columns=${this._columns(this.narrow)}
        .data=${this._clusters(this.clusters)}
        .id=${"cluster_id"}
        selectable
        auto-height
      ></ha-data-table>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-clusters-data-table": ZHAClustersDataTable;
  }
}
