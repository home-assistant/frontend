import { assert, describe, it } from "vitest";

import type { LovelaceCardConfig } from "../../../../src/data/lovelace/config/card";
import type { LovelaceConfig } from "../../../../src/data/lovelace/config/types";
import type { LovelacePath } from "../../../../src/panels/lovelace/editor/lovelace-path";
import {
  appendAtPath,
  deleteAtPath,
  getAtPath,
  getItemKind,
  getParentPath,
  getViewPath,
  insertAtPath,
  isAncestorPath,
  getPathTarget,
  moveAtPath,
  normalizeCardPath,
  parsePath,
  pathEquals,
  setAtPath,
  stringifyPath,
} from "../../../../src/panels/lovelace/editor/lovelace-path";

const createConfig = (): LovelaceConfig => ({
  views: [
    {
      title: "Home",
      badges: ["sensor.badge0", { type: "entity", entity: "sensor.badge1" }],
      cards: [{ type: "v0-c0" }, { type: "v0-c1" }],
    },
    {
      title: "Areas",
      sections: [
        {
          type: "grid",
          cards: [{ type: "s0-c0" }, { type: "s0-c1" }, { type: "s0-c2" }],
        },
        { type: "grid", cards: [{ type: "s1-c0" }] },
        { strategy: { type: "areas" } },
      ],
    },
    { strategy: { type: "original-states" } },
  ],
});

describe("stringifyPath / parsePath", () => {
  it("round trips a nested card path", () => {
    const path: LovelacePath = ["views", 0, "sections", 1, "cards", 2];
    assert.strictEqual(stringifyPath(path), "views/0/sections/1/cards/2");
    assert.deepEqual(parsePath("views/0/sections/1/cards/2"), path);
  });

  it("round trips a slot path", () => {
    const path: LovelacePath = ["views", 0, "header", "card"];
    assert.strictEqual(stringifyPath(path), "views/0/header/card");
    assert.deepEqual(parsePath("views/0/header/card"), path);
  });

  it("parses numeric segments as numbers", () => {
    const parsed = parsePath("views/12");
    assert.deepEqual(parsed, ["views", 12]);
    assert.strictEqual(typeof parsed[1], "number");
  });

  it("handles the root path", () => {
    assert.strictEqual(stringifyPath([]), "");
    assert.deepEqual(parsePath(""), []);
  });
});

describe("path helpers", () => {
  it("normalizes legacy card index tuples", () => {
    assert.deepEqual(normalizeCardPath([0, 2]), ["views", 0, "cards", 2]);
    assert.deepEqual(normalizeCardPath([0, 1, 2]), [
      "views",
      0,
      "sections",
      1,
      "cards",
      2,
    ]);
    assert.deepEqual(normalizeCardPath(["views", 0, "cards", 2]), [
      "views",
      0,
      "cards",
      2,
    ]);
  });

  it("resolves the item kind from the last string segment", () => {
    assert.strictEqual(getItemKind(["views", 0, "header", "card"]), "card");
    assert.strictEqual(getItemKind(["views", 0, "cards", 1]), "card");
    assert.strictEqual(getItemKind(["views", 0, "badges", 1]), "badge");
    assert.strictEqual(getItemKind(["views", 0]), "view");
    assert.strictEqual(
      getItemKind(["views", 0, "sidebar", "sections", 0]),
      "section"
    );
    assert.strictEqual(getItemKind(["views", 0, "header"]), undefined);
    assert.strictEqual(getItemKind([]), undefined);
  });

  it("detects slot paths", () => {
    assert.strictEqual(getPathTarget(["views", 0, "header", "card"]), "slot");
    assert.strictEqual(getPathTarget(["views", 0, "cards"]), "list");
    assert.strictEqual(getPathTarget(["views", 0, "cards", 1]), "item");
    assert.strictEqual(getPathTarget(["views", 0, "header"]), undefined);
  });

  it("returns the parent path", () => {
    assert.deepEqual(getParentPath(["views", 0, "cards", 1]), [
      "views",
      0,
      "cards",
    ]);
    assert.deepEqual(getParentPath([]), []);
  });

  it("returns the view path", () => {
    assert.deepEqual(getViewPath(["views", 1, "sections", 0, "cards", 2]), [
      "views",
      1,
    ]);
    assert.deepEqual(getViewPath(["views", 1]), ["views", 1]);
  });

  it("compares paths", () => {
    assert.strictEqual(pathEquals(["views", 0], ["views", 0]), true);
    assert.strictEqual(pathEquals(["views", 0], ["views", 1]), false);
    assert.strictEqual(pathEquals(["views", 0], ["views", 0, "cards"]), false);
  });

  it("does not consider a path its own ancestor", () => {
    assert.strictEqual(
      isAncestorPath(["views", 0], ["views", 0, "cards", 1]),
      true
    );
    assert.strictEqual(isAncestorPath(["views", 0], ["views", 0]), false);
    assert.strictEqual(
      isAncestorPath(["views", 0, "cards", 1], ["views", 0]),
      false
    );
    assert.strictEqual(
      isAncestorPath(["views", 1], ["views", 0, "cards", 1]),
      false
    );
  });
});

describe("getAtPath", () => {
  it("reads a nested card", () => {
    const config = createConfig();
    assert.deepEqual(
      getAtPath(config, ["views", 1, "sections", 0, "cards", 1]),
      {
        type: "s0-c1",
      }
    );
  });

  it("returns undefined for a missing leaf", () => {
    const config = createConfig();
    assert.strictEqual(getAtPath(config, ["views", 0, "cards", 5]), undefined);
  });

  it("returns undefined for a missing intermediate", () => {
    const config = createConfig();
    assert.strictEqual(
      getAtPath(config, ["views", 0, "sidebar", "sections", 0]),
      undefined
    );
  });

  it("throws when descending through a strategy view", () => {
    const config = createConfig();
    assert.throws(
      () => getAtPath(config, ["views", 2, "cards"]),
      "Cannot edit inside a strategy: views/2"
    );
  });

  it("throws when descending through a strategy section", () => {
    const config = createConfig();
    assert.throws(
      () => getAtPath(config, ["views", 1, "sections", 2, "cards"]),
      "Cannot edit inside a strategy: views/1/sections/2"
    );
  });

  it("returns a strategy view when it is the final target", () => {
    const config = createConfig();
    assert.deepEqual(getAtPath(config, ["views", 2]), {
      strategy: { type: "original-states" },
    });
  });

  it("throws for any non-empty path on a strategy dashboard", () => {
    const config = {
      strategy: { type: "original-states" },
    } as unknown as LovelaceConfig;
    assert.throws(
      () => getAtPath(config, ["views"]),
      "Cannot edit inside a strategy: "
    );
    assert.deepEqual(getAtPath(config, []), config);
  });
});

describe("setAtPath", () => {
  it("replaces a list item", () => {
    const config = createConfig();
    const result = setAtPath(config, ["views", 0, "cards", 1], {
      type: "new-card",
    });
    assert.deepEqual(getAtPath(result, ["views", 0, "cards"]), [
      { type: "v0-c0" },
      { type: "new-card" },
    ]);
  });

  it("replaces a slot", () => {
    const config: LovelaceConfig = {
      views: [{ header: { card: { type: "old" } } }],
    };
    const result = setAtPath(config, ["views", 0, "header", "card"], {
      type: "new",
    });
    assert.deepEqual(getAtPath(result, ["views", 0, "header"]), {
      card: { type: "new" },
    });
  });

  it("creates a missing header object", () => {
    const config = createConfig();
    const result = setAtPath(config, ["views", 0, "header", "card"], {
      type: "heading",
    });
    assert.deepEqual(getAtPath(result, ["views", 0, "header"]), {
      card: { type: "heading" },
    });
  });

  it("does not mutate the input config", () => {
    const config = createConfig();
    setAtPath(config, ["views", 1, "sections", 0, "cards", 0], {
      type: "new-card",
    });
    assert.deepEqual(config, createConfig());
  });

  it("keeps untouched branches identical", () => {
    const config = createConfig();
    const result = setAtPath(config, ["views", 1, "sections", 0, "cards", 0], {
      type: "new-card",
    });
    // Renderers key repeat() on config object identity, so untouched nodes must keep their reference.
    assert.strictEqual(
      getAtPath(result, ["views", 1, "sections", 0, "cards", 1]),
      getAtPath(config, ["views", 1, "sections", 0, "cards", 1])
    );
    assert.strictEqual(
      getAtPath(result, ["views", 1, "sections", 1]),
      getAtPath(config, ["views", 1, "sections", 1])
    );
    assert.strictEqual(
      getAtPath(result, ["views", 0]),
      getAtPath(config, ["views", 0])
    );
  });
});

describe("insertAtPath", () => {
  it("splices in the middle", () => {
    const config = createConfig();
    const result = insertAtPath(config, ["views", 0, "cards", 1], {
      type: "inserted",
    });
    assert.deepEqual(getAtPath(result, ["views", 0, "cards"]), [
      { type: "v0-c0" },
      { type: "inserted" },
      { type: "v0-c1" },
    ]);
  });

  it("clamps an index beyond the length to the end", () => {
    const config = createConfig();
    const result = insertAtPath(config, ["views", 0, "cards", 99], {
      type: "inserted",
    });
    assert.deepEqual(getAtPath(result, ["views", 0, "cards"]), [
      { type: "v0-c0" },
      { type: "v0-c1" },
      { type: "inserted" },
    ]);
  });

  it("clamps a negative index to the start", () => {
    const config = createConfig();
    const result = insertAtPath(config, ["views", 0, "cards", -1], {
      type: "inserted",
    });
    assert.deepEqual(getAtPath(result, ["views", 0, "cards"]), [
      { type: "inserted" },
      { type: "v0-c0" },
      { type: "v0-c1" },
    ]);
  });

  it("creates a missing cards list", () => {
    const config: LovelaceConfig = { views: [{ title: "Empty" }] };
    const result = insertAtPath(config, ["views", 0, "cards", 0], {
      type: "first",
    });
    assert.deepEqual(result, {
      views: [{ title: "Empty", cards: [{ type: "first" }] }],
    });
  });

  it("behaves like set when the last segment is a string", () => {
    const config = createConfig();
    const card: LovelaceCardConfig = { type: "heading" };
    assert.deepEqual(
      insertAtPath(config, ["views", 0, "header", "card"], card),
      setAtPath(config, ["views", 0, "header", "card"], card)
    );
  });
});

describe("appendAtPath", () => {
  it("appends to an existing list", () => {
    const config = createConfig();
    const result = appendAtPath(config, ["views", 0, "cards"], {
      type: "appended",
    });
    assert.deepEqual(getAtPath(result, ["views", 0, "cards"]), [
      { type: "v0-c0" },
      { type: "v0-c1" },
      { type: "appended" },
    ]);
  });

  it("creates a missing collection", () => {
    const config: LovelaceConfig = { views: [{ title: "Empty" }] };
    const result = appendAtPath(config, ["views", 0, "sidebar", "sections"], {
      type: "grid",
    });
    assert.deepEqual(result, {
      views: [{ title: "Empty", sidebar: { sections: [{ type: "grid" }] } }],
    });
  });
});

describe("deleteAtPath", () => {
  it("removes a list item", () => {
    const config = createConfig();
    const result = deleteAtPath(config, ["views", 0, "cards", 0]);
    assert.deepEqual(getAtPath(result, ["views", 0, "cards"]), [
      { type: "v0-c1" },
    ]);
  });

  it("keeps an emptied list", () => {
    const config = createConfig();
    const result = deleteAtPath(config, [
      "views",
      1,
      "sections",
      1,
      "cards",
      0,
    ]);
    assert.deepEqual(getAtPath(result, ["views", 1, "sections", 1]), {
      type: "grid",
      cards: [],
    });
  });

  it("removes a slot key", () => {
    const config: LovelaceConfig = {
      views: [{ header: { layout: "start", card: { type: "old" } } }],
    };
    const result = deleteAtPath(config, ["views", 0, "header", "card"]);
    assert.deepEqual(getAtPath(result, ["views", 0, "header"]), {
      layout: "start",
    });
  });

  it("returns the same config when the target is missing", () => {
    const config = createConfig();
    assert.strictEqual(deleteAtPath(config, ["views", 0, "cards", 9]), config);
    assert.strictEqual(deleteAtPath(config, []), config);
  });
});

describe("moveAtPath", () => {
  it("moves forward inside the same list", () => {
    const config: LovelaceConfig = {
      views: [{ cards: [{ type: "a" }, { type: "b" }, { type: "c" }] }],
    };
    const result = moveAtPath(
      config,
      ["views", 0, "cards", 0],
      ["views", 0, "cards", 2]
    );
    assert.deepEqual(getAtPath(result, ["views", 0, "cards"]), [
      { type: "b" },
      { type: "c" },
      { type: "a" },
    ]);
  });

  it("moves backward inside the same list", () => {
    const config: LovelaceConfig = {
      views: [{ cards: [{ type: "a" }, { type: "b" }, { type: "c" }] }],
    };
    const result = moveAtPath(
      config,
      ["views", 0, "cards", 2],
      ["views", 0, "cards", 0]
    );
    assert.deepEqual(getAtPath(result, ["views", 0, "cards"]), [
      { type: "c" },
      { type: "a" },
      { type: "b" },
    ]);
  });

  it("moves a card between two sections", () => {
    const config = createConfig();
    const result = moveAtPath(
      config,
      ["views", 1, "sections", 0, "cards", 0],
      ["views", 1, "sections", 1, "cards", 0]
    );
    assert.deepEqual(getAtPath(result, ["views", 1, "sections", 0, "cards"]), [
      { type: "s0-c1" },
      { type: "s0-c2" },
    ]);
    assert.deepEqual(getAtPath(result, ["views", 1, "sections", 1, "cards"]), [
      { type: "s0-c0" },
      { type: "s1-c0" },
    ]);
  });

  it("moves a view card into the header slot", () => {
    const config = createConfig();
    const result = moveAtPath(
      config,
      ["views", 0, "cards", 0],
      ["views", 0, "header", "card"]
    );
    assert.deepEqual(getAtPath(result, ["views", 0, "cards"]), [
      { type: "v0-c1" },
    ]);
    assert.deepEqual(getAtPath(result, ["views", 0, "header"]), {
      card: { type: "v0-c0" },
    });
  });

  it("targets the shifted sibling when moving into a later sibling", () => {
    const config: LovelaceConfig = {
      views: [
        {
          sections: [
            { type: "grid", cards: [{ type: "s0-c0" }] },
            { type: "grid", cards: [{ type: "s1-c0" }] },
            { type: "grid", cards: [{ type: "s2-c0" }] },
          ],
        },
      ],
    };
    const result = moveAtPath(
      config,
      ["views", 0, "sections", 0],
      ["views", 0, "sections", 2, "cards", 0]
    );
    assert.deepEqual(result, {
      views: [
        {
          sections: [
            { type: "grid", cards: [{ type: "s1-c0" }] },
            {
              type: "grid",
              cards: [
                { type: "grid", cards: [{ type: "s0-c0" }] },
                { type: "s2-c0" },
              ],
            },
          ],
        },
      ],
    });
  });

  it("returns the same config when source and target are equal", () => {
    const config = createConfig();
    assert.strictEqual(
      moveAtPath(config, ["views", 0, "cards", 0], ["views", 0, "cards", 0]),
      config
    );
  });

  it("throws when moving into its own descendant", () => {
    const config = createConfig();
    assert.throws(
      () =>
        moveAtPath(
          config,
          ["views", 1, "sections", 0],
          ["views", 1, "sections", 0, "cards", 0]
        ),
      "Cannot move views/1/sections/0 into itself: views/1/sections/0/cards/0"
    );
  });

  it("throws when the source does not exist", () => {
    const config = createConfig();
    assert.throws(
      () =>
        moveAtPath(config, ["views", 0, "cards", 9], ["views", 0, "cards", 0]),
      "Nothing to move at views/0/cards/9"
    );
  });
});
