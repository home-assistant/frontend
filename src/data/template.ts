import { HomeAssistant } from "../types";

export const fetchTemplateEntities = (hass: HomeAssistant) =>
  hass.callWS<string[]>({ type: "template/list" });
