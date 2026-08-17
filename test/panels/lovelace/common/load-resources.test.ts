import { afterEach, describe, expect, it, vi } from "vitest";

import { loadJS, loadModule } from "../../../../src/common/dom/load_resource";
import { loadLovelaceResourcesAndWait } from "../../../../src/panels/lovelace/common/load-resources";
import type { HomeAssistant } from "../../../../src/types";

vi.mock("../../../../src/common/dom/load_resource", () => ({
  loadCSS: vi.fn(),
  loadJS: vi.fn(),
  loadModule: vi.fn(),
}));

const hass = {
  auth: { data: { hassUrl: "http://localhost:8123" } },
} as unknown as HomeAssistant;

describe("loadLovelaceResourcesAndWait", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs an error naming the resource that failed to load", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    vi.mocked(loadModule).mockImplementation((url) => Promise.reject(url));

    await loadLovelaceResourcesAndWait(
      [{ id: "1", url: "/local/missing.js", type: "module" }],
      hass
    );

    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleError.mock.calls[0][0]).toContain(
      "http://localhost:8123/local/missing.js"
    );
    expect(consoleError.mock.calls[0][0]).toContain("module");
  });

  it("logs only once for a cached resource that failed to load", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    vi.mocked(loadJS).mockImplementation((url) => Promise.reject(url));
    const resources = [
      { id: "2", url: "/local/broken.js", type: "js" as const },
    ];

    await loadLovelaceResourcesAndWait(resources, hass);
    await loadLovelaceResourcesAndWait(resources, hass);

    expect(loadJS).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledTimes(1);
  });
});
