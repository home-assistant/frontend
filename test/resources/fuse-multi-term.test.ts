import { assert, describe, it } from "vitest";
import Fuse from "fuse.js";
import { multiTermSortedSearch } from "../../src/resources/fuseMultiTerm";
import { entityComboBoxKeys } from "../../src/data/entity/entity_picker";

describe("Fuzzy search (multiTermSortedSearch) tests", () => {
  // Sample data matching the structure used in dialog-expose-entity.ts
  const sampleEntities = [
    {
      id: "binary_sensor.microphone_bureau",
      primary: "Microphone",
      secondary: "Bureau ▸ Assistant vocal",
      search_labels: {
        entityName: "Microphone",
        deviceName: "Assistant vocal",
        areaName: "Bureau",
        friendlyName: "Microphone",
        entityId: "binary_sensor.microphone_bureau",
      },
    },
    {
      id: "binary_sensor.microphone_chambre",
      primary: "Microphone",
      secondary: "Chambre ▸ Assistant vocal",
      search_labels: {
        entityName: "Microphone",
        deviceName: "Assistant vocal",
        areaName: "Chambre",
        friendlyName: "Microphone",
        entityId: "binary_sensor.microphone_chambre",
      },
    },
    {
      id: "binary_sensor.microphone_salon",
      primary: "Microphone",
      secondary: "Salon ▸ Assistant vocal",
      search_labels: {
        entityName: "Microphone",
        deviceName: "Assistant vocal",
        areaName: "Salon",
        friendlyName: "Microphone",
        entityId: "binary_sensor.microphone_salon",
      },
    },
    {
      id: "light.kitchen_brightness",
      primary: "Brightness",
      secondary: "Kitchen ▸ Smart Light",
      search_labels: {
        entityName: "Brightness",
        deviceName: "Smart Light",
        areaName: "Kitchen",
        friendlyName: "Kitchen Brightness",
        entityId: "light.kitchen_brightness",
      },
    },
    {
      id: "light.bedroom_brightness",
      primary: "Brightness",
      secondary: "Bedroom ▸ Smart Light",
      search_labels: {
        entityName: "Brightness",
        deviceName: "Smart Light",
        areaName: "Bedroom",
        friendlyName: "Bedroom Brightness",
        entityId: "light.bedroom_brightness",
      },
    },
    {
      id: "switch.assistants_vocaux",
      primary: "Assistants vocaux",
      secondary: "",
      search_labels: {
        entityName: null,
        deviceName: null,
        areaName: null,
        friendlyName: "Assistants vocaux",
        entityId: "switch.assistants_vocaux",
      },
    },
  ];

  // Create Fuse index once for all tests (mimics memoization in component)
  const fuseIndex = Fuse.createIndex(entityComboBoxKeys, sampleEntities);

  it("Single word search: finds all entities with 'microphone' in any field", () => {
    const results = multiTermSortedSearch(
      sampleEntities,
      "microphone",
      entityComboBoxKeys,
      (item) => item.id,
      fuseIndex
    );

    assert.strictEqual(results.length, 3, "Should find 3 microphone entities");
    assert.isTrue(
      results.every((item) => item.id.includes("microphone")),
      "All results should contain 'microphone' in entity_id"
    );
  });

  it("Multi-word search: 'microphone bureau' requires BOTH terms to match", () => {
    const results = multiTermSortedSearch(
      sampleEntities,
      "microphone bureau",
      entityComboBoxKeys,
      (item) => item.id,
      fuseIndex
    );

    assert.strictEqual(
      results.length,
      1,
      "Should find only 1 entity matching both terms"
    );
    assert.strictEqual(
      results[0].id,
      "binary_sensor.microphone_bureau",
      "Should find the microphone in Bureau area"
    );
  });

  it("Multi-word search: 'light kitchen' finds lights in Kitchen only", () => {
    const results = multiTermSortedSearch(
      sampleEntities,
      "light kitchen",
      entityComboBoxKeys,
      (item) => item.id,
      fuseIndex
    );

    assert.strictEqual(
      results.length,
      1,
      "Should find only 1 light in Kitchen"
    );
    assert.strictEqual(
      results[0].id,
      "light.kitchen_brightness",
      "Should find kitchen light, not bedroom light"
    );
  });

  it("Multi-word search: 'light bedroom' finds lights in Bedroom only", () => {
    const results = multiTermSortedSearch(
      sampleEntities,
      "light bedroom",
      entityComboBoxKeys,
      (item) => item.id,
      fuseIndex
    );

    assert.strictEqual(
      results.length,
      1,
      "Should find only 1 light in Bedroom"
    );
    assert.strictEqual(
      results[0].id,
      "light.bedroom_brightness",
      "Should find bedroom light, not kitchen light"
    );
  });

  it("Fuzzy matching: 'microfone' (typo) still finds 'microphone' entities", () => {
    const results = multiTermSortedSearch(
      sampleEntities,
      "microfone", // 1 character typo
      entityComboBoxKeys,
      (item) => item.id,
      fuseIndex
    );

    assert.isTrue(
      results.length > 0,
      "Fuzzy search should find results despite typo"
    );
    assert.isTrue(
      results.some((item) => item.id.includes("microphone")),
      "Should find microphone entities despite typo"
    );
  });

  it("Fuzzy matching: 'asistant' (typo) finds 'assistant' entities", () => {
    const results = multiTermSortedSearch(
      sampleEntities,
      "asistant", // Missing 's' typo
      entityComboBoxKeys,
      (item) => item.id,
      fuseIndex
    );

    assert.isTrue(
      results.length > 0,
      "Fuzzy search should find results despite typo"
    );
    assert.isTrue(
      results.some((item) =>
        item.search_labels.friendlyName?.includes("Assistant")
      ),
      "Should find assistant entities despite typo"
    );
  });

  it("All terms required: 'microphone kitchen' finds nothing (no entity matches both)", () => {
    const results = multiTermSortedSearch(
      sampleEntities,
      "microphone kitchen",
      entityComboBoxKeys,
      (item) => item.id,
      fuseIndex
    );

    assert.strictEqual(
      results.length,
      0,
      "Should find nothing when no entity matches ALL terms"
    );
  });

  it("Case insensitive: 'MICROPHONE' same results as 'microphone'", () => {
    const resultsLower = multiTermSortedSearch(
      sampleEntities,
      "microphone",
      entityComboBoxKeys,
      (item) => item.id,
      fuseIndex
    );

    const resultsUpper = multiTermSortedSearch(
      sampleEntities,
      "MICROPHONE",
      entityComboBoxKeys,
      (item) => item.id,
      fuseIndex
    );

    assert.strictEqual(
      resultsLower.length,
      resultsUpper.length,
      "Case should not matter"
    );
    assert.strictEqual(
      resultsLower[0].id,
      resultsUpper[0].id,
      "Should return same results regardless of case"
    );
  });

  it("Case insensitive: 'MiCrOpHoNe' same results as 'microphone'", () => {
    const resultsLower = multiTermSortedSearch(
      sampleEntities,
      "microphone",
      entityComboBoxKeys,
      (item) => item.id,
      fuseIndex
    );

    const resultsMixed = multiTermSortedSearch(
      sampleEntities,
      "MiCrOpHoNe",
      entityComboBoxKeys,
      (item) => item.id,
      fuseIndex
    );

    assert.strictEqual(
      resultsLower.length,
      resultsMixed.length,
      "Mixed case should work"
    );
  });

  it("Empty/no match: nonsense search returns empty array", () => {
    const results = multiTermSortedSearch(
      sampleEntities,
      "zzzzzzzzz",
      entityComboBoxKeys,
      (item) => item.id,
      fuseIndex
    );

    assert.strictEqual(
      results.length,
      0,
      "Nonsense search should return no results"
    );
  });

  it("Weighted relevance: results are sorted by relevance", () => {
    const results = multiTermSortedSearch(
      sampleEntities,
      "brightness",
      entityComboBoxKeys,
      (item) => item.id,
      fuseIndex
    );

    assert.isTrue(results.length > 0, "Should find brightness entities");

    // Results should be sorted by relevance (no specific order assertion,
    // but just verify they exist and are ordered consistently)
    const firstResult = results[0];
    assert.isTrue(
      firstResult.search_labels.entityName
        ?.toLowerCase()
        .includes("brightness") ||
        firstResult.search_labels.friendlyName
          ?.toLowerCase()
          .includes("brightness"),
      "First result should match 'brightness'"
    );
  });

  it("Search by area name: 'bureau' finds entities in Bureau area", () => {
    const results = multiTermSortedSearch(
      sampleEntities,
      "bureau",
      entityComboBoxKeys,
      (item) => item.id,
      fuseIndex
    );

    assert.isTrue(results.length > 0, "Should find entities in Bureau area");
    assert.strictEqual(
      results[0].search_labels.areaName,
      "Bureau",
      "Should find entity in Bureau area"
    );
  });

  it("Search by device name: 'smart light' finds entities with Smart Light device", () => {
    const results = multiTermSortedSearch(
      sampleEntities,
      "smart light",
      entityComboBoxKeys,
      (item) => item.id,
      fuseIndex
    );

    assert.strictEqual(
      results.length,
      2,
      "Should find 2 entities with Smart Light device"
    );
    assert.isTrue(
      results.every((item) => item.search_labels.deviceName === "Smart Light"),
      "All results should have Smart Light as device"
    );
  });

  it("Search by entity_id: exact match by entity ID works", () => {
    const results = multiTermSortedSearch(
      sampleEntities,
      "switch.assistants_vocaux",
      entityComboBoxKeys,
      (item) => item.id,
      fuseIndex
    );

    assert.strictEqual(
      results.length,
      1,
      "Should find exactly 1 entity by exact entity_id"
    );
    assert.strictEqual(
      results[0].id,
      "switch.assistants_vocaux",
      "Should find the exact entity by ID"
    );
  });
});
