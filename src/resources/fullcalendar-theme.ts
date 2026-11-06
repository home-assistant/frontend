import type { PluginInput } from "fullcalendar";
import classicThemePlugin from "fullcalendar/themes/classic";
import { css } from "lit";
import { fullCalendarBaseStyles } from "./fullcalendar-base-styles";

// The classic theme plus the class hooks that fullCalendarStyles styles
export const fullCalendarTheme: PluginInput = {
  name: "theme-home-assistant",
  deps: [classicThemePlugin],
  optionDefaults: {
    viewClass: "ha-fc-view",
    tableHeaderClass: "ha-fc-table-header",
    dayHeaderInnerClass: ({ inPopover }) =>
      inPopover ? "" : "ha-fc-day-header-inner",
  },
};

export const fullCalendarStyles = [
  ...fullCalendarBaseStyles,
  css`
    /* FullCalendar declares these on :root, which a shadow root never
       matches. Its popover and drag mirror sit outside the calendar element,
       so they go on the host. */
    :host {
      --fc-sticky-header-footer-z: 3;
      --fc-popover-z: 4;
      --fc-classic-primary: var(--primary-color);
      --fc-classic-primary-foreground: var(--text-primary-color);
      --fc-classic-event: #3788d8;
      --fc-classic-event-contrast: #fff;
      --fc-classic-background-event: var(--primary-color);
      --fc-classic-background-event-opacity: 15%;
      --fc-classic-background-event-foreground-opacity: 50%;
      --fc-classic-highlight: rgba(188, 232, 241, 0.3);
      --fc-classic-today: rgba(255, 220, 40, 0.15);
      --fc-classic-now: var(--error-color);
      --fc-classic-small-dot-width: 8px;
      --fc-classic-large-dot-width: 10px;
      --fc-classic-background: var(
        --ha-card-background,
        var(--card-background-color, white)
      );
      --fc-classic-faint: rgba(var(--rgb-primary-text-color), 0.04);
      --fc-classic-muted: rgba(var(--rgb-primary-text-color), 0.08);
      --fc-classic-strong: rgba(var(--rgb-primary-text-color), 0.14);
      --fc-classic-foreground: var(--primary-text-color);
      --fc-classic-faint-foreground: var(--disabled-text-color);
      --fc-classic-muted-foreground: var(--secondary-text-color);
      --fc-classic-border: var(--divider-color);
      --fc-classic-strong-border: var(--divider-color);
    }

    .ha-fc-view {
      border-width: var(--calendar-border-width, 1px);
      border-radius: var(--calendar-border-radius, var(--mdc-shape-small, 4px));
      overflow: clip;
    }

    .ha-fc-view * {
      scrollbar-color: var(--scrollbar-thumb-color) transparent;
      scrollbar-width: thin;
    }

    .ha-fc-view *::-webkit-scrollbar {
      width: 0.4rem;
      height: 0.4rem;
    }

    .ha-fc-view *::-webkit-scrollbar-thumb {
      border-radius: var(--ha-border-radius-sm);
      background: var(--scrollbar-thumb-color);
    }

    /* Sticky with an automatic height, so the header color needs an opaque
       background below it */
    .ha-fc-table-header {
      background: linear-gradient(
          var(--table-header-background-color),
          var(--table-header-background-color)
        )
        var(--fc-classic-background);
    }

    .ha-fc-day-header-inner {
      font-size: var(--ha-font-size-xs);
      font-weight: var(--ha-font-weight-bold);
      text-transform: uppercase;
    }

    /* Margins instead of flex gap, which needs Safari 14.1 and Chrome 84 */
    .ha-fc-list-event {
      gap: 0;
    }

    .ha-fc-list-event > .ha-fc-dot {
      margin-inline: 12px;
    }
  `,
];
