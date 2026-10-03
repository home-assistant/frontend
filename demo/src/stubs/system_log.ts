import type { LoggedError } from "../../../src/data/system_log";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

const now = Date.now() / 1000;

const logs: LoggedError[] = [
  {
    name: "homeassistant.components.demo",
    message: ["Demo integration failed to update sensor data"],
    level: "warning",
    source: ["components/demo/sensor.py", 142],
    exception: "",
    count: 2,
    timestamp: now - 120,
    first_occurred: now - 3600,
  },
  {
    name: "homeassistant.config_entries",
    message: ["Config entry for met.no could not be set up"],
    level: "error",
    source: ["config_entries.py", 512],
    exception:
      'Traceback (most recent call last):\n  File "config_entries.py", line 512',
    count: 1,
    timestamp: now - 600,
    first_occurred: now - 600,
  },
];

export const mockSystemLog = (hass: MockHomeAssistant) => {
  hass.mockAPI("error/all", () => []);
  hass.mockWS("system_log/list", () => logs);
};
