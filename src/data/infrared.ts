import type { HomeAssistant } from "../types";

export type InfraredProxyType = "emitter" | "receiver";

export interface InfraredProxy {
  entity_id: string;
  device_id: string | null;
  config_entry_id: string | null;
  name: string;
  type: InfraredProxyType;
}

export const listInfraredProxies = (
  hass: HomeAssistant
): Promise<{ proxies: InfraredProxy[] }> =>
  hass.callWS({
    type: "infrared/list",
  });
