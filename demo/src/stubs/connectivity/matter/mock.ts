import type {
  MatterNetworkTopology,
  MatterNetworkTopologyConnection,
  MatterNetworkTopologyNode,
  MatterNodeDiagnostics,
} from "../../../../../src/data/matter";
import { NetworkType, NodeType } from "../../../../../src/data/matter";
import type { MockHomeAssistant } from "../../../../../src/fake_data/provide_hass";
import { emitInitial } from "../subscription";

const EXT_PAN_ID = "dead00beef00cafe";
const THREAD_NETWORK = "ha-thread";

const NODES: MatterNetworkTopologyNode[] = [
  {
    id: "otbr",
    kind: "border_router",
    network_type: "thread",
    ha_device_id: null,
    role: "leader",
    available: true,
    ext_address: "f6a1c30d2b4e5f61",
    rloc16: 0x4000,
    ext_pan_id: EXT_PAN_ID,
    network_name: THREAD_NETWORK,
    host_name: "homeassistant",
    vendor_name: "Home Assistant",
    model_name: "OpenThread Border Router",
  },
  {
    id: "wifi-ap",
    kind: "wifi_ap",
    network_type: "wifi",
    ha_device_id: null,
    available: true,
    ssid: "Home",
    bssid: "3c:37:86:11:22:33",
    vendor_name: "Ubiquiti",
    model_name: "U6 Pro",
  },
  {
    id: "node-1",
    kind: "matter",
    network_type: "thread",
    node_id: 1,
    ha_device_id: "matter-kitchen-light",
    available: true,
    role: "router",
    ext_address: "10a2b3c4d5e6f708",
    rloc16: 0x8401,
    ext_pan_id: EXT_PAN_ID,
    network_name: THREAD_NETWORK,
    vendor_name: "Nanoleaf",
    model_name: "Essentials A19",
  },
  {
    id: "node-2",
    kind: "matter",
    network_type: "thread",
    node_id: 2,
    ha_device_id: "matter-front-door-lock",
    available: true,
    role: "sleepy_end_device",
    ext_address: "20b3c4d5e6f70819",
    rloc16: 0x8402,
    ext_pan_id: EXT_PAN_ID,
    network_name: THREAD_NETWORK,
    vendor_name: "Aqara",
    model_name: "Smart Lock U100",
  },
  {
    id: "node-3",
    kind: "matter",
    network_type: "wifi",
    node_id: 3,
    ha_device_id: "matter-office-plug",
    available: true,
    ssid: "Home",
    vendor_name: "Eve",
    model_name: "Energy",
  },
  {
    id: "node-4",
    kind: "matter",
    network_type: "thread",
    node_id: 4,
    ha_device_id: "matter-garden-sensor",
    available: false,
    role: "end_device",
    ext_address: "30c4d5e6f708192a",
    rloc16: 0x8403,
    ext_pan_id: EXT_PAN_ID,
    network_name: THREAD_NETWORK,
    vendor_name: "Eve",
    model_name: "Weather",
  },
  {
    id: "thread-unknown-1",
    kind: "thread_unknown",
    network_type: "thread",
    available: true,
    role: "end_device",
    ext_address: "40d5e6f708192a3b",
    rloc16: 0x8404,
    ext_pan_id: EXT_PAN_ID,
    network_name: THREAD_NETWORK,
  },
];

const connection = (
  source: string,
  target: string,
  network: string,
  strength: MatterNetworkTopologyConnection["strength"],
  lqi?: number,
  rssi?: number
): MatterNetworkTopologyConnection => ({
  source,
  target,
  network,
  strength,
  source_to_target: { strength, lqi: lqi ?? null, rssi: rssi ?? null },
  target_to_source: { strength, lqi: lqi ?? null, rssi: rssi ?? null },
  via_route_table: false,
  path_cost: null,
});

const CONNECTIONS: MatterNetworkTopologyConnection[] = [
  connection("otbr", "node-1", "thread", "strong", 245, -42),
  connection("otbr", "node-2", "thread", "medium", 160, -68),
  connection("node-1", "node-4", "thread", "weak", 84, -86),
  connection("node-1", "thread-unknown-1", "thread", "medium", 172, -63),
  connection("wifi-ap", "node-3", "wifi", "strong", undefined, -47),
];

const TOPOLOGY: MatterNetworkTopology = {
  collected_at: Date.now() / 1000,
  nodes: NODES,
  connections: CONNECTIONS,
};

const buildTopology = (): MatterNetworkTopology => ({
  ...TOPOLOGY,
  collected_at: Date.now() / 1000,
});

const NODE_DIAGNOSTICS: MatterNodeDiagnostics = {
  node_id: 1,
  network_type: NetworkType.THREAD,
  node_type: NodeType.ROUTING_END_DEVICE,
  network_name: THREAD_NETWORK,
  ip_adresses: ["fd11:22:0:0:1234:5678:9abc:def0"],
  mac_address: "10:a2:b3:c4:d5:e6",
  available: true,
  active_fabrics: [
    {
      fabric_id: 1,
      vendor_id: 4939,
      fabric_index: 1,
      fabric_label: "Home Assistant",
      vendor_name: "Home Assistant",
    },
  ],
  active_fabric_index: 1,
};

export const mockMatter = (hass: MockHomeAssistant) => {
  hass.mockWS("matter/network_topology", () => buildTopology());

  hass.mockWS("matter/subscribe_network_topology", (_msg, _hass, onChange) =>
    emitInitial(() => onChange?.(buildTopology()))
  );

  hass.mockWS("matter/node_diagnostics", () => NODE_DIAGNOSTICS);
  hass.mockWS("matter/ping_node", () => ({
    "fd11:22:0:0:1234:5678:9abc:def0": true,
  }));
  hass.mockWS("matter/interview_node", () => undefined);
};
