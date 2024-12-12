import {
  addMonths,
  differenceInMilliseconds,
  addMilliseconds,
  subMilliseconds,
  roundToNearestHours,
  isFirstDayOfMonth,
  isLastDayOfMonth,
  subMonths,
  differenceInMonths,
} from "date-fns";

export function handleNext(startDate: Date, endDate: Date): [Date, Date] {
  let dateRange: [Date, Date];
  if (isFirstDayOfMonth(startDate) && isLastDayOfMonth(endDate)) {
    dateRange = [
      roundToNearestHours(endDate),
      subMilliseconds(
        addMonths(
          roundToNearestHours(endDate),
          differenceInMonths(addMilliseconds(endDate, 1), startDate)
        ),
        1
      ),
    ];
  } else {
    dateRange = [
      roundToNearestHours(endDate),
      subMilliseconds(
        roundToNearestHours(
          addMilliseconds(
            endDate,
            Math.max(3600000, differenceInMilliseconds(endDate, startDate))
          )
        ),
        1
      ),
    ];
  }
  return dateRange;
}

export function handlePrev(startDate: Date, endDate: Date): [Date, Date] {
  let dateRange: [Date, Date];
  if (isFirstDayOfMonth(startDate) && isLastDayOfMonth(endDate)) {
    dateRange = [
      subMonths(
        startDate,
        differenceInMonths(addMilliseconds(endDate, 1), startDate)
      ),
      subMilliseconds(roundToNearestHours(startDate), 1),
    ];
  } else {
    dateRange = [
      roundToNearestHours(
        subMilliseconds(
          startDate,
          Math.max(3600000, differenceInMilliseconds(endDate, startDate))
        )
      ),
      subMilliseconds(roundToNearestHours(startDate), 1),
    ];
  }
  return dateRange;
}
