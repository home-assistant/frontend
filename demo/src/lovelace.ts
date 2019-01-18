import { LovelaceConfig } from "../../src/data/lovelace";
import { entities } from "./entities";

import "./ha-demo-card";

// @ts-ignore
const demoLovelaceConfig: LovelaceConfig = {
  views: [
    {
      path: "overview",
      cards: [],
    },
  ],
};

export const mockLovelace = (hass) => {
  hass.addEntities(entities);

  hass.mockWS("lovelace/config", () =>
    Promise.reject({
      code: "config_not_found",
    })
  );

  hass.mockWS("frontend/get_translations", () => Promise.resolve({}));
  hass.mockWS("lovelace/config/save", () => Promise.resolve());
};
