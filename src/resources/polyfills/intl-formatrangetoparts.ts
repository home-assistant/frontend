// The FormatJS DateTimeFormat polyfill needs BigInt, so it can't load on
// Safari 12–13 and Chrome 59–66, and FullCalendar calls formatRangeToParts
// for every title. Approximates ICU: shares the larger units both ends have in
// common and joins the rest with " – ". Only formatRangeToParts is added, so
// FormatJS still loads where formatRange is missing.
if (!Intl.DateTimeFormat.prototype.formatRangeToParts) {
  // Largest unit first. Unknown fields, like timeZoneName, rank above all.
  const RANKS: Record<string, number> = {
    era: 0,
    relatedYear: 1,
    yearName: 1,
    year: 1,
    month: 2,
    weekday: 3,
    day: 3,
    dayPeriod: 4,
    hour: 5,
    minute: 6,
    second: 7,
    fractionalSecond: 8,
  };
  const rank = (type: string) => RANKS[type] ?? -1;
  const isDatePart = ({ type }: Intl.DateTimeFormatPart) =>
    rank(type) >= 0 && rank(type) <= RANKS.day;
  const isTimePart = ({ type }: Intl.DateTimeFormatPart) =>
    rank(type) > RANKS.day;
  const SEPARATOR: Intl.DateTimeRangeFormatPart = {
    type: "literal",
    value: " – ",
    source: "shared",
  };

  const tag = (
    parts: Intl.DateTimeFormatPart[],
    source: Intl.DateTimeRangeFormatPart["source"]
  ): Intl.DateTimeRangeFormatPart[] =>
    parts.map(({ type, value }) => ({ type, value, source }));

  // The literal a locale puts between a date and a time, like ", "
  const dateTimeGlue = (
    locale: string,
    timeZone: string
  ): Intl.DateTimeFormatPart => {
    const parts = new Intl.DateTimeFormat(locale, {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
    }).formatToParts(0);
    const before = parts[parts.findIndex((part) => part.type === "hour") - 1];
    return before?.type === "literal"
      ? before
      : { type: "literal", value: " " };
  };

  const isSamePart = (
    a: Intl.DateTimeFormatPart | undefined,
    b: Intl.DateTimeFormatPart | undefined
  ) => !!a && !!b && a.type === b.type && a.value === b.value;

  Object.defineProperty(Intl.DateTimeFormat.prototype, "formatRangeToParts", {
    configurable: true,
    writable: true,
    value: function formatRangeToParts(
      this: Intl.DateTimeFormat,
      startDate: Date | number,
      endDate: Date | number
    ): Intl.DateTimeRangeFormatPart[] {
      const start = this.formatToParts(startDate);
      const end = this.formatToParts(endDate);

      // Like ICU, a time-only range that crosses days shows both dates
      if (!start.some(isDatePart)) {
        const { locale, timeZone } = this.resolvedOptions();
        const dayFormat = new Intl.DateTimeFormat(locale, {
          timeZone,
          year: "numeric",
          month: "numeric",
          day: "numeric",
        });
        if (dayFormat.format(startDate) !== dayFormat.format(endDate)) {
          const glue = dateTimeGlue(locale, timeZone);
          return [
            ...tag(dayFormat.formatToParts(startDate), "startRange"),
            { ...glue, source: "startRange" },
            ...tag(start, "startRange"),
            SEPARATOR,
            ...tag(dayFormat.formatToParts(endDate), "endRange"),
            { ...glue, source: "endRange" },
            ...tag(end, "endRange"),
          ];
        }
      }

      const changed = (
        parts: Intl.DateTimeFormatPart[],
        others: Intl.DateTimeFormatPart[]
      ) =>
        parts.filter(
          (part) =>
            part.type !== "literal" &&
            !others.some((other) => isSamePart(part, other))
        );
      const largestChange = Math.min(
        ...[...changed(start, end), ...changed(end, start)].map(({ type }) =>
          rank(type)
        )
      );
      if (largestChange === Infinity) {
        return tag(start, "shared");
      }
      // Like ICU, a range across days that shows a time keeps both dates
      if (largestChange <= RANKS.day && start.some(isTimePart)) {
        return [
          ...tag(start, "startRange"),
          SEPARATOR,
          ...tag(end, "endRange"),
        ];
      }

      // Split only at a space or comma, so no end loses punctuation that
      // belongs to its own fields, like "3/10" or "8."
      const isShared = (index: number, endIndex: number) =>
        isSamePart(start[index], end[endIndex]) &&
        (start[index].type === "literal" ||
          rank(start[index].type) < largestChange);

      let head = 0;
      while (head < start.length && head < end.length && isShared(head, head)) {
        head++;
      }
      while (
        head > 0 &&
        !(
          start[head - 1].type === "literal" &&
          /\s$/.test(start[head - 1].value)
        )
      ) {
        head--;
      }

      let tail = 0;
      while (
        tail < start.length - head &&
        tail < end.length - head &&
        isShared(start.length - 1 - tail, end.length - 1 - tail)
      ) {
        tail++;
      }
      while (
        tail > 0 &&
        !(
          start[start.length - tail].type === "literal" &&
          /^[\s,]/.test(start[start.length - tail].value)
        )
      ) {
        tail--;
      }

      return [
        ...tag(start.slice(0, head), "shared"),
        ...tag(start.slice(head, start.length - tail), "startRange"),
        SEPARATOR,
        ...tag(end.slice(head, end.length - tail), "endRange"),
        ...tag(start.slice(start.length - tail), "shared"),
      ];
    },
  });
}

export {};
