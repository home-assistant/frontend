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

export const serviceCallWillDisconnect = (
  domain: string,
  service: string,
  serviceData?: Record<string, any>
) =>
  (domain === "homeassistant" && ["restart", "stop"].includes(service)) ||
  (domain === "update" &&
    service === "install" &&
    [
      "update.home_assistant_core_update",
      "update.home_assistant_operating_system_update",
    ].includes(serviceData?.entity_id));
