declare global {
  interface HASSDomEvents {
    "hass-refresh-tokens": undefined;
  }
}

export interface RefreshToken {
  client_icon?: string;
  client_id: string;
  client_name?: string;
  created_at: string;
  id: string;
  is_current: boolean;
  last_used_at?: string;
  last_used_ip?: string;
  type: "normal" | "long_lived_access_token";
}
