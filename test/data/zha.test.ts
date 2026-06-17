import { describe, expect, it } from "vitest";

import type { ConfigEntry } from "../../src/data/config_entries";
import { findActiveZhaConfigEntry } from "../../src/data/zha";

const makeEntry = (overrides: Partial<ConfigEntry> = {}): ConfigEntry => ({
  entry_id: "zha-1",
  domain: "zha",
  title: "Zigbee Home Automation",
  source: "user",
  state: "loaded",
  supports_options: true,
  supports_remove_device: true,
  supports_unload: true,
  supports_reconfigure: false,
  supported_subentry_types: {},
  num_subentries: 0,
  pref_disable_new_entities: false,
  pref_disable_polling: false,
  disabled_by: null,
  reason: null,
  error_reason_translation_key: null,
  error_reason_translation_placeholders: null,
  ...overrides,
});

describe("findActiveZhaConfigEntry", () => {
  it("returns undefined when there are no entries", () => {
    expect(findActiveZhaConfigEntry([])).toBeUndefined();
  });

  it("ignores disabled entries", () => {
    expect(
      findActiveZhaConfigEntry([makeEntry({ disabled_by: "user" })])
    ).toBeUndefined();
  });

  it("ignores entries from ignored discoveries", () => {
    expect(
      findActiveZhaConfigEntry([makeEntry({ source: "ignore" })])
    ).toBeUndefined();
  });

  it("returns the active entry when one exists", () => {
    const entry = makeEntry();
    expect(findActiveZhaConfigEntry([entry])).toBe(entry);
  });

  it("returns the first active entry, skipping disabled and ignored ones", () => {
    const active = makeEntry({ entry_id: "zha-active" });
    expect(
      findActiveZhaConfigEntry([
        makeEntry({ entry_id: "zha-disabled", disabled_by: "user" }),
        makeEntry({ entry_id: "zha-ignored", source: "ignore" }),
        active,
      ])
    ).toBe(active);
  });

  it("returns the first active entry when several are active", () => {
    const first = makeEntry({ entry_id: "zha-1" });
    const second = makeEntry({ entry_id: "zha-2" });
    expect(findActiveZhaConfigEntry([first, second])).toBe(first);
  });
});
