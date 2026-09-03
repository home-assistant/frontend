import type {
  BluetoothAllocationsData,
  BluetoothDeviceData,
  BluetoothScannerDetails,
  BluetoothScannerState,
} from "../../../../src/data/bluetooth";
import type { MockHomeAssistant } from "../../../../src/fake_data/provide_hass";
import { emitInitial } from "./subscription";

const LOCAL_SOURCE = "00:1A:7D:DA:71:11";
const PROXY_SOURCE = "E8:DB:84:A1:C2:30";
const SHED_SOURCE = "A4:CF:12:9B:44:70";

const SCANNERS: BluetoothScannerDetails[] = [
  {
    source: LOCAL_SOURCE,
    connectable: true,
    name: "hci0 (Home Assistant Green)",
    adapter: "hci0",
    scanner_type: "usb",
  },
  {
    source: PROXY_SOURCE,
    connectable: true,
    name: "Living room proxy",
    adapter: "esp32",
    scanner_type: "remote",
  },
  {
    source: SHED_SOURCE,
    connectable: false,
    name: "Shed proxy",
    adapter: "esp32",
    scanner_type: "remote",
  },
];

const SCANNER_STATES: BluetoothScannerState[] = [
  {
    source: LOCAL_SOURCE,
    adapter: "hci0",
    current_mode: "active",
    requested_mode: "active",
  },
  {
    source: PROXY_SOURCE,
    adapter: "esp32",
    current_mode: "active",
    requested_mode: "active",
  },
  {
    // A proxy that was asked to scan actively but fell back to passive; the
    // dashboard renders this as a warning.
    source: SHED_SOURCE,
    adapter: "esp32",
    current_mode: "passive",
    requested_mode: "active",
  },
];

const ALLOCATIONS: BluetoothAllocationsData[] = [
  {
    source: LOCAL_SOURCE,
    slots: 5,
    free: 3,
    allocated: ["A4:C1:38:11:22:33", "E7:2E:00:B1:9A:1C"],
  },
  {
    source: PROXY_SOURCE,
    slots: 3,
    free: 2,
    allocated: ["FC:58:FA:12:34:56"],
  },
];

interface DemoAdvertisement {
  address: string;
  name: string;
  rssi: number;
  source: string;
  connectable?: boolean;
  tx_power?: number;
  manufacturer_data?: Record<number, string>;
  service_data?: Record<string, string>;
  service_uuids?: string[];
}

const ADVERTISEMENTS: DemoAdvertisement[] = [
  {
    address: "A4:C1:38:11:22:33",
    name: "Govee H5075",
    rssi: -58,
    source: LOCAL_SOURCE,
    manufacturer_data: { 60552: "000104a10b64" },
    service_uuids: ["0000ec88-0000-1000-8000-00805f9b34fb"],
  },
  {
    address: "E7:2E:00:B1:9A:1C",
    name: "SwitchBot Meter",
    rssi: -71,
    source: LOCAL_SOURCE,
    service_data: { "0000fd3d-0000-1000-8000-00805f9b34fb": "5400648c14" },
    service_uuids: ["cba20d00-224d-11e6-9fb8-0002a5d5c51b"],
  },
  {
    address: "FC:58:FA:12:34:56",
    name: "Xiaomi LYWSD03MMC",
    rssi: -64,
    source: PROXY_SOURCE,
    service_data: { "0000fe95-0000-1000-8000-00805f9b34fb": "3058590e" },
  },
  {
    address: "C4:7C:8D:6A:5B:20",
    name: "Flower care",
    rssi: -88,
    source: SHED_SOURCE,
    connectable: false,
    service_uuids: ["0000fe95-0000-1000-8000-00805f9b34fb"],
  },
  {
    address: "D0:36:9A:7F:11:80",
    name: "Tile Mate",
    rssi: -79,
    source: PROXY_SOURCE,
    connectable: false,
    service_uuids: ["0000feed-0000-1000-8000-00805f9b34fb"],
  },
  {
    address: "5C:C7:C1:04:9E:2A",
    name: "Nut Find 3",
    rssi: -93,
    source: SHED_SOURCE,
    connectable: false,
  },
];

const buildAdvertisement = (
  advertisement: DemoAdvertisement
): BluetoothDeviceData => ({
  address: advertisement.address,
  name: advertisement.name,
  rssi: advertisement.rssi,
  source: advertisement.source,
  connectable: advertisement.connectable ?? true,
  manufacturer_data: advertisement.manufacturer_data ?? {},
  service_data: advertisement.service_data ?? {},
  service_uuids: advertisement.service_uuids ?? [],
  tx_power: advertisement.tx_power ?? -59,
  time: Date.now() / 1000,
  raw: null,
});

// Nudge the signal strength a little on every tick so the monitors and the
// network map look alive without the rows jumping around.
const jitter = (rssi: number) =>
  Math.max(-99, Math.min(-30, rssi + Math.round(Math.random() * 4) - 2));

export const mockBluetooth = (hass: MockHomeAssistant) => {
  hass.mockWS("bluetooth/subscribe_scanner_details", (_msg, _hass, onChange) =>
    emitInitial(() => onChange?.({ add: SCANNERS }))
  );

  hass.mockWS("bluetooth/subscribe_scanner_state", (_msg, _hass, onChange) =>
    emitInitial(() => SCANNER_STATES.forEach((state) => onChange?.(state)))
  );

  hass.mockWS(
    "bluetooth/subscribe_connection_allocations",
    (msg: { config_entry_id?: string }, _hass, onChange) =>
      emitInitial(() =>
        onChange?.(
          msg.config_entry_id
            ? ALLOCATIONS.filter((a) => a.source === LOCAL_SOURCE)
            : ALLOCATIONS
        )
      )
  );

  hass.mockWS("bluetooth/subscribe_advertisements", (_msg, _hass, onChange) => {
    let advertisements = ADVERTISEMENTS;
    const stopInitial = emitInitial(() =>
      onChange?.({ add: advertisements.map(buildAdvertisement) })
    );
    const interval = window.setInterval(() => {
      advertisements = advertisements.map((advertisement) => ({
        ...advertisement,
        rssi: jitter(advertisement.rssi),
      }));
      onChange?.({ change: advertisements.map(buildAdvertisement) });
    }, 5000);
    return () => {
      stopInitial();
      clearInterval(interval);
    };
  });
};
