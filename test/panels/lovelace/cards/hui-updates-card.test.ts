import { afterEach, describe, expect, it, vi } from "vitest";
import "../../../../src/panels/lovelace/cards/hui-updates-card";
import type { HuiUpdatesCard } from "../../../../src/panels/lovelace/cards/hui-updates-card";
import type { UpdatesCardConfig } from "../../../../src/panels/lovelace/cards/types";
import type { HomeAssistant } from "../../../../src/types";

const { filterUpdateEntities } = vi.hoisted(() => ({
  filterUpdateEntities: vi.fn(() => []),
}));

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

vi.mock("../../../../src/data/update", () => ({
  filterUpdateEntities,
  updateCanInstall: vi.fn(() => true),
}));

const createHass = (): HomeAssistant =>
  ({
    states: {},
    locale: {
      language: "en",
    },
    user: {
      is_admin: true,
    },
    localize: vi.fn((key: string) => key),
  }) as unknown as HomeAssistant;

let elements: HuiUpdatesCard[] = [];

const mount = async (): Promise<HuiUpdatesCard> => {
  const el = document.createElement("hui-updates-card") as HuiUpdatesCard;
  el.hass = createHass();
  el.setConfig({
    type: "updates",
    hide_empty: false,
  } as UpdatesCardConfig);

  document.body.appendChild(el);
  elements.push(el);
  await el.updateComplete;

  return el;
};

afterEach(() => {
  elements.forEach((el) => el.remove());
  elements = [];
  vi.restoreAllMocks();
});

describe("hui-updates-card", () => {
  // willUpdate() and render() previously each called _getUpdateEntities()
  // independently; this pins the count to one call per update cycle so a
  // future edit can't silently reintroduce the duplicate.
  it("computes update entities once per update cycle", async () => {
    const element = await mount();

    filterUpdateEntities.mockClear();

    element.hass = {
      ...element.hass!,
      states: { ...element.hass!.states },
    };

    await element.updateComplete;

    expect(filterUpdateEntities).toHaveBeenCalledTimes(1);
  });
});
