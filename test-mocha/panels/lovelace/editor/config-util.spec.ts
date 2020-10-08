import * as assert from "assert";

import {
  swapCard,
  moveCard,
  swapView,
} from "../../../../src/panels/lovelace/editor/config-util";
import { LovelaceConfig } from "../../../../src/data/lovelace";

describe("swapCard", () => {
  it("swaps 2 cards in same view", () => {
    const config: LovelaceConfig = {
      views: [
        {},
        {
          cards: [{ type: "card1" }, { type: "card2" }],
        },
      ],
      append_view_title: false,
    };

    const result = swapCard(config, [1, 0], [1, 1]);
    const expected = {
      views: [
        {},
        {
          cards: [{ type: "card2" }, { type: "card1" }],
        },
      ],
      append_view_title: false,
    };
    assert.deepEqual(expected, result);
  });

  it("swaps 2 cards in different views", () => {
    const config: LovelaceConfig = {
      views: [
        {
          cards: [{ type: "v1-c1" }, { type: "v1-c2" }],
        },
        {
          cards: [{ type: "v2-c1" }, { type: "v2-c2" }],
        },
      ],
      append_view_title: false,
    };

    const result = swapCard(config, [0, 0], [1, 1]);
    const expected = {
      views: [
        {
          cards: [{ type: "v2-c2" }, { type: "v1-c2" }],
        },
        {
          cards: [{ type: "v2-c1" }, { type: "v1-c1" }],
        },
      ],
      append_view_title: false,
    };
    assert.deepEqual(expected, result);
  });
});

describe("moveCard", () => {
  it("move a card to an empty view", () => {
    const config: LovelaceConfig = {
      views: [
        {},
        {
          cards: [{ type: "card1" }, { type: "card2" }],
        },
      ],
      append_view_title: false,
    };

    const result = moveCard(config, [1, 0], [0]);
    const expected = {
      views: [
        {
          cards: [{ type: "card1" }],
        },
        {
          cards: [{ type: "card2" }],
        },
      ],
      append_view_title: false,
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
      append_view_title: false,
    };

    const result = moveCard(config, [1, 0], [0]);
    const expected = {
      views: [
        {
          cards: [{ type: "v1-c1" }, { type: "v1-c2" }, { type: "v2-c1" }],
        },
        {
          cards: [{ type: "v2-c2" }],
        },
      ],
      append_view_title: false,
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
      append_view_title: false,
    };

    const result = () => {
      moveCard(config, [1, 0], [1]);
    };
    assert.throws(
      result,
      Error,
      "You can not move a card to the view it is in."
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
      append_view_title: false,
    };

    const result = swapView(config, 1, 0);
    const expected = {
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
      append_view_title: false,
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
      append_view_title: false,
    };

    const result = swapView(config, 0, 0);
    const expected = {
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
      append_view_title: false,
    };
    assert.deepEqual(expected, result);
  });
});
