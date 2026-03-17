import { css } from "lit";

export const datePickerStyles = css`
  calendar-date,
  calendar-date {
    width: 100%;
  }
  calendar-date::part(button),
  calendar-range::part(button) {
    border: none;
    background-color: unset;
    border-radius: var(--ha-border-radius-circle);
    outline-offset: -2px;
    outline-color: var(--ha-color-neutral-60);
  }

  calendar-month {
    width: 100%;
    margin: 0 auto;
    min-height: calc(42px * 7);
  }

  calendar-month::part(heading) {
    display: none;
  }
  calendar-month::part(day) {
    color: var(--disabled-text-color);
    font-size: var(--ha-font-size-m);
    font-family: var(--ha-font-body);
  }
  calendar-month::part(button) {
    color: var(--primary-text-color);
    height: 32px;
    width: 32px;
    margin: var(--ha-space-1);
    border-radius: var(--ha-border-radius-circle);
  }
  calendar-month::part(button):focus-visible {
    background-color: inherit;
    outline: 2px solid var(--accent-color);
    outline-offset: 2px;
  }
  calendar-month::part(button):hover {
    background-color: var(--ha-color-fill-primary-quiet-hover);
  }
  calendar-month::part(today) {
    color: var(--primary-color);
  }
  calendar-month::part(range-inner),
  calendar-month::part(range-start),
  calendar-month::part(range-end),
  calendar-month::part(selected),
  calendar-month::part(selected):hover {
    color: var(--text-primary-color);
    background-color: var(--primary-color);
    height: 40px;
    width: 40px;
    margin: 0;
  }
  calendar-month::part(selected):focus-visible {
    background-color: var(--primary-color);
    color: var(--text-primary-color);
  }

  calendar-month::part(outside) {
    cursor: pointer;
  }

  .heading {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    font-size: var(--ha-font-size-m);
    font-weight: var(--ha-font-weight-medium);
  }
  .month-year {
    flex: 1;
    text-align: center;
    margin-left: 48px;
  }

  @media only screen and (max-width: 500px) {
    calendar-month {
      min-height: calc(34px * 7);
    }
    calendar-month::part(day) {
      font-size: var(--ha-font-size-s);
    }
    calendar-month::part(button) {
      height: 26px;
      width: 26px;
    }
    calendar-month::part(range-inner),
    calendar-month::part(range-start),
    calendar-month::part(range-end),
    calendar-month::part(selected),
    calendar-month::part(selected):hover {
      height: 34px;
      width: 34px;
    }
    .heading {
      font-size: var(--ha-font-size-s);
    }
    .month-year {
      margin-left: 40px;
    }
  }
`;

export const dateRangePickerStyles = css`
  calendar-month::part(selected):focus-visible {
    background-color: var(--primary-color);
    color: var(--text-primary-color);
  }
  calendar-month::part(range-inner),
  calendar-month::part(range-start),
  calendar-month::part(range-end),
  calendar-month::part(range-inner):hover,
  calendar-month::part(range-start):hover,
  calendar-month::part(range-end):hover {
    color: var(--text-primary-color);
    background-color: var(--primary-color);
    border-radius: var(--ha-border-radius-square);
    display: block;
    margin: 0;
  }
  calendar-month::part(range-start),
  calendar-month::part(range-start):hover {
    border-top-left-radius: var(--ha-border-radius-circle);
    border-bottom-left-radius: var(--ha-border-radius-circle);
  }
  calendar-month::part(range-end),
  calendar-month::part(range-end):hover {
    border-top-right-radius: var(--ha-border-radius-circle);
    border-bottom-right-radius: var(--ha-border-radius-circle);
  }
  calendar-month::part(range-start):hover,
  calendar-month::part(range-end):hover,
  calendar-month::part(range-inner):hover {
    color: var(--primary-text-color);
  }
`;

export const singleDatePickerStyles = css`
  calendar-month::part(selected),
  calendar-month::part(selected):hover {
    color: var(--text-primary-color);
    background-color: var(--primary-color);
    height: 40px;
    width: 40px;
    margin: 0;
  }
  calendar-month::part(selected):focus-visible {
    background-color: var(--primary-color);
    color: var(--text-primary-color);
  }
`;
