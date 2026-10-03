declare global {
  interface HASSDomEvents {
    "hass-refresh-tokens": undefined;
  }
}

export type RefreshTokenType = "normal" | "system" | "long_lived_access_token";

export interface RefreshToken {
  auth_provider_type: string | null;
  client_icon: string | null;
  client_id: string | null;
  client_name: string | null;
  created_at: string;
  expire_at: string | null;
  id: string;
  is_current: boolean;
  last_used_at: string | null;
  last_used_ip: string | null;
  type: RefreshTokenType;
}
