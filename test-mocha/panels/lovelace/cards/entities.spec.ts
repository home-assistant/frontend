import * as assert from "assert";

import { createCardElement } from "../../../../src/panels/lovelace/create-element/create-card-element";
import { LovelaceCardConfig } from "../../../../src/data/lovelace";
import {
  EntitiesCardConfig,
  EntitiesCardEntityConfig,
} from "../../../../src/panels/lovelace/cards/types";

describe("hui-entities-card", () => {
  it("creates an entities card", () => {
    const config: EntitiesCardConfig = {
      type: "entities",
      entities: [],
    };

    //createCardElement(config);
  });
});
