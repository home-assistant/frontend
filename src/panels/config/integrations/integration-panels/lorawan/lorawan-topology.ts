import type {
  CallbackDataParams,
  TopLevelFormatterParams,
} from "echarts/types/dist/shared";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import memoizeOne from "memoize-one";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type {
  HASSDomEvent,
  HASSDomTargetEvent,
} from "../../../../../common/dom/fire_event";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { navigate } from "../../../../../common/navigate";
import type {
  NetworkData,
  NetworkNode,
} from "../../../../../components/chart/ha-network-graph";
import "../../../../../components/chart/ha-network-graph";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-button";
import "../../../../../components/ha-relative-time";
import "../../../../../components/ha-spinner";
import "../../../../../components/input/ha-input-search";
import type { HaInputSearch } from "../../../../../components/input/ha-input-search";
import type {
  LoRaWANDevice,
  LoRaWANDevices,
} from "../../../../../data/lorawan";
import { subscribeLoRaWANDevices } from "../../../../../data/lorawan";
import type { LoRaWANTopology, LoRaWANTopologyNode } from "./lorawan_topology";
import { buildLoRaWANTopology } from "./lorawan_topology";
import "../../../../../layouts/hass-subpage";
import { panelIsReady } from "../../../../../layouts/panel-ready";
import type { HomeAssistant } from "../../../../../types";

@customElement("lorawan-topology")
export class LoRaWANTopologyPanel extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ type: Boolean, reflect: true }) public narrow = false;
  @state() private _snapshot?: LoRaWANDevices;
  @state() private _error = false;
  @state() private _search = "";
  private _unsubscribe?: Promise<UnsubscribeFunc>;
  private _topology: LoRaWANTopology = { nodes: [], links: [] };

  protected firstUpdated() {
    this._subscribe();
  }

  public connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated) this._subscribe();
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribe?.then((unsubscribe) => unsubscribe());
  }

  private _subscribe() {
    this._error = false;
    this._unsubscribe = subscribeLoRaWANDevices(
      this.hass.connection,
      (snapshot) => {
        this._snapshot = snapshot;
        panelIsReady(this);
      }
    ).catch(() => {
      this._error = true;
      panelIsReady(this);
      return () => undefined;
    });
  }

  private _nodeName(node: LoRaWANTopologyNode) {
    return node.kind === "connection"
      ? node.connection.title
      : node.kind === "gateway"
        ? node.gateway_id
        : node.device.name || node.device.dev_eui;
  }

  private _graphData = memoizeOne(
    (topology: LoRaWANTopology, narrow: boolean): NetworkData => {
      const style = getComputedStyle(this);
      const colors = {
        connection: style.getPropertyValue("--primary-color"),
        gateway: style.getPropertyValue("--teal-color"),
        device: style.getPropertyValue("--blue-color"),
        link: style.getPropertyValue("--divider-color"),
      };
      const nodes: NetworkNode[] = [];
      let offset = 0;
      for (const root of topology.nodes.filter(
        (node) => node.kind === "connection"
      )) {
        const children = topology.nodes.filter(
          (node) => node.connection.entry_id === root.connection.entry_id
        );
        const gateways = children.filter((node) => node.kind === "gateway");
        const devices = children.filter((node) => node.kind === "device");
        const height = Math.max(devices.length, gateways.length, 1) * 100;
        for (const node of children) {
          const index =
            node.kind === "connection"
              ? 0
              : node.kind === "gateway"
                ? gateways.indexOf(node)
                : devices.indexOf(node);
          const count =
            node.kind === "connection"
              ? 1
              : node.kind === "gateway"
                ? gateways.length
                : devices.length;
          nodes.push({
            id: node.id,
            name: this._nodeName(node),
            context: node.kind === "device" ? node.device.model : undefined,
            symbol:
              node.kind === "connection"
                ? "roundRect"
                : node.kind === "gateway"
                  ? "diamond"
                  : "circle",
            symbolSize: node.kind === "device" ? 20 : 30,
            itemStyle: {
              color: colors[node.kind],
            },
            label: {
              position:
                narrow && node.kind === "device"
                  ? "top"
                  : narrow && node.kind === "gateway"
                    ? "left"
                    : "right",
            },
            fixed: node.kind === "connection",
            x:
              node.kind === "connection"
                ? 0
                : node.kind === "gateway"
                  ? 320
                  : 640,
            y: offset + ((index + 0.5) * height) / count,
          });
        }
        offset += height + 120;
      }
      return {
        nodes,
        links: topology.links.map((link) => ({
          source: link.source,
          target: link.target,
          symbol: "none",
          value: link.reception?.rssi ?? undefined,
          lineStyle: {
            color:
              link.kind === "membership"
                ? colors.connection
                : link.kind === "unobserved"
                  ? colors.link
                  : colors.gateway,
            width: link.kind === "membership" ? 2 : 1.5,
            type: link.kind === "unobserved" ? "dashed" : "solid",
          },
        })),
      };
    }
  );

  protected willUpdate(changed: PropertyValues) {
    if (
      changed.has("hass") &&
      changed.get("hass")?.themes !== this.hass.themes
    ) {
      this._graphData.clear();
    }
    if (changed.has("_snapshot")) {
      this._topology = buildLoRaWANTopology(
        this._snapshot ?? { connections: [], devices: [] }
      );
    }
  }

  protected render() {
    return html`<hass-subpage
      .hass=${this.hass}
      .narrow=${this.narrow}
      .header=${this.hass.localize("ui.panel.config.lorawan.topology.title")}
      .scrollable=${false}
      back-path="/config/lorawan"
    >
      ${this.narrow ? html`<div slot="header">${this._renderSearch()}</div>` : nothing}
      ${
        this._error
          ? html`<ha-alert alert-type="error"
              >${this.hass.localize("ui.panel.config.lorawan.topology.load_error")}<ha-button
                slot="action"
                appearance="plain"
                @click=${this._subscribe}
                >${this.hass.localize("ui.common.retry")}</ha-button
              ></ha-alert
            >`
          : !this._snapshot
            ? html`<ha-spinner></ha-spinner>`
            : !this._snapshot.connections.length
              ? html`<ha-alert alert-type="info"
                  >${this.hass.localize("ui.panel.config.lorawan.topology.no_connections")}</ha-alert
                >`
              : html`<div class="map">
                  <ha-network-graph
                    .data=${this._graphData(this._topology, this.narrow)}
                    .searchFilter=${this._search}
                    .tooltipFormatter=${this._tooltip}
                    @chart-click=${this._chartClicked}
                    >${!this.narrow ? this._renderSearch("search") : nothing}</ha-network-graph
                  >
                  <div class="legend">
                    <span
                      ><i class="connection-marker"></i
                      >${this.hass.localize("ui.panel.config.lorawan.topology.connection")}</span
                    >
                    <span
                      ><i class="gateway-marker"></i
                      >${this.hass.localize("ui.panel.config.lorawan.topology.gateway")}</span
                    >
                    <span
                      ><i class="device-marker"></i
                      >${this.hass.localize("ui.panel.config.lorawan.topology.device")}</span
                    >
                  </div>
                </div>`
      }
    </hass-subpage>`;
  }

  private _renderSearch(slot = "") {
    return html`<ha-input-search
      appearance="outlined"
      slot=${slot}
      .value=${this._search}
      .placeholder=${this.hass.localize("ui.panel.config.lorawan.topology.search")}
      @input=${this._searchChanged}
    ></ha-input-search>`;
  }

  private _searchChanged(ev: HASSDomTargetEvent<HaInputSearch>) {
    this._search = ev.target.value ?? "";
  }

  private _tooltip = (params: TopLevelFormatterParams) => {
    const item = params as CallbackDataParams;
    const data = item.data;
    if (!data || typeof data !== "object") return nothing;
    if (item.dataType === "edge" && "source" in data && "target" in data) {
      const link = this._topology.links.find(
        (candidate) =>
          candidate.source === data.source && candidate.target === data.target
      );
      if (!link) return nothing;
      if (link.kind === "unobserved") {
        return html`${this.hass.localize("ui.panel.config.lorawan.topology.unobserved")}`;
      }
      if (!link.reception || !link.device) return nothing;
      return html`<strong
          >${link.reception.gateway_id} →
          ${link.device.name || link.device.dev_eui}</strong
        ><br />${this.hass.localize("ui.panel.config.lorawan.rssi")}:
        ${link.reception.rssi === null ? "—" : `${link.reception.rssi} dBm`}<br />${this.hass.localize("ui.panel.config.lorawan.snr")}:
        ${link.reception.snr === null ? "—" : `${link.reception.snr} dB`}${link.device.last_uplink ? html`<br />${this.hass.localize("ui.panel.config.lorawan.last_uplink")}: <ha-relative-time .datetime=${link.device.last_uplink}></ha-relative-time>` : nothing}`;
    }
    if (!("id" in data)) return nothing;
    const node = this._topology.nodes.find(
      (candidate) => candidate.id === data.id
    );
    return node
      ? html`<strong>${this._nodeName(node)}</strong
          ><br />${node.connection.title}`
      : nothing;
  };

  private _chartClicked(ev: HASSDomEvent<HASSDomEvents["chart-click"]>) {
    const data = ev.detail.data;
    if (!data || typeof data !== "object" || !("id" in data)) return;
    const node = this._topology.nodes.find(
      (candidate) => candidate.id === data.id
    );
    if (node?.kind === "device") this._openDevice(node.device);
    else if (node?.kind === "connection") {
      navigate(
        `/config/integrations/integration/${node.connection.domain}${__DEMO__ ? "?" : "#"}config_entry=${node.connection.entry_id}`
      );
    }
  }

  private _openDevice(device: LoRaWANDevice) {
    if (device.device_id) {
      navigate(`/config/devices/device/${device.device_id}`);
      return;
    }
    fireEvent(this, "show-dialog", {
      dialogTag: "dialog-lorawan-device",
      dialogImport: () => import("./dialog-lorawan-device"),
      dialogParams: { device },
    });
  }

  static styles = css`
    :host {
      display: block;
      height: 100%;
    }
    [slot="header"] {
      display: flex;
      align-items: center;
    }
    ha-input-search {
      flex: 1;
    }
    .map {
      position: relative;
      height: 100%;
    }
    ha-network-graph {
      height: 100%;
    }
    .legend {
      position: absolute;
      bottom: 0;
      inset-inline: 0;
      pointer-events: none;
      display: flex;
      gap: var(--ha-space-4);
      justify-content: center;
      padding: 0 var(--ha-space-3) var(--ha-space-4);
      font-size: var(--ha-font-size-s);
    }
    .legend span {
      display: inline-flex;
      align-items: center;
      gap: var(--ha-space-2);
    }
    .legend i {
      width: 12px;
      height: 12px;
      display: inline-block;
    }
    .connection-marker {
      background: var(--primary-color);
      border-radius: 3px;
    }
    .gateway-marker {
      background: var(--teal-color);
      transform: rotate(45deg);
    }
    .device-marker {
      background: var(--blue-color);
      border-radius: 50%;
    }
    ha-spinner {
      display: block;
      margin: var(--ha-space-8) auto;
    }
    ha-alert {
      margin: var(--ha-space-4);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "lorawan-topology": LoRaWANTopologyPanel;
  }
}
