import { describe, expect, it } from "vitest";
import type { ConfigEntry } from "../../../../src/data/config_entries";
import type { DeviceRegistryEntry } from "../../../../src/data/device/device_registry";
import type { EntityRegistryEntry } from "../../../../src/data/entity/entity_registry";
import {
  computeIntegrationCardState,
  computeIntegrationCardSummary,
} from "../../../../src/panels/config/integrations/integration-card-summary";

const entry = (
  entry_id: string,
  state: ConfigEntry["state"] = "loaded",
  source = "user"
) => ({ entry_id, state, source }) as ConfigEntry;

const device = (
  config_entries: string[],
  entry_type: DeviceRegistryEntry["entry_type"] = null
) => ({ config_entries, entry_type }) as DeviceRegistryEntry;

const entity = (config_entry_id: string) =>
  ({ config_entry_id }) as EntityRegistryEntry;

describe("computeIntegrationCardState", () => {
  it("returns the most important state regardless of entry order", () => {
    expect(
      computeIntegrationCardState([entry("a", "not_loaded"), entry("b")])
    ).toBe("not_loaded");
    expect(
      computeIntegrationCardState([
        entry("a", "setup_in_progress"),
        entry("b", "setup_retry"),
      ])
    ).toBe("setup_retry");
    expect(computeIntegrationCardState([entry("a"), entry("b")])).toBe(
      "loaded"
    );
  });
});

describe("computeIntegrationCardSummary", () => {
  it("counts devices, services and entities that need attention", () => {
    expect(
      computeIntegrationCardSummary(
        [entry("a"), entry("b", "setup_error")],
        [device(["a"]), device(["b"])],
        [],
        0
      )
    ).toEqual({
      unit: "devices",
      count: 2,
      attention: 1,
      attentionState: "setup_error",
    });

    expect(
      computeIntegrationCardSummary(
        [entry("a", "setup_retry")],
        [device(["a"], "service")],
        [],
        0
      )
    ).toEqual({
      unit: "services",
      count: 1,
      attention: 1,
      attentionState: "setup_retry",
    });

    expect(
      computeIntegrationCardSummary(
        [entry("a"), entry("b", "not_loaded")],
        [],
        [entity("a"), entity("b"), entity("b")],
        3
      )
    ).toEqual({
      unit: "entities",
      count: 3,
      attention: 2,
      attentionState: "not_loaded",
    });
  });

  it("has no shared attention state when entries fail differently", () => {
    expect(
      computeIntegrationCardSummary(
        [entry("a", "setup_error"), entry("b", "not_loaded")],
        [device(["a"]), device(["b"])],
        [],
        0
      )?.attentionState
    ).toBeUndefined();
  });

  it("counts entries when a failing entry owns none of the counted items", () => {
    // "c" failed before creating any device, so counting devices would hide it.
    expect(
      computeIntegrationCardSummary(
        [entry("a"), entry("b", "setup_error"), entry("c", "setup_error")],
        [device(["a"]), device(["b"])],
        [],
        0
      )
    ).toEqual({
      unit: "entries",
      count: 3,
      attention: 2,
      attentionState: "setup_error",
    });

    expect(
      computeIntegrationCardSummary(
        [entry("a"), entry("b", "setup_retry")],
        [],
        [entity("a")],
        1
      )
    ).toEqual({
      unit: "entries",
      count: 2,
      attention: 1,
      attentionState: "setup_retry",
    });
  });

  it("ignores YAML entries when counting entries", () => {
    expect(
      computeIntegrationCardSummary(
        [entry("a", "loaded", "yaml"), entry("b")],
        [],
        [],
        0
      )
    ).toEqual({ unit: "entries", count: 1, attention: 0 });
    expect(
      computeIntegrationCardSummary([entry("a", "loaded", "yaml")], [], [], 0)
    ).toBeUndefined();
  });
});
