import { describe, expect, it, vi } from "vitest";
import type { SecurityFrontendSystemData } from "../../../src/data/frontend";
import { fetchFrontendSystemData } from "../../../src/data/frontend";
import type { HomeAssistant } from "../../../src/types";
import "../../../src/panels/security/ha-panel-security";
import { createMockHass } from "../../fixtures/hass";

vi.hoisted(() => {
  Object.assign(globalThis, {
    __STATIC_PATH__: "/",
    __BUILD__: "modern",
    __VERSION__: "test",
    __BACKWARDS_COMPAT__: false,
    __SUPERVISOR__: false,
    __NAMESPACE__: "frontend",
  });
});

vi.mock("../../../src/data/frontend", async (importOriginal) => ({
  ...(await importOriginal()),
  fetchFrontendSystemData: vi.fn(),
}));

interface TestPanelSecurity extends HTMLElement {
  hass: HomeAssistant;
  _config?: SecurityFrontendSystemData;
}

const loadConfig = (panel: TestPanelSecurity) =>
  (panel as unknown as Record<"_loadConfig", () => Promise<void>>)[
    "_loadConfig"
  ]();

describe("ha-panel-security", () => {
  it("ignores a stale configuration response after retrying", async () => {
    let resolveInitial!: (value: SecurityFrontendSystemData) => void;
    let resolveRetry!: (value: SecurityFrontendSystemData) => void;
    vi.mocked(fetchFrontendSystemData)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveInitial = resolve;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRetry = resolve;
          })
      );
    const panel = document.createElement(
      "ha-panel-security"
    ) as unknown as TestPanelSecurity;
    panel.hass = createMockHass();

    const initialLoad = loadConfig(panel);
    const retryLoad = loadConfig(panel);
    const retryConfig = {
      alert_entities: [{ entity: "binary_sensor.new" }],
    };
    resolveRetry(retryConfig);
    await retryLoad;
    resolveInitial({
      alert_entities: [{ entity: "binary_sensor.old" }],
    });
    await initialLoad;

    expect(panel._config).toEqual(retryConfig);
  });
});
