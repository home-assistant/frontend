import { ContextProvider } from "@lit/context";
import type { HassEntities } from "home-assistant-js-websocket";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  configContext,
  formattersContext,
  internationalizationContext,
  statesContext,
} from "../../../../src/data/context";
import "../../../../src/panels/lovelace/cards/hui-updates-card";
import type { HuiUpdatesCard } from "../../../../src/panels/lovelace/cards/hui-updates-card";
import type { UpdatesCardConfig } from "../../../../src/panels/lovelace/cards/types";
import type {
  HomeAssistantConfig,
  HomeAssistantFormatters,
  HomeAssistantInternationalization,
} from "../../../../src/types";

const { filterUpdateEntities } = vi.hoisted(() => ({
  filterUpdateEntities: vi.fn((): { entity_id: string }[] => []),
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
  formatters: ContextProvider<typeof formattersContext>;
}

const formatters = {
  formatEntityName: vi.fn((stateObj) => stateObj.entity_id),
} as unknown as HomeAssistantFormatters;

let hosts: HTMLElement[] = [];

const mount = async (
  config: Partial<UpdatesCardConfig> = {},
  withFormatters = true
): Promise<Mounted> => {
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
  const formattersProvider = new ContextProvider(host, {
    context: formattersContext,
    initialValue: (withFormatters
      ? formatters
      : undefined) as HomeAssistantFormatters,
  });
  const states = new ContextProvider(host, {
    context: statesContext,
    initialValue: {} as HassEntities,
  });

  const element = document.createElement("hui-updates-card") as HuiUpdatesCard;
  element.setConfig({
    type: "updates",
    hide_empty: false,
    ...config,
  } as UpdatesCardConfig);
  host.appendChild(element);
  document.body.appendChild(host);
  hosts.push(host);
  await element.updateComplete;

  return { element, states, formatters: formattersProvider };
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

  // Contexts arrive in any order. The count is recomputed after willUpdate,
  // so visibility evaluated there would keep the card hidden until the next
  // states change.
  it("shows the card when the formatters arrive after the states", async () => {
    filterUpdateEntities.mockReturnValue([{ entity_id: "update.a" }]);
    const { element, formatters: formattersProvider } = await mount(
      { hide_empty: true },
      false
    );

    expect(element.hidden).toBe(true);

    formattersProvider.setValue(formatters);
    await element.updateComplete;

    expect(element.hidden).toBe(false);
  });
});
