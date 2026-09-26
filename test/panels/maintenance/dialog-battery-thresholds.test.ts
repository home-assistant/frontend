import { describe, expect, it, vi } from "vitest";
import { createMockHass } from "../../fixtures/hass";
import { saveMaintenanceData } from "../../../src/data/battery-thresholds";
import "../../../src/panels/maintenance/dialog-battery-thresholds";

vi.mock("../../../src/data/battery-thresholds", () => ({
  saveMaintenanceData: vi.fn(),
}));

type TestDialog = {
  _connection: {
    connection: ReturnType<typeof createMockHass>["connection"];
  };
  _global: string;
  _overrides: Record<string, string>;
} & Record<string, unknown>;

describe("dialog-battery-thresholds", () => {
  it("saves the configured battery thresholds", async () => {
    const hass = createMockHass();
    const save = vi.mocked(saveMaintenanceData);

    save.mockResolvedValue(undefined);

    const dialog = document.createElement(
      "dialog-battery-thresholds"
    ) as unknown as TestDialog;

    Object.defineProperty(dialog, "_connection", {
      value: {
        connection: hass.connection,
      },
      writable: true,
    });

    dialog._global = "40";
    dialog._overrides = {
      device_1: "10",
      device_2: "",
    };

    vi.spyOn(
      dialog as unknown as { closeDialog: () => boolean },
      "closeDialog"
    ).mockImplementation(() => true);

    await (dialog["_save"] as () => Promise<void>)();

    expect(save).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledWith(hass.connection, {
      battery_threshold: 40,
      battery_thresholds: {
        device_1: 10,
      },
    });
  });
});
