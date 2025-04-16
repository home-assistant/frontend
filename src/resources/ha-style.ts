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
    --ha-font-family-heading: var(--ha-font-family-body);
    --ha-font-family-code: "Roboto Mono", Consolas, Menlo, monospace;
    --ha-font-family-longform: ui-sans-serif, system-ui, sans-serif;

    font-size: 14px;
    --ha-font-size-scale: 1;
    --ha-font-size-2xs: calc(0.786rem * var(--ha-font-size-scale)); /* ~11px */
    --ha-font-size-xs: calc(0.857rem * var(--ha-font-size-scale)); /* ~12px */
    --ha-font-size-s: calc(1rem * var(--ha-font-size-scale)); /* 14px */
    --ha-font-size-m: calc(1.143rem * var(--ha-font-size-scale)); /* ~16px */
    --ha-font-size-l: calc(1.429rem * var(--ha-font-size-scale)); /* ~20px */
    --ha-font-size-xl: calc(1.857rem * var(--ha-font-size-scale)); /* ~26px */
    --ha-font-size-2xl: calc(2.286rem * var(--ha-font-size-scale)); /* ~32px */
    --ha-font-size-3xl: calc(2.929rem * var(--ha-font-size-scale)); /* ~41px */
    --ha-font-size-4xl: calc(3.714rem * var(--ha-font-size-scale)); /* ~52px */

    --ha-font-weight-light: 300;
    --ha-font-weight-normal: 400;
    --ha-font-weight-semibold: 500;
    --ha-font-weight-bold: 600;

    --ha-font-weight-body: var(--ha-font-weight-normal);
    --ha-font-weight-heading: var(--ha-font-weight-bold);
    --ha-font-weight-action: var(--ha-font-weight-semibold);

    --ha-line-height-condensed: 1.2;
    --ha-line-height-normal: 1.6;
    --ha-line-height-expanded: 2;

    /* support existing typography */
    --code-font-family: var(--ha-font-family-code);

    /* Vaadin typography */
    --material-h6-font-size: var(--ha-font-size-m);
    --material-small-font-size: var(--ha-font-size-xs);
    --material-caption-font-size: var(--ha-font-size-2xs);
    --material-button-font-size: var(--ha-font-size-xs);

    /* Paper typography Styles */
    --paper-font-common-base_-_font-family: var(--ha-font-family-body);
    --paper-font-common-base_-_-webkit-font-smoothing: antialiased;
    --paper-font-common-code_-_font-family: var(--ha-font-family-code);
    --paper-font-common-code_-_-webkit-font-smoothing: antialiased;
    --paper-font-common-nowrap_-_white-space: nowrap;
    --paper-font-common-nowrap_-_overflow: hidden;
    --paper-font-common-nowrap_-_text-overflow: ellipsis;

    --paper-font-display1_-_font-family: var(
      --paper-font-common-base_-_font-family
    );
    --paper-font-display1_-_-webkit-font-smoothing: var(
      --paper-font-common-base_-_-webkit-font-smoothing
    );
    --paper-font-display1_-_font-size: var(--ha-font-size-2xl);
    --paper-font-display1_-_font-weight: var(--ha-font-weight-normal);
    --paper-font-display1_-_letter-spacing: -0.01em;
    --paper-font-display1_-_line-height: var(--ha-line-height-condensed);

    --paper-font-headline_-_font-family: var(
      --paper-font-common-base_-_font-family
    );
    --paper-font-headline_-_-webkit-font-smoothing: var(
      --paper-font-common-base_-_-webkit-font-smoothing
    );
    --paper-font-headline_-_font-size: var(--ha-font-size-xl);
    --paper-font-headline_-_font-weight: var(--ha-font-weight-normal);
    --paper-font-headline_-_letter-spacing: -0.012em;
    --paper-font-headline_-_line-height: var(--ha-line-height-condensed);

    --paper-font-title_-_font-family: var(
      --paper-font-common-base_-_font-family
    );
    --paper-font-title_-_-webkit-font-smoothing: var(
      --paper-font-common-base_-_-webkit-font-smoothing
    );
    --paper-font-title_-_white-space: var(
      --paper-font-common-nowrap_-_white-space
    );
    --paper-font-title_-_overflow: var(--paper-font-common-nowrap_-_overflow);
    --paper-font-title_-_text-overflow: var(
      --paper-font-common-nowrap_-_text-overflow
    );
    --paper-font-title_-_font-size: var(--ha-font-size-l);
    --paper-font-title_-_font-weight: var(--ha-font-weight-semibold);
    --paper-font-title_-_line-height: var(--ha-line-height-normal);

    --paper-font-subhead_-_font-family: var(
      --paper-font-common-base_-_font-family
    );
    --paper-font-subhead_-_-webkit-font-smoothing: var(
      --paper-font-common-base_-_-webkit-font-smoothing
    );
    --paper-font-subhead_-_font-size: var(--ha-font-size-m);
    --paper-font-subhead_-_font-weight: var(--ha-font-weight-normal);
    --paper-font-subhead_-_line-height: var(--ha-line-height-normal);

    --paper-font-body1_-_font-family: var(
      --paper-font-common-base_-_font-family
    );
    --paper-font-body1_-_-webkit-font-smoothing: var(
      --paper-font-common-base_-_-webkit-font-smoothing
    );
    --paper-font-body1_-_font-size: var(--ha-font-size-s);
    --paper-font-body1_-_font-weight: var(--ha-font-weight-normal);
    --paper-font-body1_-_line-height: var(--ha-line-height-normal);

    /* component specific */
    /* ha-tooltip */
    --ha-tooltip-font-family: var(--ha-font-family-body);
    --ha-tooltip-font-size: var(--ha-font-size-xs);
    --ha-tooltip-font-weight: var(--ha-font-weight-normal);
    --ha-tooltip-line-height: var(--ha-line-height-condensed);

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
    --label-badge-red: var(--error-color);
    --label-badge-blue: var(--info-color);
    --label-badge-green: var(--success-color);
    --label-badge-yellow: var(--warning-color);
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

    /* state color */
    --state-active-color: var(--amber-color);
    --state-inactive-color: var(--grey-color);
    --state-unavailable-color: var(--disabled-color);

    /* state domain colors */
    --state-alarm_control_panel-armed_away-color: var(--green-color);
    --state-alarm_control_panel-armed_custom_bypass-color: var(--green-color);
    --state-alarm_control_panel-armed_home-color: var(--green-color);
    --state-alarm_control_panel-armed_night-color: var(--green-color);
    --state-alarm_control_panel-armed_vacation-color: var(--green-color);
    --state-alarm_control_panel-arming-color: var(--orange-color);
    --state-alarm_control_panel-disarming-color: var(--orange-color);
    --state-alarm_control_panel-pending-color: var(--orange-color);
    --state-alarm_control_panel-triggered-color: var(--red-color);
    --state-alert-off-color: var(--orange-color);
    --state-alert-on-color: var(--red-color);
    --state-binary_sensor-active-color: var(--amber-color);
    --state-binary_sensor-battery-on-color: var(--red-color);
    --state-binary_sensor-carbon_monoxide-on-color: var(--red-color);
    --state-binary_sensor-gas-on-color: var(--red-color);
    --state-binary_sensor-heat-on-color: var(--red-color);
    --state-binary_sensor-lock-on-color: var(--red-color);
    --state-binary_sensor-moisture-on-color: var(--red-color);
    --state-binary_sensor-problem-on-color: var(--red-color);
    --state-binary_sensor-safety-on-color: var(--red-color);
    --state-binary_sensor-smoke-on-color: var(--red-color);
    --state-binary_sensor-sound-on-color: var(--red-color);
    --state-binary_sensor-tamper-on-color: var(--red-color);
    --state-climate-auto-color: var(--green-color);
    --state-climate-cool-color: var(--blue-color);
    --state-climate-dry-color: var(--orange-color);
    --state-climate-fan_only-color: var(--cyan-color);
    --state-climate-heat-color: var(--deep-orange-color);
    --state-climate-heat-cool-color: var(--amber-color);
    --state-cover-active-color: var(--purple-color);
    --state-device_tracker-active-color: var(--blue-color);
    --state-device_tracker-home-color: var(--green-color);
    --state-fan-active-color: var(--cyan-color);
    --state-humidifier-on-color: var(--blue-color);
    --state-lawn_mower-error-color: var(--red-color);
    --state-lawn_mower-mowing-color: var(--teal-color);
    --state-light-active-color: var(--amber-color);
    --state-lock-jammed-color: var(--red-color);
    --state-lock-locked-color: var(--green-color);
    --state-lock-locking-color: var(--orange-color);
    --state-lock-unlocked-color: var(--red-color);
    --state-lock-unlocking-color: var(--orange-color);
    --state-lock-open-color: var(--red-color);
    --state-lock-opening-color: var(--orange-color);
    --state-media_player-active-color: var(--light-blue-color);
    --state-person-active-color: var(--blue-color);
    --state-person-home-color: var(--green-color);
    --state-plant-active-color: var(--red-color);
    --state-siren-active-color: var(--red-color);
    --state-sun-above_horizon-color: var(--amber-color);
    --state-sun-below_horizon-color: var(--indigo-color);
    --state-switch-active-color: var(--amber-color);
    --state-update-active-color: var(--orange-color);
    --state-vacuum-active-color: var(--teal-color);
    --state-valve-active-color: var(--blue-color);
    --state-sensor-battery-high-color: var(--green-color);
    --state-sensor-battery-low-color: var(--red-color);
    --state-sensor-battery-medium-color: var(--orange-color);
    --state-water_heater-eco-color: var(--green-color);
    --state-water_heater-electric-color: var(--orange-color);
    --state-water_heater-gas-color: var(--orange-color);
    --state-water_heater-heat_pump-color: var(--orange-color);
    --state-water_heater-high_demand-color: var(--deep-orange-color);
    --state-water_heater-performance-color: var(--deep-orange-color);

    /* history colors */
    --history-unavailable-color: transparent;
    --history-unknown-color: var(--dark-grey-color);

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
