import type { HomeAssistant } from "../types";

export interface IpBan {
  ip_address: string;
  // Entries from older ip_bans.yaml files may lack a ban time.
  banned_at: string | null;
}

export const fetchIpBans = (hass: HomeAssistant) =>
  hass.callWS<{ ip_bans: IpBan[] }>({ type: "http/ip_bans/list" });

export const removeIpBan = (hass: HomeAssistant, ipAddress: string) =>
  hass.callWS<null>({ type: "http/ip_bans/remove", ip_address: ipAddress });
