import type { FrontendLocaleData } from "../../data/translation";
import type { HassConfig } from "home-assistant-js-websocket";

import { addMonths, startOfYear } from "date-fns";
import memoizeOne from "memoize-one";

import { formatDateMonth } from "../datetime/format_date";

export const monthNames = memoizeOne(
  (locale: FrontendLocaleData, config: HassConfig): string[] =>
    Array.from({ length: 12 }, (_, m) =>
      formatDateMonth(addMonths(startOfYear(new Date()), m), locale, config)
    )
);
