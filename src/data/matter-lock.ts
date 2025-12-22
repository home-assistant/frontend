import type { HomeAssistant } from "../types";

// Lock info with full capabilities
export interface MatterLockInfo {
  supports_user_management: boolean;
  supported_credential_types: string[];
  max_users: number;
  max_credentials_per_user: number;
  min_pin_length: number;
  max_pin_length: number;
  min_rfid_length?: number;
  max_rfid_length?: number;
  supports_week_day_schedules: boolean;
  supports_year_day_schedules: boolean;
  supports_holiday_schedules: boolean;
  max_week_day_schedules_per_user: number;
  max_year_day_schedules_per_user: number;
  max_holiday_schedules: number;
}

// Credential types
export type MatterLockCredentialType =
  | "pin"
  | "rfid"
  | "fingerprint"
  | "finger_vein"
  | "face"
  | "aliro_credential"
  | "aliro_evictable"
  | "aliro_non_evictable";

// User types
export type MatterLockUserType =
  | "unrestricted"
  | "year_day"
  | "week_day"
  | "programming"
  | "non_access"
  | "forced"
  | "disposable"
  | "expiring";

// User status
export type MatterLockUserStatus =
  | "available"
  | "occupied_enabled"
  | "occupied_disabled";

// Credential rule
export type MatterLockCredentialRule = "single" | "dual" | "tri";

// Schedule status
export type MatterScheduleStatus = "available" | "occupied";

// Holiday operating modes
export type MatterHolidayOperatingMode =
  | "normal"
  | "vacation"
  | "privacy"
  | "no_remote_lock_unlock"
  | "passage";

// Credential reference
export interface MatterLockCredentialRef {
  credential_type: MatterLockCredentialType;
  credential_index: number;
}

// User management
export interface MatterLockUser {
  user_index: number;
  user_name: string | null;
  user_status: MatterLockUserStatus;
  user_type: MatterLockUserType;
  credential_rule: MatterLockCredentialRule;
  credentials: MatterLockCredentialRef[];
}

// Week day schedule
export interface MatterWeekDaySchedule {
  week_day_index: number;
  user_index: number;
  status: MatterScheduleStatus;
  days_mask: number;
  days: string[];
  start_hour: number;
  start_minute: number;
  end_hour: number;
  end_minute: number;
}

// Year day schedule
export interface MatterYearDaySchedule {
  year_day_index: number;
  user_index: number;
  status: MatterScheduleStatus;
  local_start_time: number;
  local_end_time: number;
}

// Holiday schedule
export interface MatterHolidaySchedule {
  holiday_index: number;
  status: MatterScheduleStatus;
  local_start_time: number;
  local_end_time: number;
  operating_mode: MatterHolidayOperatingMode;
}

// Set user params
export interface SetMatterLockUserParams {
  user_index: number | null;
  user_name: string | null;
  user_status: MatterLockUserStatus;
  user_type: MatterLockUserType;
  credential_rule: MatterLockCredentialRule;
}

// Set credential params
export interface SetMatterLockCredentialParams {
  user_index: number | null;
  credential_type: MatterLockCredentialType;
  credential_index: number | null;
  credential_data: string;
  // Optional: for creating a new user along with the credential
  user_name?: string;
  user_type?: string;
}

// Set credential result
export interface SetMatterLockCredentialResult {
  status: string;
  user_index: number;
  credential_index: number;
  next_credential_index: number | null;
}

// Set week day schedule params
export interface SetMatterWeekDayScheduleParams {
  week_day_index: number;
  user_index: number;
  days_mask: number;
  start_hour: number;
  start_minute: number;
  end_hour: number;
  end_minute: number;
}

// Set year day schedule params
export interface SetMatterYearDayScheduleParams {
  year_day_index: number;
  user_index: number;
  local_start_time: number;
  local_end_time: number;
}

// Set holiday schedule params
export interface SetMatterHolidayScheduleParams {
  holiday_index: number;
  local_start_time: number;
  local_end_time: number;
  operating_mode: MatterHolidayOperatingMode;
}

// Lock event
export interface MatterLockEvent {
  event_type: string;
  timestamp: string;
  data: Record<string, unknown>;
}

// Day bits for week day schedules
export const WEEK_DAY_BITS = {
  sunday: 0x01,
  monday: 0x02,
  tuesday: 0x04,
  wednesday: 0x08,
  thursday: 0x10,
  friday: 0x20,
  saturday: 0x40,
} as const;

// Helper to convert days mask to array of day names
export const daysFromMask = (mask: number): string[] => {
  const days: string[] = [];
  // eslint-disable-next-line no-bitwise
  if (mask & WEEK_DAY_BITS.sunday) days.push("sunday");
  // eslint-disable-next-line no-bitwise
  if (mask & WEEK_DAY_BITS.monday) days.push("monday");
  // eslint-disable-next-line no-bitwise
  if (mask & WEEK_DAY_BITS.tuesday) days.push("tuesday");
  // eslint-disable-next-line no-bitwise
  if (mask & WEEK_DAY_BITS.wednesday) days.push("wednesday");
  // eslint-disable-next-line no-bitwise
  if (mask & WEEK_DAY_BITS.thursday) days.push("thursday");
  // eslint-disable-next-line no-bitwise
  if (mask & WEEK_DAY_BITS.friday) days.push("friday");
  // eslint-disable-next-line no-bitwise
  if (mask & WEEK_DAY_BITS.saturday) days.push("saturday");
  return days;
};

// Helper to convert array of day names to mask
export const maskFromDays = (days: string[]): number => {
  let mask = 0;
  for (const day of days) {
    const bit = WEEK_DAY_BITS[day as keyof typeof WEEK_DAY_BITS];
    if (bit) {
      // eslint-disable-next-line no-bitwise
      mask |= bit;
    }
  }
  return mask;
};

// Lock info API
export const getMatterLockInfo = (
  hass: HomeAssistant,
  device_id: string
): Promise<MatterLockInfo> =>
  hass.callWS({
    type: "matter/lock/get_lock_info",
    device_id,
  });

// Users API
export const getMatterLockUsers = (
  hass: HomeAssistant,
  device_id: string
): Promise<MatterLockUser[]> =>
  hass.callWS({
    type: "matter/lock/get_users",
    device_id,
  });

export const setMatterLockUser = (
  hass: HomeAssistant,
  device_id: string,
  params: SetMatterLockUserParams
): Promise<void> =>
  hass.callWS({
    type: "matter/lock/set_user",
    device_id,
    ...params,
  });

export const clearMatterLockUser = (
  hass: HomeAssistant,
  device_id: string,
  user_index: number
): Promise<void> =>
  hass.callWS({
    type: "matter/lock/clear_user",
    device_id,
    user_index,
  });

// Credentials API
export const getMatterLockCredential = (
  hass: HomeAssistant,
  device_id: string,
  user_index: number,
  credential_type: MatterLockCredentialType,
  credential_index: number
): Promise<MatterLockCredentialRef> =>
  hass.callWS({
    type: "matter/lock/get_credential",
    device_id,
    user_index,
    credential_type,
    credential_index,
  });

export const setMatterLockCredential = (
  hass: HomeAssistant,
  device_id: string,
  params: SetMatterLockCredentialParams
): Promise<SetMatterLockCredentialResult> =>
  hass.callWS({
    type: "matter/lock/set_credential",
    device_id,
    ...params,
  });

export const clearMatterLockCredential = (
  hass: HomeAssistant,
  device_id: string,
  user_index: number,
  credential_type: MatterLockCredentialType,
  credential_index: number
): Promise<void> =>
  hass.callWS({
    type: "matter/lock/clear_credential",
    device_id,
    user_index,
    credential_type,
    credential_index,
  });

// Week day schedules API
export const getMatterLockWeekDaySchedule = (
  hass: HomeAssistant,
  device_id: string,
  week_day_index: number,
  user_index: number
): Promise<MatterWeekDaySchedule> =>
  hass.callWS({
    type: "matter/lock/get_week_day_schedule",
    device_id,
    week_day_index,
    user_index,
  });

export const setMatterLockWeekDaySchedule = (
  hass: HomeAssistant,
  device_id: string,
  params: SetMatterWeekDayScheduleParams
): Promise<void> =>
  hass.callWS({
    type: "matter/lock/set_week_day_schedule",
    device_id,
    ...params,
  });

export const clearMatterLockWeekDaySchedule = (
  hass: HomeAssistant,
  device_id: string,
  week_day_index: number,
  user_index: number
): Promise<void> =>
  hass.callWS({
    type: "matter/lock/clear_week_day_schedule",
    device_id,
    week_day_index,
    user_index,
  });

// Year day schedules API
export const getMatterLockYearDaySchedule = (
  hass: HomeAssistant,
  device_id: string,
  year_day_index: number,
  user_index: number
): Promise<MatterYearDaySchedule> =>
  hass.callWS({
    type: "matter/lock/get_year_day_schedule",
    device_id,
    year_day_index,
    user_index,
  });

export const setMatterLockYearDaySchedule = (
  hass: HomeAssistant,
  device_id: string,
  params: SetMatterYearDayScheduleParams
): Promise<void> =>
  hass.callWS({
    type: "matter/lock/set_year_day_schedule",
    device_id,
    ...params,
  });

export const clearMatterLockYearDaySchedule = (
  hass: HomeAssistant,
  device_id: string,
  year_day_index: number,
  user_index: number
): Promise<void> =>
  hass.callWS({
    type: "matter/lock/clear_year_day_schedule",
    device_id,
    year_day_index,
    user_index,
  });

// Holiday schedules API
export const getMatterLockHolidaySchedule = (
  hass: HomeAssistant,
  device_id: string,
  holiday_index: number
): Promise<MatterHolidaySchedule> =>
  hass.callWS({
    type: "matter/lock/get_holiday_schedule",
    device_id,
    holiday_index,
  });

export const setMatterLockHolidaySchedule = (
  hass: HomeAssistant,
  device_id: string,
  params: SetMatterHolidayScheduleParams
): Promise<void> =>
  hass.callWS({
    type: "matter/lock/set_holiday_schedule",
    device_id,
    ...params,
  });

export const clearMatterLockHolidaySchedule = (
  hass: HomeAssistant,
  device_id: string,
  holiday_index: number
): Promise<void> =>
  hass.callWS({
    type: "matter/lock/clear_holiday_schedule",
    device_id,
    holiday_index,
  });
