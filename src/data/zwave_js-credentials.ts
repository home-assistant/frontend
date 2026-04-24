import {
  mdiBluetooth,
  mdiCreditCardChip,
  mdiDialpad,
  mdiEye,
  mdiFaceRecognition,
  mdiFingerprint,
  mdiFormTextboxPassword,
  mdiHandBackRight,
  mdiKey,
  mdiNfc,
} from "@mdi/js";
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

export type EnterableZwaveCredentialType = "pin_code" | "password";

export const ENTERABLE_ZWAVE_CREDENTIAL_TYPES: readonly EnterableZwaveCredentialType[] =
  ["pin_code", "password"];

export const getZwaveCredentialTypeIcon = (type: string): string => {
  switch (type) {
    case "pin_code":
      return mdiDialpad;
    case "password":
      return mdiFormTextboxPassword;
    case "rfid_code":
    case "desfire":
      return mdiCreditCardChip;
    case "finger_biometric":
    case "unspecified_biometric":
      return mdiFingerprint;
    case "face_biometric":
      return mdiFaceRecognition;
    case "eye_biometric":
      return mdiEye;
    case "hand_biometric":
      return mdiHandBackRight;
    case "ble":
      return mdiBluetooth;
    case "nfc":
      return mdiNfc;
    default:
      return mdiKey;
  }
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
  supported_credential_types: Record<string, ZwaveCredentialTypeCapability>;
}

export interface ZwaveCredential {
  type: string;
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
  credential_type: string;
  credential_data: string;
  credential_slot?: number;
}

export interface SetZwaveCredentialResult {
  credential_slot: number;
  user_id: number;
}

export interface ClearZwaveCredentialParams {
  user_id: number;
  credential_type: string;
  credential_slot: number;
}

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
  return result.response![entity_id];
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
  // Response is keyed by entity_id for multi-target support.
  // notifyOnError=false — caller surfaces errors in-dialog instead.
  const result = await hass.callService<Record<string, SetZwaveUserResult>>(
    "zwave_js",
    "set_user",
    params,
    { entity_id },
    false,
    true
  );
  return result.response![entity_id];
};

export const clearZwaveUser = (
  hass: HomeAssistant,
  entity_id: string,
  user_id: number
) =>
  hass.callService("zwave_js", "clear_user", { user_id }, { entity_id }, false);

export const clearZwaveAllUsers = (hass: HomeAssistant, entity_id: string) =>
  hass.callService("zwave_js", "clear_all_users", {}, { entity_id }, false);

export const setZwaveCredential = async (
  hass: HomeAssistant,
  entity_id: string,
  params: SetZwaveCredentialParams
): Promise<SetZwaveCredentialResult> => {
  // set_credential supports multi-target; response is keyed by entity_id.
  // Frontend always passes a single lock entity, so unwrap.
  // notifyOnError=false — caller surfaces errors in-dialog instead.
  const result = await hass.callService<
    Record<string, SetZwaveCredentialResult>
  >("zwave_js", "set_credential", params, { entity_id }, false, true);
  return result.response![entity_id];
};

export const clearZwaveCredential = (
  hass: HomeAssistant,
  entity_id: string,
  params: ClearZwaveCredentialParams
) =>
  hass.callService(
    "zwave_js",
    "clear_credential",
    params,
    { entity_id },
    false
  );

export const clearZwaveAllCredentials = (
  hass: HomeAssistant,
  entity_id: string,
  user_id: number
) =>
  hass.callService(
    "zwave_js",
    "clear_all_credentials",
    { user_id },
    { entity_id },
    false
  );
