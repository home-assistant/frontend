import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type {
  EnergyPreferences,
  EnergySource,
} from "../../../../src/data/energy";
import { energyCardRegistrations } from "../../../../src/data/lovelace_custom_cards";
import type { HomeAssistant } from "../../../../src/types";
import {
  getEnergyCardCatalog,
  hasEnergySource,
  hasGasRateSource,
  hasWaterRateSource,
  isEnergyCardVisible,
  isEnergyViewEmpty,
  visibleEnergyCards,
} from "../../../../src/panels/energy/strategies/energy-cards";

// visibleEnergyCards builds each card's config, so the built-in gas cards it
// touches only need `localize`; no gas card is a sankey, so no other hass state
// is read.
const mockHass = { localize: (k: string) => k } as unknown as HomeAssistant;

// The external (custom:) card configs a strategy would render for a view.
const externalConfigs = (
  view: Parameters<typeof visibleEnergyCards>[0],
  prefs: EnergyPreferences,
  hidden: string[] | undefined,
  collectionKey: string
) =>
  visibleEnergyCards(view, { hass: mockHass, prefs, collectionKey }, hidden)
    .filter((c) => c.type.startsWith("custom:"))
    .map((c) => c.config);

const source = (s: Partial<EnergySource> & { type: string }): EnergySource =>
  s as unknown as EnergySource;

const makePrefs = (
  prefs: Partial<EnergyPreferences> = {}
): EnergyPreferences => ({
  energy_sources: [],
  device_consumption: [],
  device_consumption_water: [],
  ...prefs,
});

const GRID_RETURN = source({
  type: "grid",
  stat_energy_from: "sensor.grid_in",
  stat_energy_to: "sensor.grid_out",
});
const SOLAR = source({ type: "solar", stat_energy_from: "sensor.solar" });
const GAS = source({ type: "gas", stat_energy_from: "sensor.gas" });
const WATER = source({ type: "water", stat_energy_from: "sensor.water" });
const GAS_RATE = source({
  type: "gas",
  stat_energy_from: "sensor.gas",
  stat_rate: "sensor.gas_rate",
});
const WATER_RATE = source({
  type: "water",
  stat_energy_from: "sensor.water",
  stat_rate: "sensor.water_rate",
});

describe("catalog applicability", () => {
  const applicableKeys = (
    view: Parameters<typeof isEnergyCardVisible>[0],
    prefs: Parameters<typeof isEnergyCardVisible>[2]
  ) =>
    getEnergyCardCatalog()
      .filter((c) => c.view === view && c.isApplicable(prefs))
      .map((c) => c.key);

  it("only lists cards relevant to the configured sources", () => {
    const gasOnly = makePrefs({ energy_sources: [GAS] });
    expect(applicableKeys("gas", gasOnly)).toEqual([
      "gas.energy-gas-graph",
      "gas.energy-sources-table",
    ]);
    // No electricity sources -> no electricity cards apply.
    expect(applicableKeys("electricity", gasOnly)).toEqual([]);
  });

  it("gates the solar graph and gauges on their sources", () => {
    const catalog = getEnergyCardCatalog();
    const solarGraph = catalog.find(
      (c) => c.key === "electricity.energy-solar-graph"
    )!;
    expect(
      solarGraph.isApplicable(makePrefs({ energy_sources: [SOLAR] }))
    ).toBe(true);
    expect(
      solarGraph.isApplicable(makePrefs({ energy_sources: [GRID_RETURN] }))
    ).toBe(false);

    const neutralityGauge = catalog.find(
      (c) => c.key === "electricity.energy-grid-neutrality-gauge"
    )!;
    // Needs grid export (return).
    expect(
      neutralityGauge.isApplicable(makePrefs({ energy_sources: [GRID_RETURN] }))
    ).toBe(true);
    expect(
      neutralityGauge.isApplicable(makePrefs({ energy_sources: [SOLAR] }))
    ).toBe(false);
  });
});

describe("isEnergyViewEmpty", () => {
  const prefs = makePrefs({ energy_sources: [WATER] });

  it("is false when no cards in the view are hidden", () => {
    expect(isEnergyViewEmpty("water", prefs, undefined)).toBe(false);
  });

  it("is false when only some applicable cards are hidden", () => {
    expect(
      isEnergyViewEmpty("water", prefs, ["water.energy-water-graph"])
    ).toBe(false);
  });

  it("is true when every applicable card is hidden", () => {
    expect(
      isEnergyViewEmpty("water", prefs, [
        "water.energy-water-graph",
        "water.energy-sources-table",
      ])
    ).toBe(true);
  });

  it("is false when the view has no applicable cards at all", () => {
    // Water source configured, but the gas view has nothing applicable.
    expect(isEnergyViewEmpty("gas", prefs, [])).toBe(false);
  });
});

describe("source predicates", () => {
  it("hasEnergySource matches grid/solar/battery sources only", () => {
    expect(hasEnergySource(makePrefs({ energy_sources: [SOLAR] }))).toBe(true);
    expect(hasEnergySource(makePrefs({ energy_sources: [GRID_RETURN] }))).toBe(
      true
    );
    expect(hasEnergySource(makePrefs({ energy_sources: [GAS, WATER] }))).toBe(
      false
    );
  });

  it("hasWaterRateSource / hasGasRateSource require a rate statistic", () => {
    expect(hasWaterRateSource(makePrefs({ energy_sources: [WATER] }))).toBe(
      false
    );
    expect(
      hasWaterRateSource(makePrefs({ energy_sources: [WATER_RATE] }))
    ).toBe(true);
    expect(hasGasRateSource(makePrefs({ energy_sources: [GAS] }))).toBe(false);
    expect(hasGasRateSource(makePrefs({ energy_sources: [GAS_RATE] }))).toBe(
      true
    );
  });
});

describe("isEnergyCardVisible", () => {
  const solarPrefs = makePrefs({ energy_sources: [SOLAR] });

  it("is true when the card applies and is not hidden", () => {
    expect(
      isEnergyCardVisible(
        "electricity",
        "energy-solar-graph",
        solarPrefs,
        undefined
      )
    ).toBe(true);
  });

  it("is false when the card applies but is hidden", () => {
    expect(
      isEnergyCardVisible("electricity", "energy-solar-graph", solarPrefs, [
        "electricity.energy-solar-graph",
      ])
    ).toBe(false);
  });

  it("is false when the card does not apply to the preferences", () => {
    // No solar source -> the solar graph never applies, hidden or not.
    expect(
      isEnergyCardVisible(
        "electricity",
        "energy-solar-graph",
        makePrefs({ energy_sources: [GRID_RETURN] }),
        undefined
      )
    ).toBe(false);
  });

  it("is false for a card type that is not in the catalog for the view", () => {
    expect(
      isEnergyCardVisible("gas", "energy-solar-graph", solarPrefs, undefined)
    ).toBe(false);
  });

  it("equals isApplicable && !hidden for every catalog entry", () => {
    // A config that exercises every source type, so many cards apply.
    const richPrefs = makePrefs({
      energy_sources: [GRID_RETURN, SOLAR, GAS, WATER],
    });
    for (const card of getEnergyCardCatalog()) {
      const cardType = card.key.slice(card.view.length + 1);
      expect(
        isEnergyCardVisible(card.view, cardType, richPrefs, undefined)
      ).toBe(card.isApplicable(richPrefs));
      // Hiding the card's own key always wins.
      expect(
        isEnergyCardVisible(card.view, cardType, richPrefs, [card.key])
      ).toBe(false);
    }
  });
});

// --- External (HACS) card registry -----------------------------------------

const externalEntry = () => {
  const catalog = getEnergyCardCatalog();
  return catalog[catalog.length - 1];
};

describe("getEnergyCardCatalog — external card entries", () => {
  beforeEach(() => {
    energyCardRegistrations.splice(0);
  });
  afterEach(() => {
    energyCardRegistrations.splice(0);
  });

  it("contains only built-in entries when nothing is registered", () => {
    const catalog = getEnergyCardCatalog();
    expect(catalog.length).toBeGreaterThan(0);
    expect(catalog.every((e) => !e.key.includes("custom:"))).toBe(true);
  });

  it("appends external entries with the correct key format", () => {
    energyCardRegistrations.push({ type: "my-gas-card", view: "gas" });
    const entry = externalEntry();
    expect(entry.key).toBe("gas.custom:my-gas-card");
    expect(entry.view).toBe("gas");
  });

  it("uses the label from the registration when provided", () => {
    energyCardRegistrations.push({
      type: "my-card",
      view: "electricity",
      label: "My Pretty Card",
    });
    expect(externalEntry().getLabel(() => "")).toBe("My Pretty Card");
  });

  it("falls back to the type string as label when no label is provided", () => {
    energyCardRegistrations.push({
      type: "unlabelled-card",
      view: "electricity",
    });
    expect(externalEntry().getLabel(() => "")).toBe("unlabelled-card");
  });

  it("applies the default view predicate when no isApplicable is provided", () => {
    energyCardRegistrations.push({ type: "gas-card", view: "gas" });
    const entry = externalEntry();
    // Default for "gas" is hasGasSource.
    expect(entry.isApplicable(makePrefs({ energy_sources: [GAS] }))).toBe(true);
    expect(entry.isApplicable(makePrefs({ energy_sources: [SOLAR] }))).toBe(
      false
    );
  });

  it("uses a custom isApplicable when provided", () => {
    energyCardRegistrations.push({
      type: "always-on",
      view: "electricity",
      isApplicable: () => true,
    });
    expect(externalEntry().isApplicable(makePrefs())).toBe(true);
  });

  it("ignores registrations with unrecognised view names", () => {
    const before = getEnergyCardCatalog().length;
    energyCardRegistrations.push({ type: "bad-card", view: "unknown-view" });
    expect(getEnergyCardCatalog().length).toBe(before);
  });

  it("appends multiple registrations in order", () => {
    energyCardRegistrations.push(
      { type: "card-a", view: "electricity" },
      { type: "card-b", view: "gas" }
    );
    const catalog = getEnergyCardCatalog();
    const external = catalog.filter((e) => e.key.includes("custom:"));
    expect(external).toHaveLength(2);
    expect(external[0].key).toBe("electricity.custom:card-a");
    expect(external[1].key).toBe("gas.custom:card-b");
  });
});

describe("visibleEnergyCards — external card configs", () => {
  const gasPrefs = makePrefs({ energy_sources: [GAS] });

  beforeEach(() => {
    energyCardRegistrations.splice(0);
  });
  afterEach(() => {
    energyCardRegistrations.splice(0);
  });

  it("returns an empty array when there are no registrations", () => {
    expect(externalConfigs("gas", gasPrefs, undefined, "energy_1")).toEqual([]);
  });

  it("returns a card config for an applicable, visible registration", () => {
    energyCardRegistrations.push({ type: "my-gas-card", view: "gas" });
    const configs = externalConfigs("gas", gasPrefs, undefined, "energy_1");
    expect(configs).toHaveLength(1);
    expect(configs[0]).toEqual({
      type: "custom:my-gas-card",
      collection_key: "energy_1",
      grid_options: { columns: 36 },
    });
  });

  it("excludes cards registered for a different view", () => {
    energyCardRegistrations.push({
      type: "electricity-card",
      view: "electricity",
    });
    expect(
      externalConfigs("gas", gasPrefs, undefined, "energy_1")
    ).toHaveLength(0);
  });

  it("excludes cards whose isApplicable predicate returns false", () => {
    energyCardRegistrations.push({
      type: "never-shown",
      view: "gas",
      isApplicable: () => false,
    });
    expect(
      externalConfigs("gas", gasPrefs, undefined, "energy_1")
    ).toHaveLength(0);
  });

  it("excludes cards whose key is in the hidden list", () => {
    energyCardRegistrations.push({ type: "hidden-card", view: "gas" });
    expect(
      externalConfigs("gas", gasPrefs, ["gas.custom:hidden-card"], "energy_1")
    ).toHaveLength(0);
  });

  it("propagates the collection_key into every config", () => {
    energyCardRegistrations.push({ type: "card", view: "gas" });
    const [config] = externalConfigs(
      "gas",
      gasPrefs,
      undefined,
      "my_collection"
    );
    expect(config.collection_key).toBe("my_collection");
  });
});

describe("external card applicability", () => {
  const gasPrefs = makePrefs({ energy_sources: [GAS] });

  const applicableKeys = (view: Parameters<typeof isEnergyCardVisible>[0]) =>
    getEnergyCardCatalog()
      .filter((c) => c.view === view && c.isApplicable(gasPrefs))
      .map((c) => c.key);

  beforeEach(() => {
    energyCardRegistrations.splice(0);
  });
  afterEach(() => {
    energyCardRegistrations.splice(0);
  });

  it("includes an external card key when it is applicable", () => {
    energyCardRegistrations.push({ type: "my-gas-card", view: "gas" });
    expect(applicableKeys("gas")).toContain("gas.custom:my-gas-card");
  });

  it("excludes an external card key when it is not applicable", () => {
    energyCardRegistrations.push({
      type: "never",
      view: "gas",
      isApplicable: () => false,
    });
    expect(applicableKeys("gas")).not.toContain("gas.custom:never");
  });
});

describe("isEnergyViewEmpty with external cards", () => {
  const gasPrefs = makePrefs({ energy_sources: [GAS] });

  beforeEach(() => {
    energyCardRegistrations.splice(0);
  });
  afterEach(() => {
    energyCardRegistrations.splice(0);
  });

  it("is false when an applicable external card is not hidden", () => {
    energyCardRegistrations.push({ type: "my-card", view: "gas" });
    // Built-in gas cards are visible, so the view is not empty.
    expect(isEnergyViewEmpty("gas", gasPrefs, [])).toBe(false);
  });

  it("is true when all cards including external are hidden", () => {
    energyCardRegistrations.push({ type: "extra", view: "gas" });
    const allKeys = getEnergyCardCatalog()
      .filter((c) => c.view === "gas" && c.isApplicable(gasPrefs))
      .map((c) => c.key);
    expect(isEnergyViewEmpty("gas", gasPrefs, allKeys)).toBe(true);
  });
});

describe("window.registerEnergyCard", () => {
  type RegisterFn = (
    type: string,
    view: string,
    options?: { label?: string; isApplicable?: () => boolean }
  ) => void;

  beforeEach(() => {
    energyCardRegistrations.splice(0);
  });
  afterEach(() => {
    energyCardRegistrations.splice(0);
  });

  it("pushes a registration into energyCardRegistrations", () => {
    (
      window as unknown as { registerEnergyCard: RegisterFn }
    ).registerEnergyCard("my-card", "electricity");
    expect(energyCardRegistrations).toHaveLength(1);
    expect(energyCardRegistrations[0]).toMatchObject({
      type: "my-card",
      view: "electricity",
    });
  });

  it("stores an optional label from options", () => {
    (
      window as unknown as { registerEnergyCard: RegisterFn }
    ).registerEnergyCard("my-card", "electricity", { label: "My Card" });
    expect(energyCardRegistrations[0].label).toBe("My Card");
  });

  it("stores an optional isApplicable predicate from options", () => {
    const pred = () => false;
    (
      window as unknown as { registerEnergyCard: RegisterFn }
    ).registerEnergyCard("my-card", "gas", { isApplicable: pred });
    expect(energyCardRegistrations[0].isApplicable).toBe(pred);
  });
});
