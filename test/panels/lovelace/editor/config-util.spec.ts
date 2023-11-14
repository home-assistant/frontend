import { assert } from "chai";

import {
  swapCard,
  moveCard,
  swapView,
} from "../../../../src/panels/lovelace/editor/config-util";
import { LovelaceDashboardConfig } from "../../../../src/data/lovelace/config/dashboard";

describe("swapCard", () => {
  it("swaps 2 cards in same view", () => {
    const config: LovelaceDashboardConfig = {
      views: [
        {},
        {
          cards: [{ type: "card1" }, { type: "card2" }],
        },
      ],
    };

    const result = swapCard(config, [1, 0], [1, 1]);
    const expected = {
      views: [
        {},
        {
          cards: [{ type: "card2" }, { type: "card1" }],
        },
      ],
    };
    assert.deepEqual(expected, result);
  });

  it("swaps 2 cards in different views", () => {
    const config: LovelaceDashboardConfig = {
      views: [
        {
          cards: [{ type: "v1-c1" }, { type: "v1-c2" }],
        },
        {
          cards: [{ type: "v2-c1" }, { type: "v2-c2" }],
        },
      ],
    };

    const result = swapCard(config, [0, 0], [1, 1]);
    const expected: LovelaceDashboardConfig = {
      views: [
        {
          cards: [{ type: "v2-c2" }, { type: "v1-c2" }],
        },
        {
          cards: [{ type: "v2-c1" }, { type: "v1-c1" }],
        },
      ],
    };
    assert.deepEqual(expected, result);
  });
});

describe("moveCard", () => {
  it("move a card to an empty view", () => {
    const config: LovelaceDashboardConfig = {
      views: [
        {},
        {
          cards: [{ type: "card1" }, { type: "card2" }],
        },
      ],
    };

    const result = moveCard(config, [1, 0], [0]);
    const expected: LovelaceDashboardConfig = {
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
    const config: LovelaceDashboardConfig = {
      views: [
        {
          cards: [{ type: "v1-c1" }, { type: "v1-c2" }],
        },
        {
          cards: [{ type: "v2-c1" }, { type: "v2-c2" }],
        },
      ],
    };

    const result = moveCard(config, [1, 0], [0]);
    const expected: LovelaceDashboardConfig = {
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
    const config: LovelaceDashboardConfig = {
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
      moveCard(config, [1, 0], [1]);
    };
    assert.throws(
      result,
      Error,
      "You cannot move a card to the view it is in."
    );
  });
});

describe("swapView", () => {
  it("swaps 2 view", () => {
    const config: LovelaceDashboardConfig = {
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
    const expected: LovelaceDashboardConfig = {
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
    const config: LovelaceDashboardConfig = {
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
    const expected: LovelaceDashboardConfig = {
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
