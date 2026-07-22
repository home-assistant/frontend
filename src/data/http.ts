import type { HomeAssistant } from "../types";

export interface HttpConfig {
  server_host?: string[];
  server_port?: number;
  ssl_certificate?: string;
  ssl_peer_certificate?: string;
  ssl_key?: string;
  cors_allowed_origins?: string[];
  use_x_forwarded_for?: boolean;
  trusted_proxies?: string[];
  use_x_frame_options?: boolean;
  ip_ban_enabled?: boolean;
  login_attempts_threshold?: number;
  ssl_profile?: "modern" | "intermediate";
}

export interface HttpConfigState {
  stable: HttpConfig;
  pending: HttpConfig | null;
  revert_at: string | null;
}

export const HTTP_CONFIG_FIELDS: (keyof HttpConfig)[] = [
  "server_port",
  "server_host",
  "ssl_certificate",
  "ssl_key",
  "ssl_peer_certificate",
  "ssl_profile",
  "cors_allowed_origins",
  "use_x_forwarded_for",
  "trusted_proxies",
  "use_x_frame_options",
  "ip_ban_enabled",
  "login_attempts_threshold",
];

export interface SaveHttpConfigResult {
  restart: boolean;
}

export const fetchHttpConfig = (hass: HomeAssistant) =>
  hass.callWS<HttpConfigState>({ type: "http/config" });

export const saveHttpConfig = (
  hass: HomeAssistant,
  config: HttpConfig | null
) =>
  hass.callWS<SaveHttpConfigResult>({
    type: "http/config/configure",
    config,
  });

export const promoteHttpConfig = (hass: HomeAssistant) =>
  hass.callWS<undefined>({ type: "http/config/promote" });
