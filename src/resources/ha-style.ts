import { css, unsafeCSS } from "lit";
import { fontStyles } from "./roboto";
import {
  DEFAULT_ACCENT_COLOR,
  DEFAULT_PRIMARY_COLOR,
  derivedStyles,
} from "./styles-data";

const mainStyles = css`
  /*
    Home Assistant default styles.
  */
  html {
    /* typography */
    --ha-font-family-body: Roboto, Noto, sans-serif;
    --ha-font-family-code: monospace;
    --ha-font-family-longform: ui-sans-serif, system-ui, sans-serif;

    font-size: 14px;
    --ha-font-size-scale: 1;

    --ha-font-weight-light: 300;
    --ha-font-weight-normal: 400;
    --ha-font-weight-semibold: 500;
    --ha-font-weight-bold: 600;

    --ha-line-height-condensed: 1.2;
    --ha-line-height-normal: 1.6;
    --ha-line-height-expanded: 2;

    --ha-font-smoothing: antialiased;
    --ha-title-h2-white-space: nowrap;
    --ha-title-h2-overflow: hidden;
    --ha-title-h2-text-overflow: ellipsis;

    height: 100vh;

    /* text */
    --primary-text-color: #212121;
    --secondary-text-color: #727272;
    --text-primary-color: #ffffff;
    --text-light-primary-color: #212121;
    --disabled-text-color: #bdbdbd;

    /* main interface colors */
    --primary-color: ${unsafeCSS(DEFAULT_PRIMARY_COLOR)};
    --dark-primary-color: #0288d1;
    --light-primary-color: #b3e5fc;
    --accent-color: ${unsafeCSS(DEFAULT_ACCENT_COLOR)};
    --divider-color: rgba(0, 0, 0, 0.12);
    --outline-color: rgba(0, 0, 0, 0.12);
    --outline-hover-color: rgba(0, 0, 0, 0.24);

    --scrollbar-thumb-color: rgb(194, 194, 194);

    --error-color: #db4437;
    --warning-color: #ffa600;
    --success-color: #43a047;
    --info-color: #039be5;

    /* backgrounds */
    --card-background-color: #ffffff;
    --primary-background-color: #fafafa;
    --secondary-background-color: #e5e5e5; /* behind the cards on state */
    --clear-background-color: #ffffff;

    /* for header */
    --header-height: 56px;

    /* for label-badge */
    --label-badge-grey: #9e9e9e;

    /* states icon */
    --state-icon-color: #44739e;
    /* an error state is anything that would be considered an error */
    /* --state-icon-error-color: #db4437; derived from error-color */

    /* energy */
    --energy-grid-consumption-color: #488fc2;
    --energy-grid-return-color: #8353d1;
    --energy-solar-color: #ff9800;
    --energy-non-fossil-color: #0f9d58;
    --energy-battery-out-color: #4db6ac;
    --energy-battery-in-color: #f06292;
    --energy-gas-color: #8e021b;
    --energy-water-color: #00bcd4;

    /* opacity for dark text on a light background */
    --dark-divider-opacity: 0.12;
    --dark-disabled-opacity: 0.38; /* or hint text or icon */
    --dark-secondary-opacity: 0.54;
    --dark-primary-opacity: 0.87;

    /* opacity for light text on a dark background */
    --light-divider-opacity: 0.12;
    --light-disabled-opacity: 0.3; /* or hint text or icon */
    --light-secondary-opacity: 0.7;
    --light-primary-opacity: 1;

    /* rgb */
    --rgb-primary-color: 3, 169, 244;
    --rgb-accent-color: 255, 152, 0;
    --rgb-primary-text-color: 33, 33, 33;
    --rgb-secondary-text-color: 114, 114, 114;
    --rgb-text-primary-color: 255, 255, 255;
    --rgb-card-background-color: 255, 255, 255;

    /* color */
    --disabled-color: #bdbdbd;
    --red-color: #f44336;
    --pink-color: #e91e63;
    --purple-color: #926bc7;
    --deep-purple-color: #6e41ab;
    --indigo-color: #3f51b5;
    --blue-color: #2196f3;
    --light-blue-color: #03a9f4;
    --cyan-color: #00bcd4;
    --teal-color: #009688;
    --green-color: #4caf50;
    --light-green-color: #8bc34a;
    --lime-color: #cddc39;
    --yellow-color: #ffeb3b;
    --amber-color: #ffc107;
    --orange-color: #ff9800;
    --deep-orange-color: #ff6f22;
    --brown-color: #795548;
    --light-grey-color: #bdbdbd;
    --grey-color: #9e9e9e;
    --dark-grey-color: #606060;
    --blue-grey-color: #607d8b;
    --black-color: #000000;
    --white-color: #ffffff;

    /* history colors */
    --history-unavailable-color: transparent;

    /* input components */
    --input-idle-line-color: rgba(0, 0, 0, 0.42);
    --input-hover-line-color: rgba(0, 0, 0, 0.87);
    --input-disabled-line-color: rgba(0, 0, 0, 0.06);
    --input-outlined-idle-border-color: rgba(0, 0, 0, 0.38);
    --input-outlined-hover-border-color: rgba(0, 0, 0, 0.87);
    --input-outlined-disabled-border-color: rgba(0, 0, 0, 0.06);
    --input-fill-color: rgb(245, 245, 245);
    --input-disabled-fill-color: rgb(250, 250, 250);
    --input-ink-color: rgba(0, 0, 0, 0.87);
    --input-label-ink-color: rgba(0, 0, 0, 0.6);
    --input-disabled-ink-color: rgba(0, 0, 0, 0.37);
    --input-dropdown-icon-color: rgba(0, 0, 0, 0.54);

    direction: ltr;
    --direction: ltr;
    --float-start: left;
    --float-end: right;
    --margin-title-ltr: 0 0 0 24px;
    --margin-title-rtl: 0 24px 0 0;

    ${unsafeCSS(
      Object.entries(derivedStyles)
        .map(([key, value]) => `--${key}: ${value};`)
        .join("")
    )}
  }
`.toString();

const styleElement = document.createElement("style");
styleElement.textContent = [mainStyles, fontStyles].join("");
document.head.append(styleElement);
