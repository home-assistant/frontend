// Approximates ICU: shares the parts both ends have in common and joins the
// rest with " – ". Only formatRangeToParts is added, so the FormatJS
// DateTimeFormat polyfill still loads where formatRange is missing.
if (!Intl.DateTimeFormat.prototype.formatRangeToParts) {
  const TIME_PARTS = ["hour", "minute", "second", "fractionalSecond"];
  const DATE_PARTS = ["era", "year", "month", "day", "weekday"];
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
      if (!start.some((part) => DATE_PARTS.includes(part.type))) {
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

      let head = 0;
      while (
        head < start.length &&
        head < end.length &&
        isSamePart(start[head], end[head])
      ) {
        head++;
      }
      if (head === start.length && head === end.length) {
        return tag(start, "shared");
      }

      let tail = 0;
      while (
        tail < start.length - head &&
        tail < end.length - head &&
        isSamePart(start[start.length - 1 - tail], end[end.length - 1 - tail])
      ) {
        tail++;
      }

      // Never split a clock time ("10:00 – 30")
      const timeIndexes = start
        .map((part, index) => (TIME_PARTS.includes(part.type) ? index : -1))
        .filter((index) => index !== -1);
      if (timeIndexes.length) {
        head = Math.min(head, timeIndexes[0]);
        tail = Math.min(
          tail,
          start.length - 1 - timeIndexes[timeIndexes.length - 1]
        );
      }
      while (head > 0 && start[head - 1].type !== "literal") {
        head--;
      }
      while (tail > 0 && start[start.length - tail].type !== "literal") {
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
