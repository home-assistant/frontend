import type { Connection } from "home-assistant-js-websocket";
import type { HomeAssistant } from "../../types";

export type LovelaceResource = {
  id: string;
  type: "css" | "js" | "module" | "html";
  url: string;
};

export type LovelaceResourcesMutableParams = {
  res_type: LovelaceResource["type"];
  url: string;
};

export const fetchResources = (conn: Connection): Promise<LovelaceResource[]> =>
  conn.sendMessagePromise({
    type: "lovelace/resources",
  });

export const createResource = (
  hass: HomeAssistant,
  values: LovelaceResourcesMutableParams
) =>
  hass.callWS<LovelaceResource>({
    type: "lovelace/resources/create",
    ...values,
  });

export const updateResource = (
  hass: HomeAssistant,
  id: string,
  updates: Partial<LovelaceResourcesMutableParams>
) =>
  hass.callWS<LovelaceResource>({
    type: "lovelace/resources/update",
    resource_id: id,
    ...updates,
  });

export const deleteResource = (hass: HomeAssistant, id: string) =>
  hass.callWS({
    type: "lovelace/resources/delete",
    resource_id: id,
  });
