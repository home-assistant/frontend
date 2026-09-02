import type { SerialPortUsage } from "../../../src/data/usb";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

const serialPorts: SerialPortUsage[] = [
  {
    device: "/dev/ttyUSB0",
    resolved_device: "/dev/ttyUSB0",
    serial_number: "0001A9",
    manufacturer: "Nabu Casa",
    description: "SkyConnect v1.0",
    vid: "10C4",
    pid: "EA60",
    matching_integrations: ["zha"],
    present: true,
    consumers: [],
    discovery_flows: [],
  },
];

export const mockUsb = (hass: MockHomeAssistant) => {
  hass.mockWS("usb/scan", () => undefined);
  hass.mockWS("usb/list_serial_ports", () => serialPorts);
};
