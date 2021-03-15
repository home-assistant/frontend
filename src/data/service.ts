import { HomeAssistant } from "../types";
import { ServiceAction } from "./script";

export const callServiceAction = (
  hass: HomeAssistant,
  service_action: ServiceAction
) =>
  hass.callWS({
    type: "call_service_action",
    service_action,
  });
