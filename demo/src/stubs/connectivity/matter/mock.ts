import type {
  MatterCommissioningParameters,
  MatterFabricData,
  MatterNetworkTopology,
  MatterNetworkTopologyConnection,
  MatterNetworkTopologyNode,
  MatterNodeDiagnostics,
} from "../../../../../src/data/matter";
import { NetworkType, NodeType } from "../../../../../src/data/matter";
import type {
  MatterLockInfo,
  MatterLockUsersResponse,
  SetMatterLockCredentialResult,
} from "../../../../../src/data/matter-lock";
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
    ha_device_id: "matter-side-door-lock",
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
    ha_device_id: "matter-patio-sensor",
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

const FABRICS: MatterFabricData[] = [
  {
    fabric_id: 1,
    vendor_id: 4939,
    fabric_index: 1,
    fabric_label: "Home Assistant",
    vendor_name: "Home Assistant",
  },
];

const NODE_TYPE_BY_ROLE: Record<string, NodeType> = {
  router: NodeType.ROUTING_END_DEVICE,
  sleepy_end_device: NodeType.SLEEPY_END_DEVICE,
  end_device: NodeType.END_DEVICE,
};

const NODES_BY_DEVICE_ID = new Map(
  NODES.filter((node) => node.ha_device_id).map((node) => [
    node.ha_device_id!,
    node,
  ])
);

const nodeIpAddress = (node: MatterNetworkTopologyNode): string =>
  node.network_type === "thread"
    ? `fd11:2233:4455:6677::${(node.node_id ?? 0).toString(16)}`
    : `192.168.1.${100 + (node.node_id ?? 0)}`;

// Diagnostics are derived from the topology so a device's transport,
// availability and node type match the map. The device page reads them per
// device, and gates its actions on `available` and `network_type`.
const buildNodeDiagnostics = (
  node: MatterNetworkTopologyNode
): MatterNodeDiagnostics => ({
  node_id: node.node_id!,
  network_type:
    node.network_type === "thread" ? NetworkType.THREAD : NetworkType.WIFI,
  node_type: node.is_bridge
    ? NodeType.BRIDGE
    : (NODE_TYPE_BY_ROLE[node.role ?? ""] ?? NodeType.END_DEVICE),
  network_name: node.network_name ?? node.ssid ?? undefined,
  ip_adresses: [nodeIpAddress(node)],
  mac_address: node.ext_address?.match(/.{2}/g)?.join(":"),
  available: node.available !== false,
  active_fabrics: FABRICS,
  active_fabric_index: 1,
});

// The backend resolves the device before acting, so both node commands answer
// the same way when it cannot.
const nodeNotFound = (deviceId: string) =>
  Promise.reject({
    code: "node_not_found",
    message: `No Matter node for device ${deviceId}`,
  });

// The manual and QR codes below are the Matter test payload for passcode
// 20202021 with discriminator 3840; the three have to agree.
const COMMISSIONING_PARAMETERS: MatterCommissioningParameters = {
  setup_pin_code: 20202021,
  setup_manual_code: "34970112332",
  setup_qr_code: "MT:Y.K9042C00KA0648G00",
};

const LOCK_INFO: MatterLockInfo = {
  supports_user_management: true,
  supported_credential_types: ["pin"],
  max_users: 10,
  max_pin_users: 10,
  max_rfid_users: null,
  max_credentials_per_user: 2,
  min_pin_length: 4,
  max_pin_length: 8,
  min_rfid_length: null,
  max_rfid_length: null,
};

const LOCK_USERS: MatterLockUsersResponse = {
  max_users: 10,
  users: [
    {
      user_index: 1,
      user_name: "Anne",
      user_unique_id: 1,
      user_status: "occupied_enabled",
      user_type: "unrestricted_user",
      credential_rule: "single",
      credentials: [{ type: "pin", index: 1 }],
      next_user_index: 2,
    },
    {
      user_index: 2,
      user_name: "Cleaner",
      user_unique_id: 2,
      user_status: "occupied_disabled",
      user_type: "week_day_schedule_user",
      credential_rule: "single",
      credentials: [{ type: "pin", index: 2 }],
      next_user_index: null,
    },
  ],
};

export const mockMatter = (hass: MockHomeAssistant) => {
  hass.mockWS("matter/network_topology", () => buildTopology());

  hass.mockWS("matter/subscribe_network_topology", (_msg, _hass, onChange) =>
    emitInitial(() => onChange?.(buildTopology()))
  );

  hass.mockWS("matter/node_diagnostics", (msg: { device_id: string }) => {
    const node = NODES_BY_DEVICE_ID.get(msg.device_id);
    return node ? buildNodeDiagnostics(node) : nodeNotFound(msg.device_id);
  });

  hass.mockWS("matter/ping_node", (msg: { device_id: string }) => {
    const node = NODES_BY_DEVICE_ID.get(msg.device_id);
    return node
      ? { [nodeIpAddress(node)]: node.available !== false }
      : nodeNotFound(msg.device_id);
  });

  hass.mockWS("matter/interview_node", () => undefined);

  // Actions the device page offers for an available node. Without these the
  // dialogs behind them fail with `command_not_mocked`.
  hass.mockWS(
    "matter/open_commissioning_window",
    () => COMMISSIONING_PARAMETERS
  );
  hass.mockWS("matter/remove_matter_fabric", () => undefined);
  hass.mockWS("matter/set_wifi_credentials", () => undefined);
  hass.mockWS("matter/set_thread", () => undefined);

  // The lock device exposes "Manage lock", whose dialog reads back the response
  // of these services.
  hass.mockService("matter", "get_lock_info", (_data, target) => ({
    [target!.entity_id]: LOCK_INFO,
  }));
  hass.mockService("matter", "get_lock_users", (_data, target) => ({
    [target!.entity_id]: LOCK_USERS,
  }));
  hass.mockService("matter", "set_lock_user", () => ({}));
  hass.mockService("matter", "clear_lock_user", () => ({}));
  // Read back straight after saving a user, unlike the two above.
  hass.mockService("matter", "set_lock_credential", (data, target) => ({
    [target!.entity_id]: {
      credential_index: (data?.credential_index as number) ?? 3,
      user_index: (data?.user_index as number) ?? LOCK_USERS.users.length + 1,
      next_credential_index: null,
    } satisfies SetMatterLockCredentialResult,
  }));
};
