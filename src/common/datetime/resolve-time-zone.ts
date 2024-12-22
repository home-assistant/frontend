import { TimeZone } from "../../data/translation";

// Browser  time zone can be determined from Intl, with fallback to UTC for polyfill or no support.
// Alternatively, we could fallback to a fixed offset IANA zone (e.g. "Etc/GMT+5") using
// Date.prototype.getTimeOffset(), but IANA only has whole hour Etc zones, and problems
// might occur with relative time due to DST.
// Use optional chain instead of polyfill import since polyfill will always return UTC
export const LOCAL_TIME_ZONE =
  Intl.DateTimeFormat?.().resolvedOptions?.().timeZone ?? "UTC";

// Pick time zone based on user profile option.  Core zone is used when local cannot be determined.
export const resolveTimeZone = (option: TimeZone, serverTimeZone: string) =>
  option === TimeZone.local && LOCAL_TIME_ZONE !== "UTC"
    ? LOCAL_TIME_ZONE
    : serverTimeZone;
