import "@material/mwc-fab";
import {
  css,
  CSSResultArray,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import memoizeOne from "memoize-one";
import { mdiCheck, mdiAlert, mdiServerNetwork, mdiNetwork } from "@mdi/js";
import { navigate } from "../../../../../common/navigate";
import { DataTableColumnContainer } from "../../../../../components/data-table/ha-data-table";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-next";
import "../../../../../components/buttons/ha-call-service-button";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import "../../../ha-config-section";
import type { PageNavigation } from "../../../../../layouts/hass-tabs-subpage";
import "../../../../../layouts/hass-tabs-subpage";
import "../../../../../layouts/hass-tabs-subpage-data-table";
import "@material/mwc-button/mwc-button";
import { OZWDevice, fetchOZWNodes } from "../../../../../data/ozw";
import { computeTail } from "./ozw-config-router";

export interface NodeRowData extends OZWDevice {
  node?: NodeRowData;
  id?: number;
}

@customElement("ozw-network-nodes")
class OZWNetworkNodes extends LitElement {
  @property({ type: Object }) public hass!: HomeAssistant;

  @property({ type: Object }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ type: Boolean }) public isWide!: boolean;

  @property() public configEntryId?: string;

  @property() public ozw_instance = 0;

  @internalProperty() private _nodes: OZWDevice[] = [];

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.ozw_instance <= 0) {
      navigate(this, "/config/ozw/dashboard", true);
    } else if (this.hass) {
      this._fetchData();
    }
  }

  private async _fetchData() {
    this._nodes = await fetchOZWNodes(this.hass!, this.ozw_instance);
  }

  private _formattedNodes = memoizeOne((nodes: OZWDevice[]) => {
    let outputNodes: NodeRowData[] = nodes;

    outputNodes = outputNodes.map((node) => {
      return {
        ...node,
        id: node.node_id,
      };
    });

    return outputNodes;
  });

  private _columns = memoizeOne(
    (narrow: boolean): DataTableColumnContainer =>
      narrow
        ? {
            node_id: {
              title: "ID",
              sortable: true,
              type: "numeric",
              width: "72px",
              filterable: true,
              direction: "asc",
            },
            node_product_name: {
              title: "Model",
              sortable: true,
              grows: true,
            },
          }
        : {
            id: {
              title: "ID",
              sortable: true,
              type: "numeric",
              width: "72px",
              filterable: true,
              direction: "asc",
            },
            node_manufacturer_name: {
              title: "Manufacturer",
              sortable: true,
              width: "25%",
            },
            node_product_name: {
              title: "Model",
              sortable: true,
              width: "25%",
            },
            node_query_stage: {
              title: "Query Stage",
              sortable: true,
              width: "25%",
            },
            is_zwave_plus: {
              title: "Z-Wave Plus",
              template: (value: boolean) => {
                return html`${value
                  ? html` <ha-svg-icon .path=${mdiCheck}></ha-svg-icon>`
                  : ``} `;
              },
            },
            is_failed: {
              title: "Failed",
              template: (value: boolean) => {
                return html`${value
                  ? html` <ha-svg-icon .path=${mdiAlert}></ha-svg-icon>`
                  : ``} `;
              },
            },
          }
  );

  protected render(): TemplateResult {
    const route = computeTail(this.route);

    const ozwTabs: PageNavigation[] = [
      {
        translationKey: "ui.panel.config.ozw.navigation.network",
        path: `/config/ozw/network/${this.ozw_instance}/dashboard`,
        iconPath: mdiServerNetwork,
      },
      {
        translationKey: "ui.panel.config.ozw.navigation.nodes",
        path: `/config/ozw/network/${this.ozw_instance}/nodes`,
        iconPath: mdiNetwork,
      },
    ];

    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${route}
        .tabs=${ozwTabs}
        .columns=${this._columns(this.narrow)}
        .data=${this._formattedNodes(this._nodes)}
        back-path="/config/ozw/network/${this.ozw_instance}/dashboard"
      >
      </hass-tabs-subpage-data-table>
    `;
  }

  static get styles(): CSSResultArray {
    return [haStyle];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ozw-network-nodes": OZWNetworkNodes;
  }
}
