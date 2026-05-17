import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html } from "lit";
import memoizeOne from "memoize-one";
import { useAmPm } from "../../../../common/datetime/use_am_pm";
import type { FrontendLocaleData } from "../../../../data/translation";
import { MS_PER_HOUR } from "./forecast";

export const LABEL_HEIGHT = 10;
export const LABEL_GAP = 2;

const narrowWeekdayFormatter = memoizeOne(
  (language: string) => new Intl.DateTimeFormat(language, { weekday: "narrow" })
);

const hourFormatter = memoizeOne(
  (language: string, amPm: boolean) =>
    new Intl.DateTimeFormat(language, {
      hour: "numeric",
      hourCycle: amPm ? "h12" : "h23",
    })
);

export const renderDayLabels = (
  entries: { datetime: string }[],
  step: number,
  locale: FrontendLocaleData
): TemplateResult => {
  const formatter = narrowWeekdayFormatter(locale.language);
  const labels: string[] = [];
  for (let i = 0; i < entries.length; i += step) {
    labels.push(formatter.format(new Date(entries[i].datetime)));
  }
  return html`
    <div class="day-labels">
      ${labels.map((label) => html`<div class="day-label">${label}</div>`)}
    </div>
  `;
};

export const renderHourLabels = (
  hoursToShow: number,
  locale: FrontendLocaleData
): TemplateResult => {
  const formatter = hourFormatter(locale.language, useAmPm(locale));
  const now = Date.now();
  const maxTime =
    Math.floor((now + hoursToShow * MS_PER_HOUR) / MS_PER_HOUR) * MS_PER_HOUR;
  const step = Math.max(1, Math.round(hoursToShow / 4));
  const labels: string[] = [];
  for (let h = 0; h <= hoursToShow; h += step) {
    const t = now + h * MS_PER_HOUR;
    if (t > maxTime) break;
    labels.push(formatter.format(new Date(t)));
  }
  return html`
    <div class="hour-labels">
      ${labels.map((label) => html`<div class="hour-label">${label}</div>`)}
    </div>
  `;
};

export const graphLabelsStyles: CSSResultGroup = css`
  .day-labels,
  .hour-labels {
    display: flex;
    align-items: center;
    height: 10px;
    color: var(--secondary-text-color);
    font-size: 9px;
    line-height: 1;
  }

  .hour-labels {
    justify-content: space-between;
  }

  .day-label {
    flex: 1;
    text-align: center;
  }
`;
