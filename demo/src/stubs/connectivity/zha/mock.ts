import type {
  Neighbor,
  ZHAConfiguration,
  ZHADevice,
  ZHADeviceEndpoint,
  ZHAGroup,
  ZHAGroupMember,
  ZHANetworkBackup,
  ZHANetworkSettings,
} from "../../../../../src/data/zha";
import type { MockHomeAssistant } from "../../../../../src/fake_data/provide_hass";
import { minutesAgo } from "../helpers";

import {
  LANDING_IEEE,
  COORDINATOR_IEEE,
  GARAGE_IEEE,
  KITCHEN_IEEE,
  MOTION_IEEE,
  OFFICE_IEEE,
  PLUG_IEEE,
  PORCH_IEEE,
} from "./fixtures";

const neighbor = (
  ieee: string,
  nwk: string,
  lqi: string,
  relationship: string,
  depth = "1"
): Neighbor => ({ ieee, nwk, lqi, depth, relationship });

const DEVICES: ZHADevice[] = [
  {
    available: true,
    name: "Nabu Casa Connect ZBT-1",
    ieee: COORDINATOR_IEEE,
    nwk: 0x0000,
    lqi: 255,
    rssi: "0",
    last_seen: minutesAgo(0),
    manufacturer: "Nabu Casa",
    model: "Connect ZBT-1",
    quirk_applied: false,
    quirk_class: "zigpy.device.Device",
    entities: [],
    manufacturer_code: 4476,
    device_reg_id: "zha-coordinator",
    user_given_name: "Home Assistant Connect ZBT-1",
    power_source: "Mains",
    device_type: "Coordinator",
    active_coordinator: true,
    signature: {},
    neighbors: [
      neighbor(PORCH_IEEE, "0x1a2b", "224", "Child"),
      neighbor(PLUG_IEEE, "0x3c4d", "198", "Child"),
      neighbor(OFFICE_IEEE, "0x7a8b", "211", "Child"),
    ],
    routes: [],
  },
  {
    available: true,
    name: "TRADFRI bulb E27 CWS 806lm",
    ieee: PORCH_IEEE,
    nwk: 0x1a2b,
    lqi: 224,
    rssi: "-58",
    last_seen: minutesAgo(2),
    manufacturer: "IKEA of Sweden",
    model: "TRADFRI bulb E27 CWS 806lm",
    quirk_applied: true,
    quirk_class: "zhaquirks.ikea.bulb.IkeaBulb",
    entities: [],
    manufacturer_code: 4476,
    device_reg_id: "zha-porch-light",
    user_given_name: "Porch light",
    power_source: "Mains",
    device_type: "Router",
    active_coordinator: false,
    signature: {},
    neighbors: [
      neighbor(COORDINATOR_IEEE, "0x0000", "224", "Parent", "0"),
      neighbor(MOTION_IEEE, "0x5e6f", "142", "Child", "2"),
      neighbor(KITCHEN_IEEE, "0x9c0d", "186", "Sibling", "1"),
    ],
    routes: [],
  },
  {
    available: true,
    name: "TRADFRI motion sensor",
    ieee: MOTION_IEEE,
    nwk: 0x5e6f,
    lqi: 142,
    rssi: "-77",
    last_seen: minutesAgo(9),
    manufacturer: "IKEA of Sweden",
    model: "TRADFRI motion sensor",
    quirk_applied: false,
    quirk_class: "zigpy.device.Device",
    entities: [],
    manufacturer_code: 4476,
    device_reg_id: "zha-hall-motion",
    user_given_name: "Hall motion",
    power_source: "Battery",
    device_type: "EndDevice",
    active_coordinator: false,
    signature: {},
    neighbors: [neighbor(PORCH_IEEE, "0x1a2b", "142", "Parent", "1")],
    routes: [],
  },
  {
    available: false,
    name: "Innr SP 220",
    ieee: PLUG_IEEE,
    nwk: 0x3c4d,
    lqi: 198,
    rssi: "-64",
    last_seen: minutesAgo(240),
    manufacturer: "Innr",
    model: "SP 220",
    quirk_applied: false,
    quirk_class: "zigpy.device.Device",
    entities: [],
    manufacturer_code: 4448,
    device_reg_id: "zha-tv-plug",
    user_given_name: "TV plug",
    power_source: "Mains",
    device_type: "Router",
    active_coordinator: false,
    signature: {},
    neighbors: [neighbor(COORDINATOR_IEEE, "0x0000", "198", "Parent", "0")],
    routes: [],
  },
  {
    available: true,
    name: "TRADFRI on/off switch",
    ieee: KITCHEN_IEEE,
    nwk: 0x9c0d,
    lqi: 186,
    rssi: "-69",
    last_seen: minutesAgo(4),
    manufacturer: "IKEA of Sweden",
    model: "TRADFRI on/off switch",
    quirk_applied: true,
    quirk_class: "zhaquirks.ikea.onoffswitch.IkeaSwitch",
    entities: [],
    manufacturer_code: 4476,
    device_reg_id: "zha-kitchen-switch",
    user_given_name: "Kitchen switch",
    power_source: "Battery",
    device_type: "EndDevice",
    active_coordinator: false,
    signature: {},
    neighbors: [neighbor(PORCH_IEEE, "0x1a2b", "186", "Parent", "1")],
    routes: [],
  },
  {
    available: true,
    name: "Aqara temperature sensor",
    ieee: LANDING_IEEE,
    nwk: 0xab12,
    lqi: 164,
    rssi: "-74",
    last_seen: minutesAgo(6),
    manufacturer: "Aqara",
    model: "WSDCGQ11LM",
    quirk_applied: true,
    quirk_class: "zhaquirks.xiaomi.aqara.weather.Weather",
    entities: [],
    manufacturer_code: 4447,
    device_reg_id: "zha-landing-sensor",
    user_given_name: "Landing sensor",
    power_source: "Battery",
    device_type: "EndDevice",
    active_coordinator: false,
    signature: {},
    neighbors: [neighbor(OFFICE_IEEE, "0x7a8b", "164", "Parent", "2")],
    routes: [],
  },
  {
    available: true,
    name: "Aqara door sensor",
    ieee: GARAGE_IEEE,
    nwk: 0xcd34,
    lqi: 118,
    rssi: "-83",
    last_seen: minutesAgo(21),
    manufacturer: "Aqara",
    model: "MCCGQ11LM",
    quirk_applied: true,
    quirk_class: "zhaquirks.xiaomi.aqara.magnet.Magnet",
    entities: [],
    manufacturer_code: 4447,
    device_reg_id: "zha-garage-contact",
    user_given_name: "Garage contact",
    power_source: "Battery",
    device_type: "EndDevice",
    active_coordinator: false,
    signature: {},
    neighbors: [neighbor(OFFICE_IEEE, "0x7a8b", "118", "Parent", "2")],
    routes: [],
  },
  {
    available: true,
    name: "Innr SP 240",
    ieee: OFFICE_IEEE,
    nwk: 0x7a8b,
    lqi: 211,
    rssi: "-61",
    last_seen: minutesAgo(1),
    manufacturer: "Innr",
    model: "SP 240",
    quirk_applied: false,
    quirk_class: "zigpy.device.Device",
    entities: [],
    manufacturer_code: 4448,
    device_reg_id: "zha-office-plug",
    user_given_name: "Office plug",
    power_source: "Mains",
    device_type: "Router",
    active_coordinator: false,
    signature: {},
    neighbors: [
      neighbor(COORDINATOR_IEEE, "0x0000", "211", "Parent", "0"),
      neighbor(LANDING_IEEE, "0xab12", "164", "Child", "2"),
      neighbor(GARAGE_IEEE, "0xcd34", "118", "Child", "2"),
    ],
    routes: [],
  },
];

const deviceByIeee = (ieee: string): ZHADevice =>
  DEVICES.find((d) => d.ieee === ieee)!;

const member = (ieee: string, endpointId = 1): ZHADeviceEndpoint => ({
  device: deviceByIeee(ieee),
  endpoint_id: endpointId,
  entities: [],
});

const GROUPS: ZHAGroup[] = [
  {
    name: "Downstairs lights",
    group_id: 1,
    members: [member(PORCH_IEEE), member(OFFICE_IEEE)],
  },
  {
    name: "Outdoor lights",
    group_id: 2,
    members: [member(PORCH_IEEE)],
  },
];

const CONFIGURATION: ZHAConfiguration = {
  data: {
    zha_options: {
      default_light_transition: 0,
      enhanced_light_transition: false,
      light_transitioning_flag: true,
      always_prefer_xy_color_mode: true,
      group_members_assume_state: true,
    },
    zha_alarm_options: {
      alarm_master_code: "1234",
      alarm_failed_tries: 3,
      alarm_arm_requires_code: false,
    },
  },
  schemas: {
    zha_options: [
      {
        name: "default_light_transition",
        required: true,
        selector: { number: { min: 0, max: 2 ** 16 / 10, step: 0.1 } },
      },
      {
        name: "enhanced_light_transition",
        required: true,
        selector: { boolean: {} },
      },
      {
        name: "always_prefer_xy_color_mode",
        required: true,
        selector: { boolean: {} },
      },
    ],
    zha_alarm_options: [
      { name: "alarm_master_code", required: true, selector: { text: {} } },
      {
        name: "alarm_failed_tries",
        required: true,
        selector: { number: { min: 0, max: 2 ** 8, mode: "box" } },
      },
      {
        name: "alarm_arm_requires_code",
        required: true,
        selector: { boolean: {} },
      },
    ],
  },
};

const BACKUPS: ZHANetworkBackup[] = [];

const NETWORK_SETTINGS: ZHANetworkSettings = {
  radio_type: "ezsp",
  device: { path: "/dev/ttyUSB0", baudrate: 115200, flow_control: "hardware" },
  settings: {
    backup_time: new Date(Date.now() - 3600000).toISOString(),
    node_info: {
      nwk: "0x0000",
      ieee: COORDINATOR_IEEE,
      logical_type: "coordinator",
    },
    network_info: {
      extended_pan_id: "b0:23:2f:cc:aa:11:22:33",
      pan_id: "0x1234",
      nwk_update_id: 0,
      nwk_manager_id: "0x0000",
      channel: 15,
      channel_mask: [15, 20, 25],
      security_level: 5,
      network_key: {
        key: "aa:bb:cc:dd:ee:ff:00:11:22:33:44:55:66:77:88:99",
        tx_counter: 138234,
        rx_counter: 0,
        seq: 0,
        partner_ieee: "ff:ff:ff:ff:ff:ff:ff:ff",
      },
      tc_link_key: {
        key: "5a:69:67:42:65:65:41:6c:6c:69:61:6e:63:65:30:39",
        tx_counter: 0,
        rx_counter: 0,
        seq: 0,
        partner_ieee: COORDINATOR_IEEE,
      },
      key_table: [],
      children: [PORCH_IEEE, PLUG_IEEE, OFFICE_IEEE],
      nwk_addresses: {
        [PORCH_IEEE]: "0x1a2b",
        [MOTION_IEEE]: "0x5e6f",
        [PLUG_IEEE]: "0x3c4d",
        [KITCHEN_IEEE]: "0x9c0d",
        [LANDING_IEEE]: "0xab12",
        [GARAGE_IEEE]: "0xcd34",
        [OFFICE_IEEE]: "0x7a8b",
      },
      stack_specific: {},
      metadata: { ezsp: { stack_version: "7.4.4.0" } },
      source: "bellows@0.42.6",
    },
  },
};

export const mockZha = (hass: MockHomeAssistant) => {
  hass.mockWS("zha/devices", () => DEVICES);
  hass.mockWS("zha/device", (msg: { ieee: string }) =>
    DEVICES.find((device) => device.ieee === msg.ieee)
  );
  hass.mockWS("zha/groups", () => GROUPS);
  hass.mockWS("zha/group", (msg: { group_id: number }) =>
    GROUPS.find((group) => group.group_id === msg.group_id)
  );
  hass.mockWS("zha/configuration", () => CONFIGURATION);
  hass.mockWS("zha/network/settings", () => NETWORK_SETTINGS);
  hass.mockWS("zha/topology/update", () => undefined);
  hass.mockWS("zha/devices/bindable", () => []);
  hass.mockWS("zha/devices/groupable", () => []);
  hass.mockWS("zha/network/backups/list", () => BACKUPS);

  // The panel offers all of the below, and refetches after each, so they
  // change the mocked state rather than only resolving.
  hass.mockWS("zha/configuration/update", (msg: { data: any }) => {
    Object.entries(msg.data ?? {}).forEach(([section, values]) => {
      CONFIGURATION.data[section] = {
        ...CONFIGURATION.data[section],
        ...(values as Record<string, unknown>),
      };
    });
    return undefined;
  });

  hass.mockWS("zha/network/backups/create", () => {
    const backup: ZHANetworkBackup = {
      backup_time: new Date().toISOString(),
      network_info: NETWORK_SETTINGS.settings.network_info,
      node_info: NETWORK_SETTINGS.settings.node_info,
    };
    BACKUPS.push(backup);
    return { backup, is_complete: true };
  });

  hass.mockWS(
    "zha/network/change_channel",
    (msg: { new_channel: "auto" | number }) => {
      NETWORK_SETTINGS.settings.network_info.channel =
        msg.new_channel === "auto" ? 25 : msg.new_channel;
      return undefined;
    }
  );

  hass.mockWS(
    "zha/group/add",
    (msg: {
      group_name: string;
      group_id?: number;
      members?: ZHAGroupMember[];
    }) => {
      const group: ZHAGroup = {
        name: msg.group_name,
        group_id:
          msg.group_id ??
          GROUPS.reduce(
            (highest, item) => Math.max(highest, item.group_id),
            0
          ) + 1,
        members: (msg.members ?? []).map((item) => member(item.ieee)),
      };
      GROUPS.push(group);
      return group;
    }
  );

  hass.mockWS("zha/group/remove", (msg: { group_ids: number[] }) => {
    msg.group_ids.forEach((groupId) => {
      const index = GROUPS.findIndex((group) => group.group_id === groupId);
      if (index !== -1) {
        GROUPS.splice(index, 1);
      }
    });
    return GROUPS;
  });

  const findGroup = (groupId: number) => {
    const group = GROUPS.find((candidate) => candidate.group_id === groupId);
    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }
    return group;
  };

  hass.mockWS(
    "zha/group/members/add",
    (msg: { group_id: number; members: ZHAGroupMember[] }) => {
      const group = findGroup(msg.group_id);
      const known = new Set(group.members.map((item) => item.device.ieee));
      group.members = [
        ...group.members,
        ...msg.members
          .filter((item) => !known.has(item.ieee))
          .map((item) => member(item.ieee)),
      ];
      return group;
    }
  );

  hass.mockWS(
    "zha/group/members/remove",
    (msg: { group_id: number; members: ZHAGroupMember[] }) => {
      const group = findGroup(msg.group_id);
      const dropped = new Set(msg.members.map((item) => item.ieee));
      group.members = group.members.filter(
        (item) => !dropped.has(item.device.ieee)
      );
      return group;
    }
  );
};
