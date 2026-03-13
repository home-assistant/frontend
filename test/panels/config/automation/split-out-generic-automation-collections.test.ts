import { assert, describe, it } from "vitest";

import { splitOutGenericAutomationCollections } from "../../../../src/panels/config/automation/split-out-generic-automation-collections";

describe("splitOutGenericAutomationCollections", () => {
  it("splits device and entity into a Generic section for triggers", () => {
    const result = splitOutGenericAutomationCollections(
      "trigger",
      {
        collectionIndex: 0,
        groups: [
          { key: "climate" },
          { key: "device" },
          { key: "entity" },
          { key: "time_location" },
        ],
      },
      true
    );

    assert.deepEqual(result, [
      {
        collectionIndex: 0,
        groups: [{ key: "climate" }, { key: "time_location" }],
      },
      {
        collectionIndex: 0,
        titleKey: "ui.panel.config.automation.editor.generic",
        groups: [{ key: "device" }, { key: "entity" }],
      },
    ]);
  });

  it("does not split collections when the feature is disabled", () => {
    const collection = {
      collectionIndex: 0,
      groups: [{ key: "device" }, { key: "entity" }],
    };

    assert.deepEqual(
      splitOutGenericAutomationCollections("condition", collection, false),
      [collection]
    );
  });

  it("does not split action collections", () => {
    const collection = {
      collectionIndex: 1,
      groups: [{ key: "device" }, { key: "entity" }],
    };

    assert.deepEqual(
      splitOutGenericAutomationCollections("action", collection, true),
      [collection]
    );
  });
});
