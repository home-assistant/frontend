import { entities } from "./entities";

import "./ha-demo-card";
// Not duplicate, one is for typing.
// tslint:disable-next-line
import { HADemoCard } from "./ha-demo-card";
import { MockHomeAssistant } from "../../src/fake_data/provide_hass";
import { HUIView } from "../../src/panels/lovelace/hui-view";
import { placeholder1Config } from "./lovelace_configs/placeholder1";

export const mockLovelace = (hass: MockHomeAssistant) => {
  hass.addEntities(entities);

  hass.mockWS("lovelace/config", () => Promise.resolve(placeholder1Config));

  hass.mockWS("frontend/get_translations", () => Promise.resolve({}));
  hass.mockWS("lovelace/config/save", () => Promise.resolve());
};

// Patch HUI-VIEW to make the lovelace object available to the demo card
// @ts-ignore
const oldCreateCard = HUIView.prototype._createCardElement;

// @ts-ignore
HUIView.prototype._createCardElement = function(config) {
  const el = oldCreateCard.call(this, config);
  if (el.tagName === "HA-DEMO-CARD") {
    (el as HADemoCard).lovelace = this.lovelace;
  }
  return el;
};
