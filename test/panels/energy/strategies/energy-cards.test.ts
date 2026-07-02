import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type {
  EnergyPreferences,
  EnergySource,
} from "../../../../src/data/energy";
import {
  customCards,
  energyCardRegistrations,
} from "../../../../src/data/lovelace_custom_cards";
import {
  applicableEnergyCardKeys,
  ENERGY_CARD_CATALOG,
  energyCardKey,
  getEnergyCardCatalog,
  getExternalEnergyCards,
  getVisibleExternalCardConfigs,
  hasEnergySource,
  hasGasRateSource,
  hasWaterRateSource,
  isEnergyCardHidden,
  isEnergyCardVisible,
  isEnergyViewEmpty,
  isExternalEnergyCard,
} from "../../../../src/panels/energy/strategies/energy-cards";

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

describe("energyCardKey", () => {
  it("joins the view path and card type", () => {
    expect(energyCardKey("electricity", "energy-solar-graph")).toBe(
      "electricity.energy-solar-graph"
    );
    expect(energyCardKey("now", "power-sankey")).toBe("now.power-sankey");
  });
});

describe("isEnergyCardHidden", () => {
  it("returns true only when the composite key is in the hidden list", () => {
    const hidden = ["electricity.energy-solar-graph"];
    expect(
      isEnergyCardHidden("electricity", "energy-solar-graph", hidden)
    ).toBe(true);
    // Same card type in a different view is independent.
    expect(isEnergyCardHidden("overview", "energy-solar-graph", hidden)).toBe(
      false
    );
    expect(
      isEnergyCardHidden("electricity", "energy-usage-graph", hidden)
    ).toBe(false);
  });

  it("treats undefined/empty hidden lists as nothing hidden", () => {
    expect(
      isEnergyCardHidden("electricity", "energy-solar-graph", undefined)
    ).toBe(false);
    expect(isEnergyCardHidden("electricity", "energy-solar-graph", [])).toBe(
      false
    );
  });
});

describe("catalog applicability", () => {
  it("only lists cards relevant to the configured sources", () => {
    const gasOnly = makePrefs({ energy_sources: [GAS] });
    expect(applicableEnergyCardKeys("gas", gasOnly)).toEqual([
      "gas.energy-gas-graph",
      "gas.energy-sources-table",
    ]);
    // No electricity sources -> no electricity cards apply.
    expect(applicableEnergyCardKeys("electricity", gasOnly)).toEqual([]);
  });

  it("gates the solar graph and gauges on their sources", () => {
    const solarGraph = ENERGY_CARD_CATALOG.find(
      (c) => c.key === "electricity.energy-solar-graph"
    )!;
    expect(
      solarGraph.isApplicable(makePrefs({ energy_sources: [SOLAR] }))
    ).toBe(true);
    expect(
      solarGraph.isApplicable(makePrefs({ energy_sources: [GRID_RETURN] }))
    ).toBe(false);

    const neutralityGauge = ENERGY_CARD_CATALOG.find(
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
    for (const card of ENERGY_CARD_CATALOG) {
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

describe("isExternalEnergyCard", () => {
  it("returns true for ExternalEnergyCardEntry objects", () => {
    expect(
      isExternalEnergyCard({
        key: "gas.custom:my-card",
        view: "gas",
        cardType: "my-card",
        label: "My Card",
        isApplicable: () => true,
      })
    ).toBe(true);
  });

  it("returns false for built-in EnergyCardCatalogEntry objects", () => {
    const builtIn = ENERGY_CARD_CATALOG[0];
    expect(isExternalEnergyCard(builtIn)).toBe(false);
  });
});

describe("getExternalEnergyCards", () => {
  beforeEach(() => {
    energyCardRegistrations.splice(0);
    customCards.splice(0);
  });
  afterEach(() => {
    energyCardRegistrations.splice(0);
    customCards.splice(0);
  });

  it("returns an empty array when nothing is registered", () => {
    expect(getExternalEnergyCards()).toEqual([]);
  });

  it("maps a registration to a typed entry with the correct key format", () => {
    energyCardRegistrations.push({ type: "my-gas-card", view: "gas" });
    const [entry] = getExternalEnergyCards();
    expect(entry.key).toBe("gas.custom:my-gas-card");
    expect(entry.view).toBe("gas");
    expect(entry.cardType).toBe("my-gas-card");
  });

  it("uses the customCards name as the label when available", () => {
    customCards.push({ type: "my-card", name: "My Pretty Card" });
    energyCardRegistrations.push({ type: "my-card", view: "electricity" });
    const [entry] = getExternalEnergyCards();
    expect(entry.label).toBe("My Pretty Card");
  });

  it("falls back to the type string as label when no customCards name", () => {
    energyCardRegistrations.push({
      type: "unlabelled-card",
      view: "electricity",
    });
    const [entry] = getExternalEnergyCards();
    expect(entry.label).toBe("unlabelled-card");
  });

  it("applies the default view predicate when no isApplicable is provided", () => {
    energyCardRegistrations.push({ type: "gas-card", view: "gas" });
    const [entry] = getExternalEnergyCards();
    // Default for "gas" is hasGasSource.
    expect(entry.isApplicable(makePrefs({ energy_sources: [GAS] }))).toBe(true);
    expect(entry.isApplicable(makePrefs({ energy_sources: [SOLAR] }))).toBe(
      false
    );
  });

  it("uses a custom isApplicable when provided", () => {
    const always = () => true;
    energyCardRegistrations.push({
      type: "always-on",
      view: "electricity",
      isApplicable: always,
    });
    const [entry] = getExternalEnergyCards();
    expect(entry.isApplicable(makePrefs())).toBe(true);
  });

  it("filters out registrations with unrecognised view names", () => {
    energyCardRegistrations.push({ type: "bad-card", view: "unknown-view" });
    expect(getExternalEnergyCards()).toHaveLength(0);
  });

  it("returns all valid registrations in order", () => {
    energyCardRegistrations.push(
      { type: "card-a", view: "electricity" },
      { type: "card-b", view: "gas" }
    );
    const entries = getExternalEnergyCards();
    expect(entries).toHaveLength(2);
    expect(entries[0].cardType).toBe("card-a");
    expect(entries[1].cardType).toBe("card-b");
  });
});

describe("getEnergyCardCatalog", () => {
  beforeEach(() => {
    energyCardRegistrations.splice(0);
  });
  afterEach(() => {
    energyCardRegistrations.splice(0);
  });

  it("returns the built-in catalog when there are no external cards", () => {
    const catalog = getEnergyCardCatalog();
    expect(catalog).toHaveLength(ENERGY_CARD_CATALOG.length);
    expect(catalog[0]).toBe(ENERGY_CARD_CATALOG[0]);
  });

  it("appends external entries after the built-in catalog", () => {
    energyCardRegistrations.push({ type: "extra", view: "gas" });
    const catalog = getEnergyCardCatalog();
    expect(catalog).toHaveLength(ENERGY_CARD_CATALOG.length + 1);
    const last = catalog[catalog.length - 1];
    expect(isExternalEnergyCard(last)).toBe(true);
    expect(
      (last as ReturnType<typeof getExternalEnergyCards>[0]).cardType
    ).toBe("extra");
  });
});

describe("getVisibleExternalCardConfigs", () => {
  const gasPrefs = makePrefs({ energy_sources: [GAS] });

  beforeEach(() => {
    energyCardRegistrations.splice(0);
  });
  afterEach(() => {
    energyCardRegistrations.splice(0);
  });

  it("returns an empty array when there are no registrations", () => {
    expect(
      getVisibleExternalCardConfigs("gas", gasPrefs, undefined, "energy_1")
    ).toEqual([]);
  });

  it("returns a card config for an applicable, visible registration", () => {
    energyCardRegistrations.push({ type: "my-gas-card", view: "gas" });
    const configs = getVisibleExternalCardConfigs(
      "gas",
      gasPrefs,
      undefined,
      "energy_1"
    );
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
      getVisibleExternalCardConfigs("gas", gasPrefs, undefined, "energy_1")
    ).toHaveLength(0);
  });

  it("excludes cards whose isApplicable predicate returns false", () => {
    energyCardRegistrations.push({
      type: "never-shown",
      view: "gas",
      isApplicable: () => false,
    });
    expect(
      getVisibleExternalCardConfigs("gas", gasPrefs, undefined, "energy_1")
    ).toHaveLength(0);
  });

  it("excludes cards whose key is in the hidden list", () => {
    energyCardRegistrations.push({ type: "hidden-card", view: "gas" });
    expect(
      getVisibleExternalCardConfigs(
        "gas",
        gasPrefs,
        ["gas.custom:hidden-card"],
        "energy_1"
      )
    ).toHaveLength(0);
  });

  it("propagates the collection_key into every config", () => {
    energyCardRegistrations.push({ type: "card", view: "gas" });
    const [config] = getVisibleExternalCardConfigs(
      "gas",
      gasPrefs,
      undefined,
      "my_collection"
    );
    expect(config.collection_key).toBe("my_collection");
  });
});

describe("applicableEnergyCardKeys with external cards", () => {
  const gasPrefs = makePrefs({ energy_sources: [GAS] });

  beforeEach(() => {
    energyCardRegistrations.splice(0);
  });
  afterEach(() => {
    energyCardRegistrations.splice(0);
  });

  it("includes an external card key when it is applicable", () => {
    energyCardRegistrations.push({ type: "my-gas-card", view: "gas" });
    expect(applicableEnergyCardKeys("gas", gasPrefs)).toContain(
      "gas.custom:my-gas-card"
    );
  });

  it("excludes an external card key when it is not applicable", () => {
    energyCardRegistrations.push({
      type: "never",
      view: "gas",
      isApplicable: () => false,
    });
    expect(applicableEnergyCardKeys("gas", gasPrefs)).not.toContain(
      "gas.custom:never"
    );
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
    const allKeys = applicableEnergyCardKeys("gas", gasPrefs);
    expect(isEnergyViewEmpty("gas", gasPrefs, allKeys)).toBe(true);
  });
});

describe("window.registerEnergyCard", () => {
  beforeEach(() => {
    energyCardRegistrations.splice(0);
  });
  afterEach(() => {
    energyCardRegistrations.splice(0);
  });

  it("pushes a registration into energyCardRegistrations", () => {
    (
      window as unknown as {
        registerEnergyCard: (type: string, view: string) => void;
      }
    ).registerEnergyCard("my-card", "electricity");
    expect(energyCardRegistrations).toHaveLength(1);
    expect(energyCardRegistrations[0]).toMatchObject({
      type: "my-card",
      view: "electricity",
    });
  });

  it("stores an optional isApplicable predicate", () => {
    const pred = () => false;
    (
      window as unknown as {
        registerEnergyCard: (
          type: string,
          view: string,
          pred: () => boolean
        ) => void;
      }
    ).registerEnergyCard("my-card", "gas", pred);
    expect(energyCardRegistrations[0].isApplicable).toBe(pred);
  });
});
