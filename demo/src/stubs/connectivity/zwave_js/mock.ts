import type {
  ZWaveJSController,
  ZWaveJSNetwork,
  ZWaveJSNodeStatisticsUpdatedMessage,
  ZWaveJSNodeStatus,
  ZwaveJSProvisioningEntry,
} from "../../../../../src/data/zwave_js";
import {
  NodeStatus,
  ProvisioningEntryStatus,
  SecurityClass,
} from "../../../../../src/data/zwave_js";
import type { MockHomeAssistant } from "../../../../../src/fake_data/provide_hass";
import { emitInitial } from "../subscription";

import {
  CONTROLLER_NODE_ID,
  DEVICE_IDS_BY_NODE_ID,
  DIMMER_NODE_ID,
  HALLWAY_NODE_ID,
  HOME_ID,
  LOCK_NODE_ID,
  MOTION_NODE_ID,
  OUTLET_NODE_ID,
  SENSOR_NODE_ID,
  THERMOSTAT_NODE_ID,
} from "./fixtures";

const node = (
  nodeId: number,
  status: NodeStatus,
  overrides: Partial<ZWaveJSNodeStatus> = {}
): ZWaveJSNodeStatus => ({
  node_id: nodeId,
  ready: true,
  status,
  is_secure: true,
  is_routing: true,
  zwave_plus_version: 2,
  highest_security_class: SecurityClass.S2_Authenticated,
  is_controller_node: false,
  has_firmware_update_cc: true,
  ...overrides,
});

const NODES: ZWaveJSNodeStatus[] = [
  node(CONTROLLER_NODE_ID, NodeStatus.Alive, {
    is_controller_node: true,
    highest_security_class: SecurityClass.S2_AccessControl,
  }),
  node(HALLWAY_NODE_ID, NodeStatus.Alive),
  node(DIMMER_NODE_ID, NodeStatus.Alive),
  node(MOTION_NODE_ID, NodeStatus.Asleep, { is_routing: false }),
  node(LOCK_NODE_ID, NodeStatus.Asleep, {
    is_routing: false,
    highest_security_class: SecurityClass.S2_AccessControl,
  }),
  node(THERMOSTAT_NODE_ID, NodeStatus.Alive),
  node(SENSOR_NODE_ID, NodeStatus.Dead, { is_routing: false }),
  node(OUTLET_NODE_ID, NodeStatus.Alive),
];

const CONTROLLER: ZWaveJSController = {
  home_id: HOME_ID,
  sdk_version: "7.19.3",
  type: 1,
  own_node_id: CONTROLLER_NODE_ID,
  rf_region: null,
  is_primary: true,
  is_using_home_id_from_other_network: false,
  is_sis_present: true,
  was_real_primary: true,
  is_suc: true,
  // NodeType.Controller; the enum itself is not exported from data/zwave_js.
  node_type: 0 as ZWaveJSController["node_type"],
  firmware_version: "1.10",
  manufacturer_id: 634,
  product_id: 4,
  product_type: 3,
  supported_function_types: [],
  suc_node_id: CONTROLLER_NODE_ID,
  supports_timers: false,
  is_rebuilding_routes: false,
  // InclusionState.Idle
  inclusion_state: 0,
  nodes: NODES,
  supports_long_range: true,
};

const NETWORK: ZWaveJSNetwork = {
  client: {
    state: "connected",
    ws_server_url: "ws://localhost:3000",
    server_version: "1.40.1",
    driver_version: "13.2.0",
  },
  controller: CONTROLLER,
};

const PROVISIONING_ENTRIES: ZwaveJSProvisioningEntry[] = [
  {
    dsk: "51590-27189-49239-34778-15304-59293-52843-45852",
    securityClasses: [SecurityClass.S2_Authenticated],
    status: ProvisioningEntryStatus.Active,
    additionalProperties: {},
    manufacturer: "Zooz",
    label: "ZEN32 Scene Controller",
  },
];

// Node IDs each node can reach directly. Only requested when the map's
// neighbor overlay is toggled on.
const NEIGHBORS: Record<number, number[]> = {
  [CONTROLLER_NODE_ID]: [HALLWAY_NODE_ID, DIMMER_NODE_ID, OUTLET_NODE_ID],
  [HALLWAY_NODE_ID]: [
    CONTROLLER_NODE_ID,
    DIMMER_NODE_ID,
    LOCK_NODE_ID,
    THERMOSTAT_NODE_ID,
  ],
  [DIMMER_NODE_ID]: [
    CONTROLLER_NODE_ID,
    HALLWAY_NODE_ID,
    SENSOR_NODE_ID,
    OUTLET_NODE_ID,
  ],
  [MOTION_NODE_ID]: [THERMOSTAT_NODE_ID],
  [LOCK_NODE_ID]: [HALLWAY_NODE_ID],
  [THERMOSTAT_NODE_ID]: [HALLWAY_NODE_ID, MOTION_NODE_ID],
  [SENSOR_NODE_ID]: [DIMMER_NODE_ID],
  [OUTLET_NODE_ID]: [CONTROLLER_NODE_ID, DIMMER_NODE_ID],
};

// Route each node reports as its last working route back to the controller,
// so the map can draw the mesh instead of a star.
const ROUTES: Record<number, { repeaters: number[]; rssi: number }> = {
  [HALLWAY_NODE_ID]: { repeaters: [], rssi: -44 },
  [DIMMER_NODE_ID]: { repeaters: [], rssi: -48 },
  [OUTLET_NODE_ID]: { repeaters: [], rssi: -57 },
  [LOCK_NODE_ID]: { repeaters: [HALLWAY_NODE_ID], rssi: -72 },
  [THERMOSTAT_NODE_ID]: { repeaters: [HALLWAY_NODE_ID], rssi: -66 },
  [MOTION_NODE_ID]: {
    repeaters: [HALLWAY_NODE_ID, THERMOSTAT_NODE_ID],
    rssi: -79,
  },
  [SENSOR_NODE_ID]: { repeaters: [DIMMER_NODE_ID], rssi: -81 },
};

const NODE_IDS_BY_DEVICE_ID: Record<string, number> = Object.fromEntries(
  Object.entries(DEVICE_IDS_BY_NODE_ID).map(([nodeId, deviceId]) => [
    deviceId,
    Number(nodeId),
  ])
);

const buildNodeStatistics = (
  nodeId: number
): ZWaveJSNodeStatisticsUpdatedMessage => {
  const route = ROUTES[nodeId];
  return {
    event: "statistics updated",
    source: "node",
    nodeId,
    node_id: nodeId,
    commands_tx: 1200 + nodeId * 7,
    commands_rx: 980 + nodeId * 5,
    commands_dropped_tx: 0,
    commands_dropped_rx: nodeId === SENSOR_NODE_ID ? 4 : 0,
    timeout_response: 0,
    rtt: 24 + nodeId,
    rssi: route?.rssi ?? null,
    lwr: route
      ? {
          protocol_data_rate: 3,
          repeaters: route.repeaters.map(
            (repeaterNodeId) => DEVICE_IDS_BY_NODE_ID[repeaterNodeId]
          ),
          rssi: route.rssi,
          repeater_rssi: route.repeaters.map(() => -55),
          route_failed_between: null,
        }
      : null,
    nlwr: null,
  };
};

export const mockZwaveJs = (hass: MockHomeAssistant) => {
  hass.mockWS("zwave_js/network_status", () => NETWORK);
  hass.mockWS("zwave_js/network_neighbors", () => NEIGHBORS);
  hass.mockWS("zwave_js/get_provisioning_entries", () => PROVISIONING_ENTRIES);
  hass.mockWS("zwave_js/data_collection_status", () => ({
    enabled: false,
    opted_in: false,
  }));
  hass.mockWS("zwave_js/subscribe_s2_inclusion", () => () => undefined);
  hass.mockWS("zwave_js/node_status", (msg: { device_id: string }) => {
    const nodeId = NODE_IDS_BY_DEVICE_ID[msg.device_id];
    return NODES.find((n) => n.node_id === nodeId) ?? NODES[0];
  });
  hass.mockWS(
    "zwave_js/subscribe_node_statistics",
    (msg: { device_id: string }, _hass, onChange) => {
      const nodeId = NODE_IDS_BY_DEVICE_ID[msg.device_id];
      if (nodeId === undefined || nodeId === CONTROLLER_NODE_ID) {
        return () => undefined;
      }
      return emitInitial(() => onChange?.(buildNodeStatistics(nodeId)));
    }
  );
  hass.mockWS(
    "zwave_js/subscribe_controller_statistics",
    (_msg, _hass, onChange) =>
      emitInitial(() =>
        onChange?.({
          event: "statistics updated",
          source: "controller",
          messages_tx: 18234,
          messages_rx: 17980,
          messages_dropped_tx: 2,
          messages_dropped_rx: 5,
          nak: 0,
          can: 3,
          timeout_ack: 1,
          timeout_response: 0,
          timeout_callback: 0,
        })
      )
  );
};
