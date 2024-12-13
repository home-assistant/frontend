import { TimeZone } from "../../data/translation";

const RESOLVED_TIME_ZONE = Intl.DateTimeFormat?.().resolvedOptions?.().timeZone;

// Browser time zone can be determined from Intl, with fallback to UTC for polyfill or no support.
export const LOCAL_TIME_ZONE = RESOLVED_TIME_ZONE ?? "UTC";

// Pick time zone based on user profile option.  Core zone is used when local cannot be determined.
export const resolveTimeZone = (option: TimeZone, serverTimeZone: string) =>
  option === TimeZone.local && RESOLVED_TIME_ZONE
    ? LOCAL_TIME_ZONE
    : serverTimeZone;
