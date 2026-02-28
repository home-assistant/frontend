import type { HomeAssistant } from "../types";

export interface MatterLockInfo {
  supports_user_management: boolean;
  supported_credential_types: string[];
  max_users: number | null;
  max_pin_users: number | null;
  max_rfid_users: number | null;
  max_credentials_per_user: number | null;
  min_pin_length: number | null;
  max_pin_length: number | null;
  min_rfid_length: number | null;
  max_rfid_length: number | null;
}

export type MatterLockCredentialType =
  | "pin"
  | "rfid"
  | "fingerprint"
  | "finger_vein"
  | "face";

export type MatterLockUserType =
  | "unrestricted_user"
  | "year_day_schedule_user"
  | "week_day_schedule_user"
  | "programming_user"
  | "non_access_user"
  | "forced_user"
  | "disposable_user"
  | "expiring_user"
  | "schedule_restricted_user"
  | "remote_only_user";

export type MatterLockUserStatus =
  | "available"
  | "occupied_enabled"
  | "occupied_disabled";

export type MatterLockCredentialRule = "single" | "dual" | "tri";

export interface MatterLockCredentialRef {
  type: string;
  index: number | null;
}

export interface MatterLockUser {
  user_index: number | null;
  user_name: string | null;
  user_unique_id: number | null;
  user_status: MatterLockUserStatus;
  user_type: MatterLockUserType;
  credential_rule: MatterLockCredentialRule;
  credentials: MatterLockCredentialRef[];
  next_user_index: number | null;
}

export interface MatterLockUsersResponse {
  max_users: number;
  users: MatterLockUser[];
}

export interface SetMatterLockUserParams {
  user_index?: number;
  user_name?: string | null;
  user_type?: MatterLockUserType;
  credential_rule?: MatterLockCredentialRule;
}

export interface SetMatterLockCredentialParams {
  credential_type: MatterLockCredentialType;
  credential_data: string;
  credential_index?: number | null;
  user_index?: number | null;
  user_status?: MatterLockUserStatus;
  user_type?: MatterLockUserType;
}

export interface SetMatterLockCredentialResult {
  credential_index: number;
  user_index: number | null;
  next_credential_index: number | null;
}

export interface GetMatterLockCredentialStatusResult {
  credential_exists: boolean;
  user_index: number | null;
  next_credential_index: number | null;
}

export const getMatterLockInfo = async (
  hass: HomeAssistant,
  entity_id: string
): Promise<MatterLockInfo> => {
  const result = await hass.callService<MatterLockInfo>(
    "matter",
    "get_lock_info",
    {},
    { entity_id },
    true,
    true
  );
  return result.response!;
};

export const getMatterLockUsers = async (
  hass: HomeAssistant,
  entity_id: string
): Promise<MatterLockUsersResponse> => {
  const result = await hass.callService<MatterLockUsersResponse>(
    "matter",
    "get_lock_users",
    {},
    { entity_id },
    true,
    true
  );
  return result.response!;
};

export const setMatterLockUser = (
  hass: HomeAssistant,
  entity_id: string,
  params: SetMatterLockUserParams
) => hass.callService("matter", "set_lock_user", params, { entity_id });

export const clearMatterLockUser = (
  hass: HomeAssistant,
  entity_id: string,
  user_index: number
) =>
  hass.callService("matter", "clear_lock_user", { user_index }, { entity_id });

export const setMatterLockCredential = async (
  hass: HomeAssistant,
  entity_id: string,
  params: SetMatterLockCredentialParams
): Promise<SetMatterLockCredentialResult> => {
  const result = await hass.callService<SetMatterLockCredentialResult>(
    "matter",
    "set_lock_credential",
    params,
    { entity_id },
    true,
    true
  );
  return result.response!;
};
