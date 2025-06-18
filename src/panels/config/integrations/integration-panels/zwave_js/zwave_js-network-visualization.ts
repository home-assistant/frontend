import { customElement, property, state } from "lit/decorators";
import { css, html, LitElement, nothing } from "lit";
import memoizeOne from "memoize-one";
import type { HomeAssistant, Route } from "../../../../../types";
import { configTabs } from "./zwave_js-config-router";
import { SubscribeMixin } from "../../../../../mixins/subscribe-mixin";
import type {
  NetworkData,
  NetworkLink,
  NetworkNode,
} from "../../../../../components/chart/ha-network-graph";
import "../../../../../components/chart/ha-network-graph";
import "../../../../../layouts/hass-tabs-subpage";
import { fetchZwaveNetworkStatus } from "../../../../../data/zwave_js";
import { colorVariables } from "../../../../../resources/theme/color.globals";

@customElement("zwave_js-network-visualization")
export class ZWaveJSNetworkVisualization extends SubscribeMixin(LitElement) {
  public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public configEntryId!: string;

  @state() private _data: NetworkData | null = null;

  protected async firstUpdated() {
    this._data = await this._getNetworkData();
  }

  protected render() {
    if (!this._data) {
      return nothing;
    }
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .tabs=${configTabs}
      >
        <ha-network-graph
          .hass=${this.hass}
          .data=${this._data}
          @chart-click=${this._handleChartClick}
        ></ha-network-graph
      ></hass-tabs-subpage>
    `;
  }

  private _getNetworkData = memoizeOne(async (): Promise<NetworkData> => {
    const nodes: NetworkNode[] = [];
    const links: NetworkLink[] = [];
    const categories = [
      {
        name: this.hass.localize(
          "ui.panel.config.zwave_js.visualization.controller"
        ),
        symbol: "roundRect",
        itemStyle: {
          color: colorVariables["primary-color"],
        },
      },
      {
        name: this.hass.localize("ui.panel.config.zwave_js.visualization.node"),
        symbol: "circle",
        itemStyle: {
          color: colorVariables["cyan-color"],
        },
      },
    ];
    const network = await fetchZwaveNetworkStatus(this.hass!, {
      entry_id: this.configEntryId,
    });
    network.controller.nodes.forEach((node) => {
      nodes.push({
        id: String(node.node_id),
        label: String(node.node_id),
        fixed: node.is_controller_node,
        polarDistance: node.is_controller_node ? 0 : 0.5,
        category: node.is_controller_node ? 0 : 1,
      });
    });

    return { nodes, links, categories };
  });

  private _handleChartClick(_e: CustomEvent) {
    // @TODO
  }

  static get styles() {
    return [
      css`
        ha-network-graph {
          height: 100%;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zwave_js-network-visualization": ZWaveJSNetworkVisualization;
  }
}
