import { timeZonesNames } from "@vvo/tzdb";
import { TimeZone } from "../../data/translation";

// Some environments (e.g. Android emulator) return a UTC offset like "+00:00"
// instead of an IANA zone name. Only accept values that are known IANA zones,
// matching the list used by ha-timezone-picker.
const isKnownTimeZone = (zone: string | undefined): zone is string =>
  !!zone &&
  (zone === "UTC" || zone === "Etc/UTC" || timeZonesNames.includes(zone));

// The FormatJS polyfill reports the canonical zone (Europe/Amsterdam becomes
// Europe/Brussels), so the name read before it loaded comes first. Its own
// name still covers old aliases the list lacks, like Asia/Calcutta.
const RESOLVED_TIME_ZONE = [
  globalThis.__haNativeTimeZone,
  Intl.DateTimeFormat?.().resolvedOptions?.().timeZone,
].find(isKnownTimeZone);

export const HAS_RESOLVED_IANA_TIME_ZONE = RESOLVED_TIME_ZONE !== undefined;

// Browser time zone can be determined from Intl, with fallback to UTC for polyfill or no support.
export const LOCAL_TIME_ZONE = RESOLVED_TIME_ZONE ?? "UTC";

// Pick time zone based on user profile option.  Core zone is used when local cannot be determined.
export const resolveTimeZone = (option: TimeZone, serverTimeZone: string) =>
  option === TimeZone.local && RESOLVED_TIME_ZONE
    ? LOCAL_TIME_ZONE
    : serverTimeZone;
