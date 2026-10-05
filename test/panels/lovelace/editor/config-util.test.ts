import { assert, describe, it } from "vitest";

import type { LovelaceConfig } from "../../../../src/data/lovelace/config/types";
import type { LovelaceSectionConfig } from "../../../../src/data/lovelace/config/section";
import type { LovelaceViewConfig } from "../../../../src/data/lovelace/config/view";
import {
  duplicateSection,
  moveCardToContainer,
  moveSection,
  swapView,
} from "../../../../src/panels/lovelace/editor/config-util";

describe("moveCardToContainer", () => {
  it("move a card to an empty view", () => {
    const config: LovelaceConfig = {
      views: [
        {},
        {
          cards: [{ type: "card1" }, { type: "card2" }],
        },
      ],
    };

    const result = moveCardToContainer(config, [1, 0], [0]);
    const expected: LovelaceConfig = {
      views: [
        {
          cards: [{ type: "card1" }],
        },
        {
          cards: [{ type: "card2" }],
        },
      ],
    };
    assert.deepEqual(expected, result);
  });

  it("move a card to different view", () => {
    const config: LovelaceConfig = {
      views: [
        {
          cards: [{ type: "v1-c1" }, { type: "v1-c2" }],
        },
        {
          cards: [{ type: "v2-c1" }, { type: "v2-c2" }],
        },
      ],
    };

    const result = moveCardToContainer(config, [1, 0], [0]);
    const expected: LovelaceConfig = {
      views: [
        {
          cards: [{ type: "v1-c1" }, { type: "v1-c2" }, { type: "v2-c1" }],
        },
        {
          cards: [{ type: "v2-c2" }],
        },
      ],
    };
    assert.deepEqual(expected, result);
  });

  it("move a card to the same view", () => {
    const config: LovelaceConfig = {
      views: [
        {
          cards: [{ type: "v1-c1" }, { type: "v1-c2" }],
        },
        {
          cards: [{ type: "v2-c1" }, { type: "v2-c2" }],
        },
      ],
    };

    const result = () => {
      moveCardToContainer(config, [1, 0], [1]);
    };
    assert.throws(
      result,
      Error,
      "You cannot move a card to the view or section it is in."
    );
  });
});

describe("swapView", () => {
  it("swaps 2 view", () => {
    const config: LovelaceConfig = {
      views: [
        {
          title: "view1",
          cards: [],
        },
        {
          title: "view2",
          cards: [],
        },
      ],
    };

    const result = swapView(config, 1, 0);
    const expected: LovelaceConfig = {
      views: [
        {
          title: "view2",
          cards: [],
        },
        {
          title: "view1",
          cards: [],
        },
      ],
    };
    assert.deepEqual(expected, result);
  });

  it("swaps the same views", () => {
    const config: LovelaceConfig = {
      views: [
        {
          title: "view1",
          cards: [],
        },
        {
          title: "view2",
          cards: [],
        },
      ],
    };

    const result = swapView(config, 0, 0);
    const expected: LovelaceConfig = {
      views: [
        {
          title: "view1",
          cards: [],
        },
        {
          title: "view2",
          cards: [],
        },
      ],
    };
    assert.deepEqual(expected, result);
  });
});

describe("moveSection", () => {
  it("moves a section to the top without changing the order of other sections", () => {
    const sections: LovelaceSectionConfig[] = [
      { type: "grid", cards: [{ type: "heading", heading: "First" }] },
      { type: "grid", cards: [{ type: "heading", heading: "Second" }] },
      { type: "grid", cards: [{ type: "heading", heading: "Third" }] },
      { type: "grid", cards: [{ type: "heading", heading: "Fourth" }] },
    ];
    const config: LovelaceConfig = { views: [{ sections }] };

    const result = moveSection(config, [0, 2], [0, 0]);

    assert.deepEqual((result.views[0] as LovelaceViewConfig).sections, [
      sections[2],
      sections[0],
      sections[1],
      sections[3],
    ]);
  });

  it("preserves section metadata, cards, view settings, and other views", () => {
    const movedSection: LovelaceSectionConfig = {
      type: "grid",
      column_span: 2,
      row_span: 3,
      background: { color: "red", opacity: 30 },
      theme: "Dark",
      disabled: false,
      visibility: [{ condition: "user", users: ["user-id"] }],
      cards: [
        { type: "heading", heading: "Alarm" },
        {
          type: "tile",
          entity: "switch.alarm",
          grid_options: { columns: 6, rows: 1 },
          tap_action: { action: "toggle" },
        },
      ],
    };
    const otherSection: LovelaceSectionConfig = {
      type: "grid",
      cards: [{ type: "button", entity: "light.kitchen" }],
    };
    const view: LovelaceViewConfig = {
      type: "sections",
      title: "Home",
      path: "home",
      max_columns: 4,
      dense_section_placement: false,
      badges: [{ type: "entity", entity: "lock.front_door" }],
      header: { badges_position: "top" },
      sections: [otherSection, movedSection],
    };
    const config: LovelaceConfig = {
      background: "blue",
      views: [
        { title: "Before", cards: [{ type: "button" }] },
        view,
        { title: "After", strategy: { type: "custom:test" } },
      ],
    };

    const result = moveSection(config, [1, 1], [1, 0]);

    assert.deepEqual(result, {
      ...config,
      views: [
        config.views[0],
        { ...view, sections: [movedSection, otherSection] },
        config.views[2],
      ],
    });
  });

  it("does not mutate the original dashboard configuration", () => {
    const config: LovelaceConfig = {
      views: [
        {
          type: "sections",
          sections: [
            { type: "grid", cards: [{ type: "heading", heading: "First" }] },
            {
              type: "grid",
              column_span: 2,
              visibility: [{ condition: "user", users: ["user-id"] }],
              cards: [{ type: "tile", entity: "switch.alarm" }],
            },
          ],
        },
      ],
    };
    const original = JSON.stringify(config);

    const result = moveSection(config, [0, 1], [0, 0]);

    assert.equal(JSON.stringify(config), original);
    assert.notStrictEqual(result, config);
    assert.notStrictEqual(result.views, config.views);
    assert.notStrictEqual(result.views[0], config.views[0]);
  });
});

describe("duplicateSection", () => {
  it("inserts a clone immediately after the original section", () => {
    const config: LovelaceConfig = {
      views: [
        {
          sections: [
            { type: "grid", cards: [{ type: "button" }] },
            { type: "grid", cards: [{ type: "heading" }] },
          ],
        },
      ],
    };

    const result = duplicateSection(config, 0, 0);

    const expected: LovelaceConfig = {
      views: [
        {
          sections: [
            { type: "grid", cards: [{ type: "button" }] },
            { type: "grid", cards: [{ type: "button" }] },
            { type: "grid", cards: [{ type: "heading" }] },
          ],
        },
      ],
    };
    assert.deepEqual(expected, result);
  });

  it("preserves all cards and properties within the cloned section", () => {
    const config: LovelaceConfig = {
      views: [
        {
          sections: [
            {
              type: "grid",
              column_span: 2,
              cards: [{ type: "button" }, { type: "heading" }],
            },
          ],
        },
      ],
    };

    const result = duplicateSection(config, 0, 0);
    const view = result.views[0] as LovelaceViewConfig;

    assert.equal(view.sections!.length, 2);
    assert.deepEqual(view.sections![0], view.sections![1]);
  });

  it("produces a deep clone, changes do not affect the original", () => {
    const config: LovelaceConfig = {
      views: [
        {
          sections: [
            {
              type: "grid",
              column_span: 2,
              cards: [{ type: "button" }, { type: "heading" }],
            },
          ],
        },
      ],
    };

    const result = duplicateSection(config, 0, 0);
    const resultSections = (result.views[0] as LovelaceViewConfig).sections!;

    assert.equal(resultSections.length, 2);
    assert.deepEqual(resultSections[0], resultSections[1]);

    (resultSections[1] as LovelaceSectionConfig).cards![0].type = "heading";

    assert.equal(
      (resultSections[0] as LovelaceSectionConfig).cards![0].type,
      "button"
    );
  });
});
