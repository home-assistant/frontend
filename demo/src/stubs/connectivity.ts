import type {
  BluetoothAllocationsData,
  BluetoothDeviceData,
  BluetoothScannerState,
} from "../../../src/data/bluetooth";
import type { RadioFrequencyTransmitter } from "../../../src/data/radio_frequency";
import type {
  ThreadDataSet,
  ThreadRouter,
  ThreadRouterDiscoveryEvent,
} from "../../../src/data/thread";
import type {
  ZHAConfiguration,
  ZHADevice,
  ZHAGroup,
} from "../../../src/data/zha";
import type {
  ZWaveJSNetwork,
  ZwaveJSProvisioningEntry,
} from "../../../src/data/zwave_js";
import {
  InclusionState,
  NodeStatus,
  NodeType,
  ProvisioningEntryStatus,
  RFRegion,
} from "../../../src/data/zwave_js";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

const baseZhaDevice = {
  entities: [],
  neighbors: [],
  routes: [],
  quirk_applied: false,
  quirk_class: "zigpy.device.Device",
  signature: {},
  power_source: "Battery",
  active_coordinator: false,
  device_type: "EndDevice",
  rssi: "-62",
};

const zhaDevices: ZHADevice[] = [
  {
    ...baseZhaDevice,
    available: true,
    name: "IKEA of Sweden TRADFRI motion sensor",
    ieee: "00:0d:6f:00:11:22:33:44",
    nwk: 0x1a2b,
    lqi: 156,
    last_seen: "2026-09-01T07:12:33",
    manufacturer: "IKEA of Sweden",
    model: "TRADFRI motion sensor",
    manufacturer_code: 4476,
    device_reg_id: "zha-motion",
  },
  {
    ...baseZhaDevice,
    available: true,
    name: "IKEA of Sweden TRADFRI on/off switch",
    ieee: "00:0d:6f:00:55:66:77:88",
    nwk: 0x3c4d,
    lqi: 201,
    last_seen: "2026-09-01T07:09:02",
    manufacturer: "IKEA of Sweden",
    model: "TRADFRI on/off switch",
    manufacturer_code: 4476,
    device_reg_id: "zha-remote",
  },
];

const zhaGroups: ZHAGroup[] = [
  { name: "Downstairs lights", group_id: 1, members: [] },
];

// Every schema key other than zha_options becomes an extra settings page link
// on the Zigbee dashboard, named by a backend translation the demo does not
// load, so only zha_options is mocked.
const zhaConfiguration: ZHAConfiguration = {
  data: { zha_options: {} },
  schemas: { zha_options: [] },
};

const zwaveNetwork: ZWaveJSNetwork = {
  client: {
    state: "connected",
    ws_server_url: "ws://localhost:3000",
    server_version: "1.44.0",
    driver_version: "15.5.1",
  },
  controller: {
    home_id: 3465358161,
    sdk_version: "7.21.0",
    type: 1,
    own_node_id: 1,
    rf_region: RFRegion.Europe,
    is_primary: true,
    is_using_home_id_from_other_network: false,
    is_sis_present: true,
    was_real_primary: true,
    is_suc: true,
    node_type: NodeType.Controller,
    firmware_version: "7.21",
    manufacturer_id: 134,
    product_id: 1,
    product_type: 1,
    supported_function_types: [],
    suc_node_id: 1,
    supports_timers: false,
    is_rebuilding_routes: false,
    inclusion_state: InclusionState.Idle,
    supports_long_range: true,
    nodes: [
      {
        node_id: 1,
        ready: true,
        status: NodeStatus.Alive,
        is_secure: false,
        is_routing: true,
        zwave_plus_version: 2,
        highest_security_class: null,
        is_controller_node: true,
        has_firmware_update_cc: false,
      },
      {
        node_id: 12,
        ready: true,
        status: NodeStatus.Alive,
        is_secure: "S2_Authenticated",
        is_routing: true,
        zwave_plus_version: 2,
        highest_security_class: null,
        is_controller_node: false,
        has_firmware_update_cc: true,
      },
      {
        node_id: 17,
        ready: true,
        status: NodeStatus.Asleep,
        is_secure: false,
        is_routing: false,
        zwave_plus_version: 2,
        highest_security_class: null,
        is_controller_node: false,
        has_firmware_update_cc: false,
      },
    ],
  },
};

const zwaveProvisioningEntries: ZwaveJSProvisioningEntry[] = [
  {
    dsk: "51590-08348-59223-49781-40195-25436-01011-56662",
    securityClasses: [],
    status: ProvisioningEntryStatus.Active,
  },
];

const threadDataSets: ThreadDataSet[] = [
  {
    channel: 15,
    created: "2026-06-04T10:22:15.123456+00:00",
    dataset_id: "demo-dataset",
    extended_pan_id: "d1e2f3a4b5c6d7e8",
    network_name: "ha-thread-d1e2",
    pan_id: "1f4c",
    preferred_border_agent_id: "demo-border-agent",
    preferred_extended_address: "aabbccddeeff0011",
    preferred: true,
    source: "otbr",
  },
];

const threadRouters: ThreadRouter[] = [
  {
    instance_name: "Home Assistant Connect ZBT-1",
    addresses: ["fd11:2233:4455::1"],
    border_agent_id: "demo-border-agent",
    brand: "homeassistant",
    extended_address: "aabbccddeeff0011",
    extended_pan_id: "d1e2f3a4b5c6d7e8",
    model_name: "OpenThread Border Router",
    network_name: "ha-thread-d1e2",
    server: "core-openthread-border-router.local.",
    thread_version: "1.3.0",
    unconfigured: null,
    vendor_name: "Home Assistant",
  },
  {
    instance_name: "Apple TV",
    addresses: ["fd11:2233:4455::2"],
    border_agent_id: "demo-apple-border-agent",
    brand: "apple",
    extended_address: "1122334455667788",
    extended_pan_id: "d1e2f3a4b5c6d7e8",
    model_name: "Apple TV",
    network_name: "ha-thread-d1e2",
    server: "apple-tv.local.",
    thread_version: "1.3.0",
    unconfigured: null,
    vendor_name: "Apple Inc.",
  },
];

const bluetoothScannerState: BluetoothScannerState = {
  source: "AA:BB:CC:DD:EE:FF",
  adapter: "hci0",
  current_mode: "active",
  requested_mode: "active",
};

const bluetoothAllocations: BluetoothAllocationsData[] = [
  {
    source: "AA:BB:CC:DD:EE:FF",
    slots: 5,
    free: 4,
    allocated: ["11:22:33:44:55:66"],
  },
];

const bluetoothAdvertisements: BluetoothDeviceData[] = [
  {
    address: "11:22:33:44:55:66",
    connectable: true,
    manufacturer_data: {},
    name: "Bedroom thermometer",
    rssi: -58,
    service_data: {},
    service_uuids: ["0000181a-0000-1000-8000-00805f9b34fb"],
    source: "AA:BB:CC:DD:EE:FF",
    time: 1756707120,
    tx_power: -59,
    raw: null,
  },
  {
    address: "77:88:99:AA:BB:CC",
    connectable: false,
    manufacturer_data: {},
    name: "Plant sensor",
    rssi: -81,
    service_data: {},
    service_uuids: ["0000fe95-0000-1000-8000-00805f9b34fb"],
    source: "AA:BB:CC:DD:EE:FF",
    time: 1756707100,
    tx_power: -59,
    raw: null,
  },
];

const radioFrequencyTransmitters: RadioFrequencyTransmitter[] = [
  {
    entity_id: "radio_frequency.rf_bridge",
    device_id: "rf-bridge",
    config_entry_id: "mock-mqtt",
    supported_frequency_ranges: [
      [433050000, 434790000],
      [868000000, 868600000],
    ],
    supported_modulations: ["ook", "fsk"],
  },
];

// Mocks for the protocol pages linked from the connectivity settings page.
// The Matter and MQTT pages need no commands of their own, they render from
// their config entry.
export const mockConnectivity = (hass: MockHomeAssistant) => {
  hass.mockWS("zha/configuration", () => zhaConfiguration);
  hass.mockWS("zha/devices", () => zhaDevices);
  hass.mockWS("zha/groups", () => zhaGroups);

  hass.mockWS("zwave_js/network_status", () => zwaveNetwork);
  hass.mockWS(
    "zwave_js/get_provisioning_entries",
    () => zwaveProvisioningEntries
  );
  hass.mockWS("zwave_js/data_collection_status", () => ({
    enabled: false,
    opted_in: false,
  }));
  hass.mockWS("zwave_js/subscribe_s2_inclusion", () => () => undefined);

  hass.mockWS("thread/list_datasets", () => ({ datasets: threadDataSets }));
  hass.mockWS(
    "thread/discover_routers",
    (_msg, _hass, onChange?: (message: ThreadRouterDiscoveryEvent) => void) => {
      threadRouters.forEach((router) =>
        onChange?.({
          key: router.extended_address,
          type: "router_discovered",
          data: router,
        })
      );
      return () => undefined;
    }
  );

  hass.mockWS(
    "bluetooth/subscribe_scanner_state",
    (_msg, _hass, onChange?: (state: BluetoothScannerState) => void) => {
      onChange?.(bluetoothScannerState);
      return () => undefined;
    }
  );
  hass.mockWS(
    "bluetooth/subscribe_connection_allocations",
    (_msg, _hass, onChange?: (data: BluetoothAllocationsData[]) => void) => {
      onChange?.(bluetoothAllocations);
      return () => undefined;
    }
  );
  hass.mockWS(
    "bluetooth/subscribe_advertisements",
    (
      _msg,
      _hass,
      onChange?: (message: { add: BluetoothDeviceData[] }) => void
    ) => {
      // Deferred: the collection backing this subscription resets its state
      // to the initial fetch right after subscribing.
      setTimeout(() => onChange?.({ add: bluetoothAdvertisements }));
      return () => undefined;
    }
  );

  hass.mockWS("radio_frequency/list", () => ({
    transmitters: radioFrequencyTransmitters,
  }));
};
