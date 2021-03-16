import { HomeAssistant } from "../types";
import { Action } from "./script";

export const callExecuteScript = (hass: HomeAssistant, sequence: Action[]) =>
  hass.callWS({
    type: "execute_script",
    sequence,
  });
