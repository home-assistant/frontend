import { formatDateTimeWithSeconds } from "../../../common/datetime/format_date_time";

import { formatTimeWithSeconds } from "../../../common/datetime/format_time";

export const formatSystemLogTime = (date, language: string) => {
  const today = new Date().setHours(0, 0, 0, 0);
  const dateTime = new Date(date * 1000);
  const dateTimeDay = new Date(date * 1000).setHours(0, 0, 0, 0);

  return dateTimeDay < today
    ? formatDateTimeWithSeconds(dateTime, language)
    : formatTimeWithSeconds(dateTime, language);
};
