import { assert, describe, it } from "vitest";

import { generateVoiceAssistantFilter } from "../../../src/common/entity/entity_voice_assistant_filter";

describe("EntityFilter", () => {
  // case 1
  it("passes all when no filters passed in", () => {
    const filter = generateVoiceAssistantFilter();

    assert(filter("sensor.test"));
    assert(filter("sun.sun"));
    assert(filter("light.test"));
  });

  // case 2
  it("allows entities by entity id", () => {
    const filter = generateVoiceAssistantFilter(undefined, ["light.kitchen"]);

    assert(filter("light.kitchen"));
    assert(!filter("light.living_room"));
  });

  it("allows entities by domain", () => {
    const filter = generateVoiceAssistantFilter(["switch"]);

    assert(filter("switch.bla"));
    assert(!filter("light.kitchen"));
  });

  // case 3
  it("excluding entities by entity id", () => {
    const filter = generateVoiceAssistantFilter(
      undefined,
      undefined,
      undefined,
      ["light.kitchen"]
    );

    assert(!filter("light.kitchen"));
    assert(filter("light.living_room"));
  });

  it("excluding entities by domain", () => {
    const filter = generateVoiceAssistantFilter(undefined, undefined, [
      "switch",
    ]);

    assert(!filter("switch.bla"));
    assert(filter("light.kitchen"));
  });

  // case 4a
  it("allows domain and excluding entity", () => {
    const filter = generateVoiceAssistantFilter(
      ["switch"],
      undefined,
      undefined,
      ["switch.kitchen"]
    );

    assert(filter("switch.living_room"));
    assert(!filter("switch.kitchen"));
    assert(!filter("sensor.bla"));
  });

  it("allows entity while other domains", () => {
    const filter = generateVoiceAssistantFilter(["switch"], ["light.kitchen"]);

    assert(filter("switch.living_room"));
    assert(filter("light.kitchen"));
    assert(!filter("sensor.bla"));
  });

  // case 4b
  it("excluding domain and entity", () => {
    const filter = generateVoiceAssistantFilter(
      undefined,
      ["switch.kitchen"],
      ["switch"]
    );

    assert(filter("switch.kitchen"));
    assert(!filter("switch.living_room"));
    assert(filter("sensor.bla"));
  });

  it("excluding domain and excluding entities", () => {
    const filter = generateVoiceAssistantFilter(
      undefined,
      undefined,
      ["switch"],
      ["light.kitchen"]
    );

    assert(!filter("switch.living_room"));
    assert(!filter("light.kitchen"));
    assert(filter("sensor.bla"));
  });

  // case 4c
  it("allows entities", () => {
    const filter = generateVoiceAssistantFilter(undefined, ["light.kitchen"]);

    assert(filter("light.kitchen"));
    assert(!filter("switch.living_room"));
    assert(!filter("light.living_room"));
    assert(!filter("sensor.bla"));
  });
});
