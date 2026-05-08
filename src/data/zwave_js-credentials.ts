import type { HomeAssistant } from "../types";

export type ZwaveCredentialType =
  | "pin_code"
  | "password"
  | "rfid_code"
  | "ble"
  | "nfc"
  | "uwb"
  | "eye_biometric"
  | "face_biometric"
  | "finger_biometric"
  | "hand_biometric"
  | "unspecified_biometric"
  | "desfire";

export const ENTERABLE_ZWAVE_CREDENTIAL_TYPES: readonly ZwaveCredentialType[] =
  ["pin_code", "password"];

// UI surfaces only general + disposable to stay aligned with Matter lock UX.
// Other types (programming, duress, non_access, remote_only, expiring) are
// defined in translations for display in existing-user rows, but are not
// selectable here.
export const SIMPLE_USER_TYPES: readonly string[] = ["general", "disposable"];

// Fallback bounds when a lock advertises an enterable type without
// per-type min/max — values mirror Z-Wave spec defaults.
export const DEFAULT_CREDENTIAL_MIN_LENGTH = 4;
export const DEFAULT_CREDENTIAL_MAX_LENGTH = 10;

export type CredentialErrorCode =
  | "required"
  | "length"
  | "pin_digits_only"
  | "";

export const enterableCredentialTypes = (
  capabilities: ZwaveCredentialCapabilities
): ZwaveCredentialType[] => {
  if (!capabilities.supported_credential_types) {
    return [];
  }
  return ENTERABLE_ZWAVE_CREDENTIAL_TYPES.filter(
    (type) => type in capabilities.supported_credential_types
  );
};

export const compatibleUserTypes = (
  capabilities: ZwaveCredentialCapabilities
): string[] => {
  const supported = capabilities.supported_user_types ?? [];
  return SIMPLE_USER_TYPES.filter((t) => supported.includes(t));
};

export const canAddZwaveUser = (
  capabilities: ZwaveCredentialCapabilities
): boolean =>
  enterableCredentialTypes(capabilities).length > 0 &&
  compatibleUserTypes(capabilities).length > 0;

export const getCredentialError = (
  data: string,
  type: ZwaveCredentialType | "",
  capability: ZwaveCredentialTypeCapability | undefined
): CredentialErrorCode => {
  if (!data) {
    return "required";
  }
  const minLength = capability?.min_length ?? DEFAULT_CREDENTIAL_MIN_LENGTH;
  const maxLength = capability?.max_length ?? DEFAULT_CREDENTIAL_MAX_LENGTH;
  if (data.length < minLength || data.length > maxLength) {
    return "length";
  }
  if (type === "pin_code" && !/^\d+$/.test(data)) {
    return "pin_digits_only";
  }
  return "";
};

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
  supported_credential_types: Partial<
    Record<ZwaveCredentialType, ZwaveCredentialTypeCapability>
  >;
}

export interface ZwaveCredential {
  type: ZwaveCredentialType;
  slot: number;
  data: string | null;
}

export interface ZwaveUser {
  user_id: number;
  user_name: string | null;
  active: boolean;
  user_type: string;
  credential_rule: string | null;
  credentials: ZwaveCredential[];
}

export interface ZwaveUsersResponse {
  max_users: number;
  users: ZwaveUser[];
}

export interface SetZwaveUserParams {
  user_id?: number;
  user_name?: string | null;
  user_type?: string;
  credential_rule?: string;
  active?: boolean;
}

export interface SetZwaveUserResult {
  user_id: number;
}

export interface SetZwaveCredentialParams {
  user_id: number;
  credential_type: ZwaveCredentialType;
  credential_data: string;
  credential_slot?: number;
}

export interface SetZwaveCredentialResult {
  credential_slot: number;
  user_id: number;
}

export interface DeleteZwaveCredentialParams {
  user_id: number;
  credential_type: ZwaveCredentialType;
  credential_slot: number;
}

// The Z-Wave services key their response by entity_id to support multi-target
// calls. The frontend only ever calls them with a single lock entity, so we
// expect exactly that key. Anything else (no response, mismatched key) is a
// backend contract violation — surface it as a localized error rather than
// letting `cannot read property of undefined` bubble up.
const unwrapEntityResponse = <T>(
  hass: HomeAssistant,
  response: Record<string, T> | undefined,
  entity_id: string
): T => {
  const value = response?.[entity_id];
  if (value === undefined) {
    throw new Error(
      hass.localize(
        "ui.panel.config.zwave_js.credentials.errors.empty_response"
      )
    );
  }
  return value;
};

const callCredentialService = async <T>(
  hass: HomeAssistant,
  service: string,
  entity_id: string,
  params: Record<string, unknown> = {}
): Promise<T> => {
  // notifyOnError=false — callers surface errors in-dialog instead.
  const result = await hass.callService<Record<string, T>>(
    "zwave_js",
    service,
    params,
    { entity_id },
    false,
    true
  );
  return unwrapEntityResponse(hass, result.response, entity_id);
};

export const getZwaveCredentialCapabilities = (
  hass: HomeAssistant,
  entity_id: string
): Promise<ZwaveCredentialCapabilities> =>
  callCredentialService<ZwaveCredentialCapabilities>(
    hass,
    "get_credential_capabilities",
    entity_id
  );

export const getZwaveUsers = (
  hass: HomeAssistant,
  entity_id: string
): Promise<ZwaveUsersResponse> =>
  callCredentialService<ZwaveUsersResponse>(hass, "get_users", entity_id);

export const setZwaveUser = async (
  hass: HomeAssistant,
  entity_id: string,
  params: SetZwaveUserParams
): Promise<SetZwaveUserResult> => {
  // notifyOnError=false — caller surfaces errors in-dialog instead.
  const result = await hass.callService<Record<string, SetZwaveUserResult>>(
    "zwave_js",
    "set_user",
    params,
    { entity_id },
    false,
    true
  );
  return unwrapEntityResponse(hass, result.response, entity_id);
};

export const deleteZwaveUser = (
  hass: HomeAssistant,
  entity_id: string,
  user_id: number
) =>
  hass.callService(
    "zwave_js",
    "delete_user",
    { user_id },
    { entity_id },
    false
  );

export const deleteZwaveAllUsers = (hass: HomeAssistant, entity_id: string) =>
  hass.callService("zwave_js", "delete_all_users", {}, { entity_id }, false);

export const setZwaveCredential = async (
  hass: HomeAssistant,
  entity_id: string,
  params: SetZwaveCredentialParams
): Promise<SetZwaveCredentialResult> => {
  // notifyOnError=false — caller surfaces errors in-dialog instead.
  const result = await hass.callService<
    Record<string, SetZwaveCredentialResult>
  >("zwave_js", "set_credential", params, { entity_id }, false, true);
  return unwrapEntityResponse(hass, result.response, entity_id);
};

export const deleteZwaveCredential = (
  hass: HomeAssistant,
  entity_id: string,
  params: DeleteZwaveCredentialParams
) =>
  hass.callService(
    "zwave_js",
    "delete_credential",
    params,
    { entity_id },
    false
  );
