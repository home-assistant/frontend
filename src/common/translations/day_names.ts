import { addDays, startOfWeek } from "date-fns";
import memoizeOne from "memoize-one";
import { FrontendLocaleData } from "../../data/translation";
import { formatDateWeekday } from "../datetime/format_date";

export const dayNames = memoizeOne((locale: FrontendLocaleData): string[] =>
  [...Array(7).keys()].map((d) =>
    formatDateWeekday(addDays(startOfWeek(new Date()), d), locale)
  )
);
