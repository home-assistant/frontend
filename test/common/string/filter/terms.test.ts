import { expect } from "chai";
import { termsSearchFunction } from "../../../../src/common/string/filter/terms";

describe("termsSearch", () => {
  const testEntities = [
    {
      id: "binary_sensor.garage_door_opened",
      name: "Garage Door Opened (Sensor, Binary)",
    },
    {
      id: "sensor.garage_door_status",
      name: "Garage Door Opened (Sensor)",
    },
    {
      id: "sensor.temperature_living_room",
      name: "[Living room] temperature",
    },
    {
      id: "sensor.temperature_parents_bedroom",
      name: "[Parents bedroom] temperature",
    },
    {
      id: "sensor.temperature_children_bedroom",
      name: "[Children bedroom] temperature",
    },
  ];

  function testEntitySearch(
    searchInput: string | null,
    expectedResults: string[]
  ) {
    const searchFunction = termsSearchFunction(searchInput);
    const matchingEntities = testEntities.filter(
      (entity) => searchFunction(entity.id) || searchFunction(entity.name)
    );
    expect(matchingEntities.map((it) => it.id)).to.have.members(
      expectedResults
    );
  }

  it(`test empty or null query`, () => {
    testEntitySearch(
      "",
      testEntities.map((it) => it.id)
    );
    testEntitySearch(
      null,
      testEntities.map((it) => it.id)
    );
  });

  it(`test single word search`, () => {
    testEntitySearch("bedroom", [
      "sensor.temperature_parents_bedroom",
      "sensor.temperature_children_bedroom",
    ]);
  });

  it(`test multi word search`, () => {
    testEntitySearch("bedroom children", [
      "sensor.temperature_children_bedroom",
    ]);
  });

  it(`test partial word search`, () => {
    testEntitySearch("room", [
      "sensor.temperature_living_room",
      "sensor.temperature_parents_bedroom",
      "sensor.temperature_children_bedroom",
    ]);
  });

  it(`test mixed cased word search`, () => {
    testEntitySearch("garage binary", ["binary_sensor.garage_door_opened"]);
  });

  it(`test special chars in query`, () => {
    testEntitySearch("sensor.temperature", [
      "sensor.temperature_parents_bedroom",
      "sensor.temperature_living_room",
      "sensor.temperature_children_bedroom",
    ]);

    testEntitySearch("sensor.temperature parents", [
      "sensor.temperature_parents_bedroom",
    ]);
    testEntitySearch("parents_Bedroom", ["sensor.temperature_parents_bedroom"]);
  });

  it(`test search in name`, () => {
    testEntitySearch("Binary)", ["binary_sensor.garage_door_opened"]);

    testEntitySearch("Binary)NotExists", []);
  });

  it(`test regex special chars`, () => {
    // Should return an empty result, but no error
    testEntitySearch("\\{}()*+?.,[])", []);

    testEntitySearch("[Children bedroom]", [
      "sensor.temperature_children_bedroom",
    ]);
  });
});
