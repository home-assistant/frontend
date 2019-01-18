import { LovelaceConfig } from "../../src/data/lovelace";
import { entities } from "./entities";

import "./ha-demo-card";
import { MockHomeAssistant } from "../../src/fake_data/provide_hass";

// @ts-ignore
const demoLovelaceConfig: LovelaceConfig = {
  views: [
    {
      path: "overview",
      cards: [],
    },
  ],
};

export const mockLovelace = (hass: MockHomeAssistant) => {
  hass.addEntities(entities);

  hass.mockWS("lovelace/config", () =>
    Promise.reject({
      code: "config_not_found",
    })
  );

  hass.mockWS("frontend/get_translations", () => Promise.resolve({}));
  hass.mockWS("lovelace/config/save", () => Promise.resolve());
};
