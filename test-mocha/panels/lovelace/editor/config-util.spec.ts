import * as assert from "assert";

import { swapCard } from "../../../../src/panels/lovelace/editor/config-util";
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
    };
    assert.deepEqual(expected, result);
  });
});
