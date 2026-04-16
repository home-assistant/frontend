import type { HomeAssistant } from "../types";

export interface ZwaveCredentialTypeCapability {
  num_slots: number;
  min_length: number;
  max_length: number;
  supports_learn: boolean;
}

export interface ZwaveCredentialCapabilities {
  supports_user_management: boolean;
  max_users: number;
  supported_user_types: string[];
  max_user_name_length: number;
  supported_credential_rules: string[];
  supported_credential_types: Record<string, ZwaveCredentialTypeCapability>;
}

export interface ZwaveCredentialRef {
  type: string;
  slot: number;
}

export interface ZwaveUser {
  user_index: number;
  user_name: string | null;
  active: boolean;
  user_type: string;
  credential_rule: string;
  credentials: ZwaveCredentialRef[];
}

export interface ZwaveUsersResponse {
  max_users: number;
  users: ZwaveUser[];
}

export interface SetZwaveUserParams {
  user_index?: number;
  user_name?: string | null;
  user_type?: string;
  credential_rule?: string;
  active?: boolean;
}

export interface SetZwaveCredentialParams {
  credential_type: string;
  credential_data: string;
  credential_slot?: number;
  user_index?: number;
  active?: boolean;
  user_type?: string;
}

export interface SetZwaveCredentialResult {
  credential_slot: number;
  user_index: number | null;
}

export interface ClearZwaveCredentialParams {
  credential_type: string;
  credential_slot: number;
  user_index: number;
}

export const getZwaveCredentialCapabilities = async (
  hass: HomeAssistant,
  device_id: string
): Promise<ZwaveCredentialCapabilities> => {
  const result = await hass.callService<
    Record<string, ZwaveCredentialCapabilities>
  >("zwave_js", "get_credential_capabilities", {}, { device_id }, true, true);
  return result.response![device_id];
};

export const getZwaveUsers = async (
  hass: HomeAssistant,
  device_id: string
): Promise<ZwaveUsersResponse> => {
  const result = await hass.callService<Record<string, ZwaveUsersResponse>>(
    "zwave_js",
    "get_users",
    {},
    { device_id },
    true,
    true
  );
  return result.response![device_id];
};

export const setZwaveUser = (
  hass: HomeAssistant,
  device_id: string,
  params: SetZwaveUserParams
) => hass.callService("zwave_js", "set_user", params, { device_id });

export const clearZwaveUser = (
  hass: HomeAssistant,
  device_id: string,
  user_index: number
) => hass.callService("zwave_js", "clear_user", { user_index }, { device_id });

export const setZwaveCredential = async (
  hass: HomeAssistant,
  device_id: string,
  params: SetZwaveCredentialParams
): Promise<SetZwaveCredentialResult> => {
  const result = await hass.callService<
    Record<string, SetZwaveCredentialResult>
  >("zwave_js", "set_credential", params, { device_id }, true, true);
  return result.response![device_id];
};

export const clearZwaveCredential = (
  hass: HomeAssistant,
  device_id: string,
  params: ClearZwaveCredentialParams
) => hass.callService("zwave_js", "clear_credential", params, { device_id });
