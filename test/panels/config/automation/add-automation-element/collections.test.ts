import { describe, expect, it } from "vitest";
import { DYNAMIC_PREFIX } from "../../../../../src/data/automation";
import {
  getCollections,
  getGroupItems,
} from "../../../../../src/panels/config/automation/add-automation-element/collections";
import type { ElementSources } from "../../../../../src/panels/config/automation/add-automation-element/types";

const description = { fields: {} } as any;

const sources: ElementSources = {
  type: "trigger",
  localize: ((key: string) => key) as any,
  language: "en",
  services: {},
  triggerDescriptions: {
    "light.turned_on": description,
    "event.received": description,
    "sun.sunrise": description,
    "calendar.event_started": description,
    "input_boolean.turned_on": description,
    "hacs.updated": description,
  },
  conditionDescriptions: {},
  manifests: {
    light: { integration_type: "entity" },
    event: { integration_type: "entity" },
    sun: { integration_type: "system" },
    calendar: { integration_type: "entity" },
    input_boolean: { integration_type: "helper" },
    hacs: { integration_type: "service", is_built_in: false },
  } as any,
};

const groupKeys = (collectionIndex: number) =>
  getCollections(
    sources,
    new Set(["light", "event", "calendar", "input_boolean"]),
    new Set()
  )
    .find((collection) => collection.collectionIndex === collectionIndex)
    ?.groups.map((group) => group.key);

describe("getCollections", () => {
  it("replaces the placeholders with the domain groups", () => {
    const keys = groupKeys(0)!;
    expect(keys).toContain(`${DYNAMIC_PREFIX}light`);
    expect(keys).toContain(`${DYNAMIC_PREFIX}input_boolean`);
    expect(keys).not.toContain("dynamicGroups");
    expect(keys).not.toContain("helpers");
    expect(groupKeys(2)).toEqual([`${DYNAMIC_PREFIX}hacs`]);
  });

  it("lists domains of a curated domain-only group only in that group", () => {
    const keys = groupKeys(0)!;
    expect(keys).toContain("sun");
    expect(keys).not.toContain(`${DYNAMIC_PREFIX}sun`);
    // calendar is bundled in time, but also keeps its own group
    expect(keys).toContain("time");
    expect(keys).toContain(`${DYNAMIC_PREFIX}calendar`);
  });

  it("lists the event domain only in the generic Event group", () => {
    expect(groupKeys(0)).not.toContain(`${DYNAMIC_PREFIX}event`);
    expect(groupKeys(0)).not.toContain("event");
    expect(groupKeys(1)).not.toContain(`${DYNAMIC_PREFIX}event`);
    expect(groupKeys(1)).toContain("event");
  });
});

describe("getGroupItems", () => {
  it("bundles the backend elements of a curated group's domains", () => {
    expect(
      getGroupItems(sources, "sun", 0, undefined).map((item) => item.key)
    ).toEqual([`${DYNAMIC_PREFIX}sun.sunrise`]);
    expect(
      getGroupItems(sources, "time", 0, undefined).map((item) => item.key)
    ).toContain(`${DYNAMIC_PREFIX}calendar.event_started`);
  });

  it("lists the manual event trigger next to the event domain triggers", () => {
    expect(
      getGroupItems(sources, "event", 1, undefined)
        .map((item) => item.key)
        .sort()
    ).toEqual([`${DYNAMIC_PREFIX}event.received`, "event"]);
  });

  it("adds system domain elements to the entity domain they cover", () => {
    expect(
      getGroupItems(
        sources,
        `${DYNAMIC_PREFIX}light`,
        0,
        new Map([["light", new Set(["sun"])]])
      ).map((item) => item.key)
    ).toEqual([
      `${DYNAMIC_PREFIX}light.turned_on`,
      `${DYNAMIC_PREFIX}sun.sunrise`,
    ]);
  });
});
