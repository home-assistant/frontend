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

// The slot the running HTTP server was actually started with.
export type ActiveConfigType = "stable" | "pending" | "default";

// A stored config slot carries metadata alongside the editable fields:
// - created_at: when the slot was staged
// - error: null while healthy; set once a slot could not be applied or a
//   pending trial was not confirmed (then it is kept for display, not retried)
export interface HttpConfigWithMeta extends HttpConfig {
  created_at?: string;
  error?: string | null;
}

export interface HttpConfigState {
  stable: HttpConfigWithMeta;
  pending: HttpConfigWithMeta | null;
  revert_at: string | null;
  // Added in the "active HTTP config slot" backend change; optional so the
  // frontend keeps working against cores without it.
  active_config_type?: ActiveConfigType;
  default?: HttpConfigWithMeta;
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

// Keep only the editable fields; the backend storage schema rejects unknown
// keys, so the created_at/error metadata that rides along on a fetched slot
// must be dropped before configuring.
export const stripHttpConfigMeta = (config: HttpConfig): HttpConfig => {
  const stripped: Partial<Record<keyof HttpConfig, unknown>> = {};
  for (const key of HTTP_CONFIG_FIELDS) {
    if (config[key] !== undefined) {
      stripped[key] = config[key];
    }
  }
  return stripped as HttpConfig;
};

export const fetchHttpConfig = (hass: HomeAssistant) =>
  hass.callWS<HttpConfigState>({ type: "http/config" });

export const saveHttpConfig = (
  hass: HomeAssistant,
  config: HttpConfig | null
) =>
  hass.callWS<SaveHttpConfigResult>({
    type: "http/config/configure",
    config: config ? stripHttpConfigMeta(config) : null,
  });

export const promoteHttpConfig = (hass: HomeAssistant) =>
  hass.callWS<undefined>({ type: "http/config/promote" });
