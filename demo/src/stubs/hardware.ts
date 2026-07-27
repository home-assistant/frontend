import type {
  HardwareInfo,
  SystemStatusStreamMessage,
} from "../../../src/data/hardware";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

// Mirrors what homeassistant_green reports, so the hardware page resolves the
// board name and the brands image the same way it does on a real Green.
const HARDWARE_INFO: HardwareInfo = {
  hardware: [
    {
      board: {
        hassio_board_id: "green",
        manufacturer: "homeassistant",
        model: "green",
      },
      dongle: null,
      config_entries: [],
      name: "Home Assistant Green",
      url: "https://support.nabucasa.com/hc/en-us/categories/24638797677853-Home-Assistant-Green",
    },
  ],
};

export const mockHardware = (hass: MockHomeAssistant) => {
  hass.mockWS("hardware/info", () => HARDWARE_INFO);

  hass.mockWS(
    "hardware/subscribe_system_status",
    (_msg, _currentHass, onChange) => {
      // Rounded like the hardware integration rounds psutil's values.
      const send = () => {
        const usedMb = 1560 + Math.round(Math.random() * 80);
        const message: SystemStatusStreamMessage = {
          cpu_percent: Math.round((8 + Math.random() * 6) * 10) / 10,
          memory_free_mb: 4096 - usedMb,
          memory_used_mb: usedMb,
          memory_used_percent: Math.round((usedMb / 4096) * 1000) / 10,
          timestamp: new Date().toISOString(),
        };
        onChange?.(message);
      };
      send();
      const interval = window.setInterval(send, 1000);
      return () => clearInterval(interval);
    }
  );
};
