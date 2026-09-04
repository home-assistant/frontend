import type { SerialPortUsage } from "../../../src/data/usb";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

/** The RS-485 adapter the Modbus devices in the demo share. */
export const DEMO_RS485_PORT = "/dev/ttyUSB1";

const demoSerialPorts: SerialPortUsage[] = [
  {
    device: "/dev/ttyUSB0",
    resolved_device: "/dev/ttyUSB0",
    serial_number: "9e2a4de1c0f4ed11a2b0d1e5f6a7b8c9",
    manufacturer: "Nabu Casa",
    description: "SkyConnect v1.0",
    interface_description: null,
    vid: "10C4",
    pid: "EA60",
    matching_integrations: ["zha", "otbr"],
    present: true,
    consumers: [
      {
        kind: "config_entry",
        title: "Zigbee Home Automation",
        active: true,
        domain: "zha",
        config_entry_id: "mock-zha",
        slug: null,
      },
    ],
    discovery_flows: [],
  },
  {
    device: "/dev/ttyACM0",
    resolved_device: "/dev/ttyACM0",
    serial_number: "c4d2e0f8a1b3",
    manufacturer: "Aeotec",
    description: "Z-Stick 7",
    interface_description: null,
    vid: "0658",
    pid: "0200",
    matching_integrations: ["zwave_js"],
    present: true,
    consumers: [
      {
        kind: "config_entry",
        title: "Z-Wave",
        active: true,
        domain: "zwave_js",
        config_entry_id: "mock-zwave-js",
        slug: null,
      },
    ],
    discovery_flows: [],
  },
  {
    device: DEMO_RS485_PORT,
    resolved_device: DEMO_RS485_PORT,
    serial_number: "FTB6SPL3",
    manufacturer: "FTDI",
    description: "USB RS-485 cable",
    interface_description: null,
    vid: "0403",
    pid: "6001",
    matching_integrations: ["flexit", "solaredge_modbus"],
    present: true,
    consumers: [
      {
        kind: "config_entry",
        title: "Flexit Nordic S4",
        active: true,
        domain: "flexit",
        config_entry_id: "mock-flexit",
        slug: null,
      },
      {
        kind: "config_entry",
        title: "SolarEdge SE7K",
        active: true,
        domain: "solaredge_modbus",
        config_entry_id: "mock-solaredge",
        slug: null,
      },
    ],
    discovery_flows: [],
  },
  {
    device: "/dev/ttyAMA0",
    resolved_device: "/dev/ttyAMA0",
    serial_number: null,
    manufacturer: null,
    description: "ttyAMA0",
    interface_description: null,
    matching_integrations: [],
    present: true,
    consumers: [],
    discovery_flows: [],
  },
  {
    device: "/dev/ttyUSB2",
    resolved_device: "/dev/ttyUSB2",
    serial_number: "5c1b9a0e7d34",
    manufacturer: "Prolific",
    description: "Smart meter cable",
    interface_description: null,
    vid: "067B",
    pid: "2303",
    matching_integrations: ["dsmr"],
    present: false,
    consumers: [
      {
        kind: "config_entry",
        title: "Smart meter",
        active: false,
        domain: "dsmr",
        config_entry_id: "mock-dsmr",
        slug: null,
      },
    ],
    discovery_flows: [],
  },
];

export const mockUsb = (hass: MockHomeAssistant) => {
  hass.mockWS("usb/list_serial_ports", () => demoSerialPorts);
  hass.mockWS("usb/scan", () => undefined);
};
