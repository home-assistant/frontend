import { HomeAssistant } from "../types";

export const fetchTemplateEntities = (hass: HomeAssistant) =>
  hass.callWS<String[]>({ type: "template/list" });
