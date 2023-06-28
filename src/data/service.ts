import { Context, HomeAssistant } from "../types";
import { Action } from "./script";

export const callExecuteScript = (
  hass: HomeAssistant,
  sequence: Action | Action[]
): Promise<{ context: Context; response: Record<string, any> }> =>
  hass.callWS({
    type: "execute_script",
    sequence,
  });

export const serviceCallWillDisconnect = (domain: string, service: string) =>
  domain === "homeassistant" && ["restart", "stop"].includes(service);
