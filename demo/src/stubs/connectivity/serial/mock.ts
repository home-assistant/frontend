import type { SerialPortUsage } from "../../../../../src/data/usb";
import type { MockHomeAssistant } from "../../../../../src/fake_data/provide_hass";

const PORTS: SerialPortUsage[] = [
  {
    device: "/dev/ttyUSB0",
    resolved_device:
      "/dev/serial/by-id/usb-Nabu_Casa_ZBT-1_9e2adbd75b8beb119fe564a0f320645d-if00-port0",
    serial_number: "9e2adbd75b8beb119fe564a0f320645d",
    manufacturer: "Nabu Casa",
    description: "Home Assistant Connect ZBT-1",
    interface_description: "Connect ZBT-1",
    interface_num: 0,
    vid: "10C4",
    pid: "EA60",
    bcd_device: 256,
    matching_integrations: ["zha"],
    present: true,
    consumers: [
      {
        kind: "config_entry",
        title: "Home Assistant Connect ZBT-1",
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
    resolved_device:
      "/dev/serial/by-id/usb-Zooz_800_Z-Wave_Stick_533D004242-if00",
    serial_number: "533D004242",
    manufacturer: "Zooz",
    description: "800 Series Z-Wave Long Range",
    interface_description: null,
    interface_num: 0,
    vid: "10C4",
    pid: "EA60",
    bcd_device: 256,
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
    device: "/dev/ttyUSB1",
    resolved_device:
      "/dev/serial/by-id/usb-FTDI_FT232R_USB_UART_A50285BI-if00-port0",
    serial_number: "A50285BI",
    manufacturer: "FTDI",
    description: "FT232R USB UART",
    interface_description: null,
    interface_num: 0,
    vid: "0403",
    pid: "6001",
    bcd_device: 1536,
    matching_integrations: [],
    present: true,
    consumers: [],
    discovery_flows: [],
  },
  {
    // A port that is configured but not currently plugged in. Its add-on icon
    // is requested straight from /api/hassio/addons/<slug>/icon, which the
    // demo has no backend for, so the icon stays blank here.
    device: "/dev/ttyUSB2",
    resolved_device: null,
    serial_number: "0001",
    manufacturer: "Silicon Labs",
    description: "CP2102 USB to UART Bridge Controller",
    interface_description: null,
    interface_num: 0,
    vid: "10C4",
    pid: "EA60",
    bcd_device: null,
    matching_integrations: [],
    present: false,
    consumers: [
      {
        kind: "app",
        title: "ESPHome Device Builder",
        active: false,
        domain: null,
        config_entry_id: null,
        slug: "esphome",
      },
    ],
    discovery_flows: [],
  },
];

export const mockSerial = (hass: MockHomeAssistant) => {
  hass.mockWS("usb/list_serial_ports", () => PORTS);
  hass.mockWS("usb/scan", () => undefined);
};
