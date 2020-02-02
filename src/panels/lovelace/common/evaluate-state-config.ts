import deepClone from "deep-clone-simple";

import { evaluateFilter } from "./evaluate-filter";
import { HomeAssistant } from "../../../types";

export const evaluateStateConfig = (
  hass?: HomeAssistant,
  originalConfig?: {
    [key: string]: any;
  }
):
  | {
      [key: string]: any;
    }
  | undefined => {
  const config = deepClone(originalConfig);
  if (hass && config && config.states) {
    for (const state of config.states) {
      if ((!config.entity && !state.entity) || !state.config) {
        continue;
      }

      const stateObj = hass.states[state.entity || config.entity];
      if (evaluateFilter(stateObj, state)) {
        for (const key in state.config) {
          if (state.config.hasOwnProperty(key)) {
            config[key] = state.config[key];
          }
        }
      }
    }
  }

  return config;
};
