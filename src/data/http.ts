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

interface HttpConfigResponse {
  config: HttpConfig;
}

export const fetchHttpConfig = (hass: HomeAssistant) =>
  hass.callWS<HttpConfigResponse>({ type: "http/config/get" });

export const saveHttpConfig = (hass: HomeAssistant, config: HttpConfig) =>
  hass.callWS<HttpConfigResponse>({
    type: "http/config/update",
    config,
  });
