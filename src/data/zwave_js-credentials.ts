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
  credential_rule: string | null;
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

export interface SetZwaveUserResult {
  user_index: number;
}

export interface SetZwaveCredentialParams {
  user_index: number;
  credential_type: string;
  credential_data: string;
  credential_slot?: number;
}

export interface SetZwaveCredentialResult {
  credential_slot: number;
  user_index: number;
}

export interface ClearZwaveCredentialParams {
  user_index: number;
  credential_type: string;
  credential_slot: number;
}

export interface GetZwaveCredentialStatusParams {
  user_index: number;
  credential_type: string;
  credential_slot: number;
}

export interface ZwaveCredentialStatus {
  credential_exists: boolean;
  user_index: number;
  credential_type: string;
  credential_slot: number;
}

const callCredentialService = async <T>(
  hass: HomeAssistant,
  service: string,
  device_id: string,
  params: Record<string, unknown> = {}
): Promise<T> => {
  // notifyOnError=false — callers surface errors in-dialog instead.
  const result = await hass.callService<T>(
    "zwave_js",
    service,
    params,
    { device_id },
    false,
    true
  );
  return result.response as T;
};

export const getZwaveCredentialCapabilities = (
  hass: HomeAssistant,
  device_id: string
): Promise<ZwaveCredentialCapabilities> =>
  callCredentialService<ZwaveCredentialCapabilities>(
    hass,
    "get_credential_capabilities",
    device_id
  );

export const getZwaveUsers = (
  hass: HomeAssistant,
  device_id: string
): Promise<ZwaveUsersResponse> =>
  callCredentialService<ZwaveUsersResponse>(hass, "get_users", device_id);

export const setZwaveUser = async (
  hass: HomeAssistant,
  device_id: string,
  params: SetZwaveUserParams
): Promise<SetZwaveUserResult> => {
  // Response is keyed by device_id for multi-target support.
  // notifyOnError=false — caller surfaces errors in-dialog instead.
  const result = await hass.callService<Record<string, SetZwaveUserResult>>(
    "zwave_js",
    "set_user",
    params,
    { device_id },
    false,
    true
  );
  return (result.response as Record<string, SetZwaveUserResult>)[device_id];
};

export const clearZwaveUser = (
  hass: HomeAssistant,
  device_id: string,
  user_index: number
) =>
  hass.callService(
    "zwave_js",
    "clear_user",
    { user_index },
    { device_id },
    false
  );

export const clearZwaveAllUsers = (hass: HomeAssistant, device_id: string) =>
  hass.callService("zwave_js", "clear_all_users", {}, { device_id }, false);

export const setZwaveCredential = async (
  hass: HomeAssistant,
  device_id: string,
  params: SetZwaveCredentialParams
): Promise<SetZwaveCredentialResult> => {
  // set_credential supports multi-target via area/device-list; response is
  // keyed by device_id. Frontend always passes a single device, so unwrap.
  // notifyOnError=false — caller surfaces errors in-dialog instead.
  const result = await hass.callService<
    Record<string, SetZwaveCredentialResult>
  >("zwave_js", "set_credential", params, { device_id }, false, true);
  return (result.response as Record<string, SetZwaveCredentialResult>)[
    device_id
  ];
};

export const clearZwaveCredential = (
  hass: HomeAssistant,
  device_id: string,
  params: ClearZwaveCredentialParams
) =>
  hass.callService(
    "zwave_js",
    "clear_credential",
    params as unknown as Record<string, unknown>,
    { device_id },
    false
  );

export const clearZwaveAllCredentials = (
  hass: HomeAssistant,
  device_id: string,
  user_index: number
) =>
  hass.callService(
    "zwave_js",
    "clear_all_credentials",
    { user_index },
    { device_id },
    false
  );

export const getZwaveCredentialStatus = (
  hass: HomeAssistant,
  device_id: string,
  params: GetZwaveCredentialStatusParams
): Promise<ZwaveCredentialStatus> =>
  callCredentialService<ZwaveCredentialStatus>(
    hass,
    "get_credential_status",
    device_id,
    params as unknown as Record<string, unknown>
  );
