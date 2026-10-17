import type { LoRaWANDevice } from "../../../../../src/data/lorawan";
import type { MockHomeAssistant } from "../../../../../src/fake_data/provide_hass";
import { minutesAgo } from "../helpers";
import { emitInitial } from "../subscription";
import { CHIRPSTACK_ENTRY, TTN_ENTRY } from "./fixtures";

const devices = (): LoRaWANDevice[] => {
  const base: LoRaWANDevice = {
    dev_eui: "0000000000000001",
    name: "Greenhouse",
    manufacturer: "Seeed Studio",
    model: "S2101",
    application_id: "home-sensors",
    device_id: "lorawan-greenhouse",
    connection: {
      entry_id: CHIRPSTACK_ENTRY,
      domain: "chirpstack",
      title: "Home ChirpStack",
      configuration_url: "https://www.chirpstack.io/",
    },
    support: "supported",
    last_uplink: minutesAgo(2),
    last_join: minutesAgo(2400),
    last_status: minutesAgo(64),
    receptions: [{ gateway_id: "home-indoor", rssi: -67, snr: 9.5 }],
    battery_level: 87,
    external_power_source: false,
    downlink_margin: 12,
  };
  return [
    base,
    {
      ...base,
      dev_eui: "0000000000000002",
      name: "Study air quality",
      model: "S2103",
      device_id: "lorawan-study",
      application_id: "demo-home",
      connection: {
        entry_id: TTN_ENTRY,
        domain: "thethingsnetwork_lorawan",
        title: "The Things Network",
        configuration_url: "https://eu1.cloud.thethings.network/console",
      },
      receptions: [
        { gateway_id: "brooklyn-rooftop", rssi: -103, snr: -2.5 },
        { gateway_id: "brooklyn-community", rssi: -110, snr: -5.2 },
      ],
      battery_level: 64,
      last_uplink: minutesAgo(4),
      last_status: minutesAgo(140),
    },
    {
      ...base,
      dev_eui: "24E124128E123456",
      name: "Irrigation controller",
      manufacturer: "Milesight",
      model: "UC511",
      device_id: null,
      support: "integration_not_configured",
      battery_level: 93,
      last_uplink: minutesAgo(7),
      receptions: [{ gateway_id: "home-indoor", rssi: -83, snr: 6.8 }],
    },
    {
      ...base,
      dev_eui: "A84041FFFF123456",
      name: "Garage power meter",
      manufacturer: "",
      model: "",
      device_id: null,
      support: "missing_identity",
      battery_level: null,
      external_power_source: true,
      last_uplink: minutesAgo(1),
      receptions: [{ gateway_id: "home-indoor", rssi: -75, snr: 8.1 }],
    },
    {
      ...base,
      dev_eui: "2CF7F1C071500199",
      name: "New soil sensor",
      model: "S2105",
      device_id: null,
      support: "unsupported_model",
      last_uplink: null,
      last_join: null,
      last_status: null,
      receptions: [],
      battery_level: null,
      external_power_source: null,
      downlink_margin: null,
    },
    {
      ...base,
      dev_eui: "2CF7F1C071500166",
      name: "Garden shed",
      device_id: null,
      support: "integration_not_configured",
      battery_level: 18,
      last_uplink: minutesAgo(180),
      last_status: minutesAgo(600),
      receptions: [{ gateway_id: "home-indoor", rssi: -112, snr: -7.5 }],
    },
  ];
};

export const mockLoRaWAN = (hass: MockHomeAssistant) => {
  const deviceList = devices();
  const snapshot = {
    devices: deviceList,
    connections: [
      ...new Map(
        deviceList.map((device) => [
          device.connection.entry_id,
          device.connection,
        ])
      ).values(),
    ],
  };
  hass.mockWS("lorawan/devices/list", () => snapshot);
  hass.mockWS("lorawan/devices/subscribe", (_msg, _hass, onChange) =>
    emitInitial(() => onChange?.(snapshot))
  );
};
