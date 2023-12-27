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

    In Polymer 2.0, default styles should to be set on the html selector.
    (Setting all default styles only on body breaks shadyCSS polyfill.)
    See: https://github.com/home-assistant/home-assistant-polymer/pull/901
  */
  html {
    font-size: 14px;
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
    --state-lock-pending-color: var(--orange-color);
    --state-lock-unlocked-color: var(--red-color);
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

    /* Vaadin typography */
    --material-h6-font-size: 1.25rem;
    --material-small-font-size: 0.875rem;
    --material-caption-font-size: 0.75rem;
    --material-button-font-size: 0.875rem;

    /* Paper shadow */
    --shadow-transition: {
      transition: box-shadow 0.28s cubic-bezier(0.4, 0, 0.2, 1);
    };

    --shadow-none: {
      box-shadow: none;
    };

    /* from http://codepen.io/shyndman/pen/c5394ddf2e8b2a5c9185904b57421cdb */

    --shadow-elevation-2dp: {
      box-shadow:
        0 2px 2px 0 rgba(0, 0, 0, 0.14),
        0 1px 5px 0 rgba(0, 0, 0, 0.12),
        0 3px 1px -2px rgba(0, 0, 0, 0.2);
    };

    --shadow-elevation-3dp: {
      box-shadow:
        0 3px 4px 0 rgba(0, 0, 0, 0.14),
        0 1px 8px 0 rgba(0, 0, 0, 0.12),
        0 3px 3px -2px rgba(0, 0, 0, 0.4);
    };

    --shadow-elevation-4dp: {
      box-shadow:
        0 4px 5px 0 rgba(0, 0, 0, 0.14),
        0 1px 10px 0 rgba(0, 0, 0, 0.12),
        0 2px 4px -1px rgba(0, 0, 0, 0.4);
    };

    --shadow-elevation-6dp: {
      box-shadow:
        0 6px 10px 0 rgba(0, 0, 0, 0.14),
        0 1px 18px 0 rgba(0, 0, 0, 0.12),
        0 3px 5px -1px rgba(0, 0, 0, 0.4);
    };

    --shadow-elevation-8dp: {
      box-shadow:
        0 8px 10px 1px rgba(0, 0, 0, 0.14),
        0 3px 14px 2px rgba(0, 0, 0, 0.12),
        0 5px 5px -3px rgba(0, 0, 0, 0.4);
    };

    --shadow-elevation-12dp: {
      box-shadow:
        0 12px 16px 1px rgba(0, 0, 0, 0.14),
        0 4px 22px 3px rgba(0, 0, 0, 0.12),
        0 6px 7px -4px rgba(0, 0, 0, 0.4);
    };

    --shadow-elevation-16dp: {
      box-shadow:
        0 16px 24px 2px rgba(0, 0, 0, 0.14),
        0 6px 30px 5px rgba(0, 0, 0, 0.12),
        0 8px 10px -5px rgba(0, 0, 0, 0.4);
    };

    --shadow-elevation-24dp: {
      box-shadow:
        0 24px 38px 3px rgba(0, 0, 0, 0.14),
        0 9px 46px 8px rgba(0, 0, 0, 0.12),
        0 11px 15px -7px rgba(0, 0, 0, 0.4);
    };

    /* Paper typography Styles */
    --paper-font-common-base: {
      font-family: "Roboto", "Noto", sans-serif;
      -webkit-font-smoothing: antialiased;
    };

    --paper-font-common-code: {
      font-family: "Roboto Mono", "Consolas", "Menlo", monospace;
      -webkit-font-smoothing: antialiased;
    };

    --paper-font-common-expensive-kerning: {
      text-rendering: optimizeLegibility;
    };

    --paper-font-common-nowrap: {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    };

    /* Material Font Styles */

    --paper-font-display4: {
      @apply --paper-font-common-base;
      @apply --paper-font-common-nowrap;

      font-size: 112px;
      font-weight: 300;
      letter-spacing: -0.044em;
      line-height: 120px;
    };

    --paper-font-display3: {
      @apply --paper-font-common-base;
      @apply --paper-font-common-nowrap;

      font-size: 56px;
      font-weight: 400;
      letter-spacing: -0.026em;
      line-height: 60px;
    };

    --paper-font-display2: {
      @apply --paper-font-common-base;

      font-size: 45px;
      font-weight: 400;
      letter-spacing: -0.018em;
      line-height: 48px;
    };

    --paper-font-display1: {
      @apply --paper-font-common-base;

      font-size: 34px;
      font-weight: 400;
      letter-spacing: -0.01em;
      line-height: 40px;
    };

    --paper-font-headline: {
      @apply --paper-font-common-base;

      font-size: 24px;
      font-weight: 400;
      letter-spacing: -0.012em;
      line-height: 32px;
    };

    --paper-font-title: {
      @apply --paper-font-common-base;
      @apply --paper-font-common-nowrap;

      font-size: 20px;
      font-weight: 500;
      line-height: 28px;
    };

    --paper-font-subhead: {
      @apply --paper-font-common-base;

      font-size: 16px;
      font-weight: 400;
      line-height: 24px;
    };

    --paper-font-body2: {
      @apply --paper-font-common-base;

      font-size: 14px;
      font-weight: 500;
      line-height: 24px;
    };

    --paper-font-body1: {
      @apply --paper-font-common-base;

      font-size: 14px;
      font-weight: 400;
      line-height: 20px;
    };

    --paper-font-caption: {
      @apply --paper-font-common-base;
      @apply --paper-font-common-nowrap;

      font-size: 12px;
      font-weight: 400;
      letter-spacing: 0.011em;
      line-height: 20px;
    };

    --paper-font-menu: {
      @apply --paper-font-common-base;
      @apply --paper-font-common-nowrap;

      font-size: 13px;
      font-weight: 500;
      line-height: 24px;
    };

    --paper-font-button: {
      @apply --paper-font-common-base;
      @apply --paper-font-common-nowrap;

      font-size: 14px;
      font-weight: 500;
      letter-spacing: 0.018em;
      line-height: 24px;
      text-transform: uppercase;
    };

    --paper-font-code2: {
      @apply --paper-font-common-code;

      font-size: 14px;
      font-weight: 700;
      line-height: 20px;
    };

    --paper-font-code1: {
      @apply --paper-font-common-code;

      font-size: 14px;
      font-weight: 500;
      line-height: 20px;
    };

    direction: ltr;
    --direction: ltr;
    --float-start: left;
    --float-end: right;

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
