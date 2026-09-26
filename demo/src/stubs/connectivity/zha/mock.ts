import type {
  Attribute,
  AttributeConfigurationStatus,
  Cluster,
  ClusterConfigurationEvent,
  Command,
  Neighbor,
  ReadAttributeServiceData,
  ZHAConfiguration,
  ZHADevice,
  ZHADeviceEndpoint,
  ZHAGroup,
  ZHAEntityReference,
  ZHAGroupMember,
  ZHANetworkBackup,
  ZHANetworkSettings,
} from "../../../../../src/data/zha";
import type { MockHomeAssistant } from "../../../../../src/fake_data/provide_hass";
import { minutesAgo } from "../helpers";

import {
  AREA_BY_IEEE,
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

DEVICES.forEach((zhaDevice) => {
  zhaDevice.area_id = AREA_BY_IEEE[zhaDevice.ieee];
});

const deviceByIeee = (ieee: string): ZHADevice =>
  DEVICES.find((d) => d.ieee === ieee)!;

const ENDPOINT_ENTITIES: Record<string, { entity_id: string; name: string }[]> =
  {
    [PORCH_IEEE]: [{ entity_id: "light.porch", name: "Porch light" }],
    [PLUG_IEEE]: [{ entity_id: "switch.tv_plug", name: "TV plug" }],
    [OFFICE_IEEE]: [{ entity_id: "switch.office_desk", name: "Office desk" }],
  };

const member = (ieee: string, endpointId = 1): ZHADeviceEndpoint => ({
  device: deviceByIeee(ieee),
  endpoint_id: endpointId,
  entities: (ENDPOINT_ENTITIES[ieee] ?? []).map(
    (entity) =>
      ({
        ...entity,
        original_name: entity.name,
      }) as ZHAEntityReference
  ),
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
      consider_unavailable_mains: 7200,
      consider_unavailable_battery: 21600,
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

interface ClusterDefinition {
  name: string;
  attributes: Attribute[];
  commands: Command[];
}

const numberField = (name: string, max: number) => ({
  name,
  required: true,
  selector: { number: { min: 0, max, mode: "box" as const } },
});

const CLUSTERS: Record<number, ClusterDefinition> = {
  0: {
    name: "Basic",
    attributes: [
      { name: "zcl_version", id: 0 },
      { name: "app_version", id: 1 },
      { name: "manufacturer", id: 4 },
      { name: "model", id: 5 },
    ],
    commands: [],
  },
  1: {
    name: "PowerConfiguration",
    attributes: [
      { name: "battery_voltage", id: 32 },
      { name: "battery_percentage_remaining", id: 33 },
    ],
    commands: [],
  },
  3: {
    name: "Identify",
    attributes: [{ name: "identify_time", id: 0 }],
    commands: [
      {
        name: "identify",
        id: 0,
        type: "server",
        schema: [numberField("identify_time", 65535)],
      },
    ],
  },
  4: {
    name: "Groups",
    attributes: [{ name: "name_support", id: 0 }],
    commands: [],
  },
  6: {
    name: "OnOff",
    attributes: [{ name: "on_off", id: 0 }],
    commands: [
      { name: "off", id: 0, type: "server", schema: [] },
      { name: "on", id: 1, type: "server", schema: [] },
      { name: "toggle", id: 2, type: "server", schema: [] },
    ],
  },
  8: {
    name: "LevelControl",
    attributes: [{ name: "current_level", id: 0 }],
    commands: [
      {
        name: "move_to_level",
        id: 0,
        type: "server",
        schema: [
          numberField("level", 254),
          numberField("transition_time", 65535),
        ],
      },
    ],
  },
  25: {
    name: "Ota",
    attributes: [{ name: "current_file_version", id: 2 }],
    commands: [],
  },
  768: {
    name: "ColorControl",
    attributes: [
      { name: "current_hue", id: 0 },
      { name: "current_saturation", id: 1 },
      { name: "color_temperature", id: 7 },
    ],
    commands: [
      {
        name: "move_to_color_temp",
        id: 10,
        type: "server",
        schema: [
          numberField("color_temp_mireds", 500),
          numberField("transition_time", 65535),
        ],
      },
    ],
  },
  1026: {
    name: "TemperatureMeasurement",
    attributes: [
      { name: "measured_value", id: 0 },
      { name: "min_measured_value", id: 1 },
      { name: "max_measured_value", id: 2 },
    ],
    commands: [],
  },
  1280: {
    name: "IasZone",
    attributes: [
      { name: "zone_state", id: 0 },
      { name: "zone_type", id: 1 },
      { name: "zone_status", id: 2 },
    ],
    commands: [],
  },
  2820: {
    name: "ElectricalMeasurement",
    attributes: [
      { name: "rms_voltage", id: 1285 },
      { name: "rms_current", id: 1288 },
      { name: "active_power", id: 1291 },
    ],
    commands: [],
  },
};

const clusterList = (inIds: number[], outIds: number[] = []): Cluster[] =>
  [
    ...inIds.map((id) => ({ id, type: "in" })),
    ...outIds.map((id) => ({ id, type: "out" })),
  ].map(({ id, type }) => ({
    name: CLUSTERS[id].name,
    id,
    endpoint_id: 1,
    type,
  }));

// A device binds from its client side, and group binding lists only those, so
// the remotes carry the `out` clusters they would have on real hardware and
// the mains-powered devices only their OTA one.
const DEVICE_CLUSTERS: Record<string, Cluster[]> = {
  [COORDINATOR_IEEE]: clusterList([0]),
  [PORCH_IEEE]: clusterList([0, 3, 4, 6, 8, 768], [25]),
  [MOTION_IEEE]: clusterList([0, 1, 3, 1280], [3, 6, 8]),
  [PLUG_IEEE]: clusterList([0, 3, 4, 6, 2820], [25]),
  [KITCHEN_IEEE]: clusterList([0, 1, 3], [3, 6, 8]),
  [LANDING_IEEE]: clusterList([0, 1, 3, 1026]),
  [GARAGE_IEEE]: clusterList([0, 1, 3, 1280]),
  [OFFICE_IEEE]: clusterList([0, 3, 4, 6, 2820], [25]),
};

const DEFAULT_ATTRIBUTE_VALUES: Record<string, string> = {
  "1:32": "30",
  "1:33": "184",
  "3:0": "0",
  "4:0": "0",
  "6:0": "1",
  "8:0": "254",
  "768:0": "42",
  "768:1": "180",
  "768:7": "370",
  "1026:0": "2140",
  "1026:1": "-2000",
  "1026:2": "6000",
  "1280:0": "1",
  "1280:1": "21",
  "1280:2": "0",
  "2820:1285": "2300",
  "2820:1288": "410",
  "2820:1291": "94",
};

const writtenAttributes = new Map<string, string>();

const attributeKey = (data: ReadAttributeServiceData) =>
  `${data.ieee}:${data.endpoint_id}:${data.cluster_id}:${data.attribute}`;

const attributeValue = (data: ReadAttributeServiceData): string => {
  const written = writtenAttributes.get(attributeKey(data));
  if (written !== undefined) {
    return written;
  }
  if (data.cluster_id === 0) {
    const device = DEVICES.find((candidate) => candidate.ieee === data.ieee);
    if (data.attribute === 4) {
      return device?.manufacturer ?? "";
    }
    if (data.attribute === 5) {
      return device?.model ?? "";
    }
    return "3";
  }
  return (
    DEFAULT_ATTRIBUTE_VALUES[`${data.cluster_id}:${data.attribute}`] ?? "0"
  );
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
  // Copied: both options editors mutate the fetched data as the user changes a
  // control, so handing out the backing object would persist edits that were
  // never saved. Only the update below writes to it.
  hass.mockWS("zha/configuration", () => structuredClone(CONFIGURATION));
  hass.mockWS("zha/network/settings", () => NETWORK_SETTINGS);
  hass.mockWS("zha/topology/update", () => undefined);
  hass.mockWS("zha/devices/bindable", (msg: { ieee: string }) =>
    DEVICES.filter(
      (candidate) =>
        candidate.device_type === "Router" && candidate.ieee !== msg.ieee
    )
  );
  hass.mockWS("zha/devices/bind", () => undefined);
  hass.mockWS("zha/devices/unbind", () => undefined);
  hass.mockWS("zha/groups/bind", () => undefined);
  hass.mockWS("zha/groups/unbind", () => undefined);
  hass.mockWS(
    "zha/devices/clusters",
    (msg: { ieee: string }) => DEVICE_CLUSTERS[msg.ieee] ?? []
  );
  hass.mockWS(
    "zha/devices/clusters/attributes",
    (msg: { cluster_id: number }) => CLUSTERS[msg.cluster_id]?.attributes ?? []
  );
  hass.mockWS(
    "zha/devices/clusters/commands",
    (msg: { cluster_id: number }) => CLUSTERS[msg.cluster_id]?.commands ?? []
  );
  hass.mockWS(
    "zha/devices/clusters/attributes/value",
    (msg: ReadAttributeServiceData) => attributeValue(msg)
  );
  hass.mockService("zha", "set_zigbee_cluster_attribute", (data) => {
    const write = data as ReadAttributeServiceData & { value: unknown };
    writtenAttributes.set(attributeKey(write), String(write.value));
    return undefined;
  });
  hass.mockWS("zha/devices/groupable", () => [
    member(PORCH_IEEE),
    member(OFFICE_IEEE),
    member(PLUG_IEEE),
  ]);
  hass.mockWS("zha/network/backups/list", () => BACKUPS);

  hass.mockWS("zha/devices/permit", () => () => undefined);

  hass.mockWS(
    "zha/devices/reconfigure",
    (msg: { ieee: string }, _hass, onChange) => {
      const deviceClusters = DEVICE_CLUSTERS[msg.ieee] ?? [];
      const timers: number[] = [];
      let cancelled = false;
      const emit = (event: ClusterConfigurationEvent, step: number) => {
        timers.push(
          window.setTimeout(() => {
            if (!cancelled) {
              onChange!(event);
            }
          }, step * 400)
        );
      };

      deviceClusters.forEach((cluster, index) => {
        emit(
          {
            type: "zha_channel_bind",
            zha_channel_msg_data: {
              cluster_name: cluster.name,
              cluster_id: cluster.id,
              success: true,
            },
          },
          index + 1
        );
        const attributes: AttributeConfigurationStatus[] = CLUSTERS[
          cluster.id
        ].attributes.map((attribute) => ({
          ...attribute,
          status: "SUCCESS",
          min: 30,
          max: 900,
          change: 1,
        }));
        if (attributes.length) {
          emit(
            {
              type: "zha_channel_configure_reporting",
              zha_channel_msg_data: {
                cluster_name: cluster.name,
                cluster_id: cluster.id,
                attributes,
              },
            },
            index + 1
          );
        }
      });
      emit({ type: "zha_channel_cfg_done" }, deviceClusters.length + 1);

      return () => {
        cancelled = true;
        timers.forEach((timer) => clearTimeout(timer));
      };
    }
  );

  hass.mockWS(
    "zha/configuration/update",
    (msg: { data: ZHAConfiguration["data"] }) => {
      Object.entries(msg.data ?? {}).forEach(([section, values]) => {
        CONFIGURATION.data[section] = {
          ...CONFIGURATION.data[section],
          ...values,
        };
      });
      return undefined;
    }
  );

  hass.mockWS("zha/network/backups/create", () => {
    const backup: ZHANetworkBackup = {
      backup_time: new Date().toISOString(),
      // Copied, or changing the channel afterwards would rewrite the backup
      // too, which is the one thing a backup must not do.
      network_info: structuredClone(NETWORK_SETTINGS.settings.network_info),
      node_info: structuredClone(NETWORK_SETTINGS.settings.node_info),
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
