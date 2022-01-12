import "@material/mwc-button/mwc-button";
import { mdiAlert, mdiCheck } from "@mdi/js";
import { CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { HASSDomEvent } from "../../../../../common/dom/fire_event";
import { navigate } from "../../../../../common/navigate";
import "../../../../../components/buttons/ha-call-service-button";
import {
  DataTableColumnContainer,
  RowClickedEvent,
} from "../../../../../components/data-table/ha-data-table";
import "../../../../../components/ha-card";
import { fetchOZWNodes, OZWDevice } from "../../../../../data/ozw";
import "../../../../../layouts/hass-tabs-subpage";
import "../../../../../layouts/hass-tabs-subpage-data-table";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import "../../../ha-config-section";
import { ozwNetworkTabs } from "./ozw-network-router";

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

  @property() public ozwInstance = 0;

  @state() private _nodes: OZWDevice[] = [];

  private _columns = memoizeOne(
    (narrow: boolean): DataTableColumnContainer => ({
      node_id: {
        title: this.hass.localize("ui.panel.config.ozw.nodes_table.id"),
        sortable: true,
        type: "numeric",
        width: "72px",
        filterable: true,
        direction: "asc",
      },
      node_product_name: {
        title: this.hass.localize("ui.panel.config.ozw.nodes_table.model"),
        sortable: true,
        width: narrow ? "75%" : "25%",
      },
      node_manufacturer_name: {
        title: this.hass.localize(
          "ui.panel.config.ozw.nodes_table.manufacturer"
        ),
        sortable: true,
        hidden: narrow,
        width: "25%",
      },
      node_query_stage: {
        title: this.hass.localize(
          "ui.panel.config.ozw.nodes_table.query_stage"
        ),
        sortable: true,
        width: narrow ? "25%" : "15%",
      },
      is_zwave_plus: {
        title: this.hass.localize("ui.panel.config.ozw.nodes_table.zwave_plus"),
        hidden: narrow,
        template: (value: boolean) =>
          value ? html` <ha-svg-icon .path=${mdiCheck}></ha-svg-icon>` : "",
      },
      is_failed: {
        title: this.hass.localize("ui.panel.config.ozw.nodes_table.failed"),
        hidden: narrow,
        template: (value: boolean) =>
          value ? html` <ha-svg-icon .path=${mdiAlert}></ha-svg-icon>` : "",
      },
    })
  );

  protected firstUpdated() {
    if (!this.ozwInstance) {
      navigate("/config/ozw/dashboard", { replace: true });
    } else if (this.hass) {
      this._fetchData();
    }
  }

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .tabs=${ozwNetworkTabs(this.ozwInstance)}
        .columns=${this._columns(this.narrow)}
        .data=${this._nodes}
        id="node_id"
        @row-click=${this._handleRowClicked}
        clickable
      >
      </hass-tabs-subpage-data-table>
    `;
  }

  private async _fetchData() {
    this._nodes = await fetchOZWNodes(this.hass!, this.ozwInstance!);
  }

  private _handleRowClicked(ev: HASSDomEvent<RowClickedEvent>) {
    const nodeId = ev.detail.id;
    navigate(`/config/ozw/network/${this.ozwInstance}/node/${nodeId}`);
  }

  static get styles(): CSSResultGroup {
    return haStyle;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ozw-network-nodes": OZWNetworkNodes;
  }
}
