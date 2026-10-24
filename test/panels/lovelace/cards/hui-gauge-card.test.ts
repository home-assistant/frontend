import { afterEach, describe, expect, it, vi } from "vitest";
import "../../../../src/panels/lovelace/cards/hui-gauge-card";
import type { LitElement } from "lit";
import type { GaugeCardConfig } from "../../../../src/panels/lovelace/cards/types";
import type { LovelaceCard } from "../../../../src/panels/lovelace/types";
import type { HomeAssistant } from "../../../../src/types";

// In a sections view with a set number of rows the gauge card gets a fixed
// height, and the gauge then has to fit that height too (issue 55141). The
// card marks that case with a "fixed-height" class that the styles use.

// Bundler-defined globals the card's import graph reads at eval time.
vi.hoisted(() => {
  Object.assign(globalThis, {
    __STATIC_PATH__: "/",
    __HASS_URL__: "",
    __BUILD__: "modern",
    __VERSION__: "test",
    __BACKWARDS_COMPAT__: false,
    __SUPERVISOR__: false,
    __NAMESPACE__: "frontend",
  });
});

class MockResizeObserver {
  observe = vi.fn();

  unobserve = vi.fn();

  disconnect = vi.fn();
}

vi.stubGlobal("ResizeObserver", MockResizeObserver);

const ENTITY_ID = "sensor.ping";

const createHass = (): HomeAssistant =>
  ({
    states: {
      [ENTITY_ID]: {
        entity_id: ENTITY_ID,
        state: "23",
        attributes: { unit_of_measurement: "ms" },
        context: { id: "", parent_id: null, user_id: null },
        last_changed: "",
        last_updated: "",
      },
    },
    entities: {},
    devices: {},
    areas: {},
    floors: {},
    locale: { language: "en" },
    themes: { default_theme: "default", themes: {} },
    localize: vi.fn((key: string) => key),
    formatEntityStateToParts: vi.fn(() => [
      { type: "value", value: "23" },
      { type: "literal", value: " " },
      { type: "unit", value: "ms" },
    ]),
    formatEntityName: vi.fn(() => "Ping"),
  }) as unknown as HomeAssistant;

type GaugeCard = LovelaceCard & LitElement & { layout?: string };

let cards: GaugeCard[] = [];

const mount = async (
  gridOptions: GaugeCardConfig["grid_options"],
  layout?: string
): Promise<GaugeCard> => {
  const card = document.createElement("hui-gauge-card") as GaugeCard;
  card.setConfig({
    type: "gauge",
    entity: ENTITY_ID,
    grid_options: gridOptions,
  } as GaugeCardConfig);
  card.layout = layout;
  card.hass = createHass();
  document.body.appendChild(card);
  cards.push(card);
  await card.updateComplete;
  return card;
};

const haCard = (card: GaugeCard) =>
  card.shadowRoot!.querySelector("ha-card") as HTMLElement;

afterEach(() => {
  cards.forEach((card) => card.remove());
  cards = [];
});

describe("hui-gauge-card fixed height", () => {
  it("fits the gauge to the height when the rows are set in a grid", async () => {
    const card = await mount({ columns: 6, rows: 2 }, "grid");

    expect(haCard(card).classList.contains("fixed-height")).toBe(true);
    expect(card.shadowRoot!.querySelector("ha-gauge")).not.toBeNull();
  });

  it("keeps the old sizing when the rows are auto", async () => {
    const card = await mount({ columns: 6, rows: "auto" }, "grid");

    expect(haCard(card).classList.contains("fixed-height")).toBe(false);
  });

  it("keeps the old sizing when no rows are set", async () => {
    const card = await mount({ columns: 6 }, "grid");

    expect(haCard(card).classList.contains("fixed-height")).toBe(false);
  });

  it("keeps the old sizing outside a sections grid", async () => {
    const card = await mount({ columns: 6, rows: 2 });

    expect(haCard(card).classList.contains("fixed-height")).toBe(false);
  });

  it("updates when the layout changes after the first render", async () => {
    const card = await mount({ columns: 6, rows: 2 });
    expect(haCard(card).classList.contains("fixed-height")).toBe(false);

    card.layout = "grid";
    await card.updateComplete;

    expect(haCard(card).classList.contains("fixed-height")).toBe(true);
  });
});
