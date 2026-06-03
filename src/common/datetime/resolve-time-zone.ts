import timezones from "google-timezones-json";
import { TimeZone } from "../../data/translation";

const RESOLVED_RAW = Intl.DateTimeFormat?.().resolvedOptions?.().timeZone;

// Some environments (e.g. Android emulator) return a UTC offset like "+00:00"
// instead of an IANA zone name. Only accept values that are known IANA zones,
// matching the list used by ha-timezone-picker.
const RESOLVED_TIME_ZONE =
  RESOLVED_RAW &&
  (RESOLVED_RAW === "UTC" ||
    RESOLVED_RAW === "Etc/UTC" ||
    RESOLVED_RAW in timezones)
    ? RESOLVED_RAW
    : undefined;

export const HAS_RESOLVED_IANA_TIME_ZONE = RESOLVED_TIME_ZONE !== undefined;

// Browser time zone can be determined from Intl, with fallback to UTC for polyfill or no support.
export const LOCAL_TIME_ZONE = RESOLVED_TIME_ZONE ?? "UTC";

// Pick time zone based on user profile option.  Core zone is used when local cannot be determined.
export const resolveTimeZone = (option: TimeZone, serverTimeZone: string) =>
  option === TimeZone.local && RESOLVED_TIME_ZONE
    ? LOCAL_TIME_ZONE
    : serverTimeZone;
