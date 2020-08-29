import "@material/mwc-button/mwc-button";
import "@material/mwc-fab";
import { mdiAlert, mdiCheck } from "@mdi/js";
import {
  CSSResultArray,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import memoizeOne from "memoize-one";
import { navigate } from "../../../../../common/navigate";
import "../../../../../components/buttons/ha-call-service-button";
import { DataTableColumnContainer } from "../../../../../components/data-table/ha-data-table";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-next";
import { fetchOZWNodes, OZWDevice } from "../../../../../data/ozw";
import "../../../../../layouts/hass-tabs-subpage";
import "../../../../../layouts/hass-tabs-subpage-data-table";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import "../../../ha-config-section";
import { ozwNetworkTabs } from "./ozw-config-network";
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

  @property() public ozwInstance?: number;

  @internalProperty() private _nodes: OZWDevice[] = [];

  private _columns = memoizeOne(
    (narrow: boolean): DataTableColumnContainer => {
      return {
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
        node_manufacturer_name: {
          title: "Manufacturer",
          sortable: true,
          hide: narrow,
          width: "25%",
        },
        node_query_stage: {
          title: "Query Stage",
          sortable: true,
          hide: narrow,
          width: "25%",
        },
        is_zwave_plus: {
          title: "Z-Wave Plus",
          hide: narrow,
          template: (value: boolean) =>
            value ? html` <ha-svg-icon .path=${mdiCheck}></ha-svg-icon>` : "",
        },
        is_failed: {
          title: "Failed",
          hide: narrow,
          template: (value: boolean) =>
            value ? html` <ha-svg-icon .path=${mdiAlert}></ha-svg-icon>` : "",
        },
      };
    }
  );

  protected firstUpdated() {
    if (!this.ozwInstance) {
      navigate(this, "/config/ozw/dashboard", true);
    } else if (this.hass) {
      this._fetchData();
    }
  }

  protected render(): TemplateResult {
    const route = computeTail(this.route);

    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${route}
        .tabs=${ozwNetworkTabs}
        .columns=${this._columns(this.narrow)}
        .data=${this._nodes}
        id="node_id"
        back-path="/config/ozw/network/${this.ozwInstance}/dashboard"
      >
      </hass-tabs-subpage-data-table>
    `;
  }

  private async _fetchData() {
    this._nodes = await fetchOZWNodes(this.hass!, this.ozwInstance!);
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
