import { addMonths, startOfYear } from "date-fns";
import memoizeOne from "memoize-one";
import { FrontendLocaleData } from "../../data/translation";
import { formatDateMonth } from "../datetime/format_date";

export const monthNames = memoizeOne((locale: FrontendLocaleData): string[] =>
  Array.from({ length: 12 }, (_, m) =>
    formatDateMonth(addMonths(startOfYear(new Date()), m), locale)
  )
);
