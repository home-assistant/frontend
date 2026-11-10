import { assert, describe, it } from "vitest";

import type { LovelaceConfig } from "../../../../src/data/lovelace/config/types";
import type { LovelaceSectionConfig } from "../../../../src/data/lovelace/config/section";
import type { LovelaceViewConfig } from "../../../../src/data/lovelace/config/view";
import {
  adoptViewLayout,
  duplicateSection,
  indexAfterMove,
  moveCardToContainer,
  moveView,
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

    const result = moveCardToContainer(
      config,
      ["views", 1, "cards", 0],
      ["views", 0]
    );
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

    const result = moveCardToContainer(
      config,
      ["views", 1, "cards", 0],
      ["views", 0]
    );
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
      moveCardToContainer(config, ["views", 1, "cards", 0], ["views", 1]);
    };
    assert.throws(
      result,
      Error,
      "You cannot move a card to the view or section it is in."
    );
  });
});

describe("moveView", () => {
  const config: LovelaceConfig = {
    views: [{ title: "a" }, { title: "b" }, { title: "c" }, { title: "d" }],
  };
  const titles = (result: LovelaceConfig) =>
    result.views.map((view) => view.title);

  it("moves a view to the right", () => {
    assert.deepEqual(titles(moveView(config, 0, 2)), ["b", "c", "a", "d"]);
  });

  it("moves a view to the left", () => {
    assert.deepEqual(titles(moveView(config, 3, 1)), ["a", "d", "b", "c"]);
  });

  it("does not mutate the original config", () => {
    moveView(config, 0, 3);
    assert.deepEqual(titles(config), ["a", "b", "c", "d"]);
  });
});

describe("indexAfterMove", () => {
  it("matches where moveView puts every view", () => {
    const config: LovelaceConfig = {
      views: [{ title: "a" }, { title: "b" }, { title: "c" }, { title: "d" }],
    };
    const count = config.views.length;
    for (let from = 0; from < count; from++) {
      for (let to = 0; to < count; to++) {
        const result = moveView(config, from, to);
        for (let index = 0; index < count; index++) {
          assert.strictEqual(
            result.views[indexAfterMove(index, from, to)],
            config.views[index],
            `view ${index} after moving ${from} to ${to}`
          );
        }
      }
    }
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

    const result = duplicateSection(config, ["views", 0, "sections", 0]);

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

    const result = duplicateSection(config, ["views", 0, "sections", 0]);
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

    const result = duplicateSection(config, ["views", 0, "sections", 0]);
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

describe("adoptViewLayout", () => {
  it("takes the target card's view layout", () => {
    const card = { type: "card1", view_layout: { position: "sidebar" } };
    const target = { type: "card2", view_layout: { position: "main" } };

    assert.deepEqual(adoptViewLayout(card, target), {
      type: "card1",
      view_layout: { position: "main" },
    });
  });

  it("drops the card's own view layout when the target has none", () => {
    const card = { type: "card1", view_layout: { position: "sidebar" } };

    assert.deepEqual(adoptViewLayout(card, { type: "card2" }), {
      type: "card1",
    });
  });
});
