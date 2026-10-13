import { ContextProvider } from "@lit/context";
import type { HassEntities } from "home-assistant-js-websocket";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  configContext,
  internationalizationContext,
  statesContext,
} from "../../../../src/data/context";
import "../../../../src/panels/lovelace/cards/hui-updates-card";
import type { HuiUpdatesCard } from "../../../../src/panels/lovelace/cards/hui-updates-card";
import type { UpdatesCardConfig } from "../../../../src/panels/lovelace/cards/types";
import type {
  HomeAssistantConfig,
  HomeAssistantInternationalization,
} from "../../../../src/types";

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

interface Mounted {
  element: HuiUpdatesCard;
  states: ContextProvider<typeof statesContext>;
}

let hosts: HTMLElement[] = [];

const mount = async (): Promise<Mounted> => {
  const host = document.createElement("div");
  new ContextProvider(host, {
    context: internationalizationContext,
    initialValue: {
      locale: { language: "en" },
      localize: vi.fn((key: string) => key),
    } as unknown as HomeAssistantInternationalization,
  });
  new ContextProvider(host, {
    context: configContext,
    initialValue: { user: { is_admin: true } } as HomeAssistantConfig,
  });
  const states = new ContextProvider(host, {
    context: statesContext,
    initialValue: {} as HassEntities,
  });

  const element = document.createElement("hui-updates-card") as HuiUpdatesCard;
  element.setConfig({
    type: "updates",
    hide_empty: false,
  } as UpdatesCardConfig);
  host.appendChild(element);
  document.body.appendChild(host);
  hosts.push(host);
  await element.updateComplete;

  return { element, states };
};

afterEach(() => {
  hosts.forEach((host) => host.remove());
  hosts = [];
  vi.restoreAllMocks();
});

describe("hui-updates-card", () => {
  // willUpdate() and render() previously each called _getUpdateEntities()
  // independently; this pins the count to one call per states change so a
  // future edit can't silently reintroduce the duplicate.
  it("computes update entities once per states change", async () => {
    const { element, states } = await mount();

    filterUpdateEntities.mockClear();

    states.setValue({ ...states.value });

    await element.updateComplete;

    expect(filterUpdateEntities).toHaveBeenCalledTimes(1);
  });
});
