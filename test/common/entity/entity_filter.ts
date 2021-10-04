import { assert } from "chai";

import { generateFilter } from "../../../src/common/entity/entity_filter";

describe("EntityFilter", () => {
  // case 1
  it("passes all when no filters passed in", () => {
    const filter = generateFilter();

    assert(filter("sensor.test"));
    assert(filter("sun.sun"));
    assert(filter("light.test"));
  });

  // case 2
  it("allows entities by entity id", () => {
    const filter = generateFilter(undefined, ["light.kitchen"]);

    assert(filter("light.kitchen"));
    assert(!filter("light.living_room"));
  });

  it("allows entities by domain", () => {
    const filter = generateFilter(["switch"]);

    assert(filter("switch.bla"));
    assert(!filter("light.kitchen"));
  });

  // case 3
  it("excluding entities by entity id", () => {
    const filter = generateFilter(undefined, undefined, undefined, [
      "light.kitchen",
    ]);

    assert(!filter("light.kitchen"));
    assert(filter("light.living_room"));
  });

  it("excluding entities by domain", () => {
    const filter = generateFilter(undefined, undefined, ["switch"]);

    assert(!filter("switch.bla"));
    assert(filter("light.kitchen"));
  });

  // case 4a
  it("allows domain and excluding entity", () => {
    const filter = generateFilter(["switch"], undefined, undefined, [
      "switch.kitchen",
    ]);

    assert(filter("switch.living_room"));
    assert(!filter("switch.kitchen"));
    assert(!filter("sensor.bla"));
  });

  it("allows entity while other domains", () => {
    const filter = generateFilter(["switch"], ["light.kitchen"]);

    assert(filter("switch.living_room"));
    assert(filter("light.kitchen"));
    assert(!filter("sensor.bla"));
  });

  // case 4b
  it("excluding domain and entity", () => {
    const filter = generateFilter(undefined, ["switch.kitchen"], ["switch"]);

    assert(filter("switch.kitchen"));
    assert(!filter("switch.living_room"));
    assert(filter("sensor.bla"));
  });

  it("excluding domain and excluding entities", () => {
    const filter = generateFilter(
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
    const filter = generateFilter(undefined, ["light.kitchen"]);

    assert(filter("light.kitchen"));
    assert(!filter("switch.living_room"));
    assert(!filter("light.living_room"));
    assert(!filter("sensor.bla"));
  });
});
