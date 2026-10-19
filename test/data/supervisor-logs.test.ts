import { describe, expect, it } from "vitest";
import { LogSeverity } from "../../src/data/integration";
import { parseSupervisorLogs } from "../../src/data/supervisor/logs";

const LOG = [
  "2026-10-19 10:50:59.454 ERROR (MainThread) [supervisor.apps.app] Could not pull image to update app local_demo_mosquitto",
  "2026-10-19 10:53:48.226 INFO (MainThread) [supervisor.docker.app] Updating image homeassistant/amd64-addon-mosquitto:7.1.1 to homeassistant/amd64-addon-mosquitto:7.1.9",
  "2026-10-19 10:53:48.828 WARNING (MainThread) [supervisor.docker.manifest] Failed to fetch manifest for docker.io/homeassistant/amd64-addon-mosquitto:7.1.9 - 404",
  "2026-10-19 10:53:49.364 ERROR (SyncWorker_3) [supervisor.docker.interface] Can't install homeassistant/amd64-addon-mosquitto:7.1.9: [404] not found",
  "Traceback (most recent call last):",
  "2026-10-19 10:53:49.365 WARNING (MainThread) [supervisor.jobs] Background job app_manager_update failed: An unknown error occurred with app local_demo_mosquitto. Check Supervisor logs for details",
  "",
].join("\n");

describe("parseSupervisorLogs", () => {
  it("parses every entry, oldest first, skipping continuation lines", () => {
    const entries = parseSupervisorLogs(LOG);

    expect(entries).toHaveLength(5);
    expect(entries[0]).toEqual({
      time: "10:50:59",
      level: "ERROR",
      message: "Could not pull image to update app local_demo_mosquitto",
    });
    expect(entries[4].level).toBe("WARNING");
  });

  it("keeps only entries at the minimum level or above", () => {
    expect(
      parseSupervisorLogs(LOG, { minLevel: LogSeverity.ERROR }).map(
        (entry) => entry.time
      )
    ).toEqual(["10:50:59", "10:53:49"]);
  });

  it("measures the duration back from the newest entry", () => {
    expect(
      parseSupervisorLogs(LOG, {
        duration: 5000,
        minLevel: LogSeverity.WARNING,
      }).map((entry) => entry.message)
    ).toEqual([
      "Failed to fetch manifest for docker.io/homeassistant/amd64-addon-mosquitto:7.1.9 - 404",
      "Can't install homeassistant/amd64-addon-mosquitto:7.1.9: [404] not found",
      "Background job app_manager_update failed: An unknown error occurred with app local_demo_mosquitto. Check Supervisor logs for details",
    ]);
    expect(parseSupervisorLogs(LOG, { duration: 1 })).toHaveLength(2);
  });

  it("returns nothing for logs it cannot parse", () => {
    expect(parseSupervisorLogs("Starting Supervisor\n")).toEqual([]);
  });
});
