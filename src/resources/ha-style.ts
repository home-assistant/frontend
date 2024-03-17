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

    /* Material Design 3 styles */
    /* display - large */
    --md-sys-typescale-display-large-font-family-name: Roboto;
    --md-sys-typescale-display-large-font-family-style: Regular;
    --md-sys-typescale-display-large-font-weight: 400px;
    --md-sys-typescale-display-large-font-size: 57px;
    --md-sys-typescale-display-large-line-height: 64px;
    --md-sys-typescale-display-large-letter-spacing: -0.25px;
    /* display - medium */
    --md-sys-typescale-display-medium-font-family-name: Roboto;
    --md-sys-typescale-display-medium-font-family-style: Regular;
    --md-sys-typescale-display-medium-font-weight: 400px;
    --md-sys-typescale-display-medium-font-size: 45px;
    --md-sys-typescale-display-medium-line-height: 52px;
    --md-sys-typescale-display-medium-letter-spacing: 0px;
    /* display - small */
    --md-sys-typescale-display-small-font-family-name: Roboto;
    --md-sys-typescale-display-small-font-family-style: Regular;
    --md-sys-typescale-display-small-font-weight: 400px;
    --md-sys-typescale-display-small-font-size: 36px;
    --md-sys-typescale-display-small-line-height: 44px;
    --md-sys-typescale-display-small-letter-spacing: 0px;
    /* headline - large */
    --md-sys-typescale-headline-large-font-family-name: Roboto;
    --md-sys-typescale-headline-large-font-family-style: Regular;
    --md-sys-typescale-headline-large-font-weight: 400px;
    --md-sys-typescale-headline-large-font-size: 32px;
    --md-sys-typescale-headline-large-line-height: 40px;
    --md-sys-typescale-headline-large-letter-spacing: 0px;
    /* headline - medium */
    --md-sys-typescale-headline-medium-font-family-name: Roboto;
    --md-sys-typescale-headline-medium-font-family-style: Regular;
    --md-sys-typescale-headline-medium-font-weight: 400px;
    --md-sys-typescale-headline-medium-font-size: 28px;
    --md-sys-typescale-headline-medium-line-height: 36px;
    --md-sys-typescale-headline-medium-letter-spacing: 0px;
    /* headline - small */
    --md-sys-typescale-headline-small-font-family-name: Roboto;
    --md-sys-typescale-headline-small-font-family-style: Regular;
    --md-sys-typescale-headline-small-font-weight: 400px;
    --md-sys-typescale-headline-small-font-size: 24px;
    --md-sys-typescale-headline-small-line-height: 32px;
    --md-sys-typescale-headline-small-letter-spacing: 0px;
    /* body - large */
    --md-sys-typescale-body-large-font-family-name: Roboto;
    --md-sys-typescale-body-large-font-family-style: Regular;
    --md-sys-typescale-body-large-font-weight: 400px;
    --md-sys-typescale-body-large-font-size: 16px;
    --md-sys-typescale-body-large-line-height: 24px;
    --md-sys-typescale-body-large-letter-spacing: 0.5px;
    /* body - medium */
    --md-sys-typescale-body-medium-font-family-name: Roboto;
    --md-sys-typescale-body-medium-font-family-style: Regular;
    --md-sys-typescale-body-medium-font-weight: 400px;
    --md-sys-typescale-body-medium-font-size: 14px;
    --md-sys-typescale-body-medium-line-height: 20px;
    --md-sys-typescale-body-medium-letter-spacing: 0.25px;
    /* body - small */
    --md-sys-typescale-body-small-font-family-name: Roboto;
    --md-sys-typescale-body-small-font-family-style: Regular;
    --md-sys-typescale-body-small-font-weight: 400px;
    --md-sys-typescale-body-small-font-size: 12px;
    --md-sys-typescale-body-small-line-height: 16px;
    --md-sys-typescale-body-small-letter-spacing: 0.4px;
    /* label - large */
    --md-sys-typescale-label-large-font-family-name: Roboto;
    --md-sys-typescale-label-large-font-family-style: Medium;
    --md-sys-typescale-label-large-font-weight: 500px;
    --md-sys-typescale-label-large-font-size: 14px;
    --md-sys-typescale-label-large-line-height: 20px;
    --md-sys-typescale-label-large-letter-spacing: 0.1px;
    /* label - medium */
    --md-sys-typescale-label-medium-font-family-name: Roboto;
    --md-sys-typescale-label-medium-font-family-style: Medium;
    --md-sys-typescale-label-medium-font-weight: 500px;
    --md-sys-typescale-label-medium-font-size: 12px;
    --md-sys-typescale-label-medium-line-height: 16px;
    --md-sys-typescale-label-medium-letter-spacing: 0.5px;
    /* label - small */
    --md-sys-typescale-label-small-font-family-name: Roboto;
    --md-sys-typescale-label-small-font-family-style: Medium;
    --md-sys-typescale-label-small-font-weight: 500px;
    --md-sys-typescale-label-small-font-size: 11px;
    --md-sys-typescale-label-small-line-height: 16px;
    --md-sys-typescale-label-small-letter-spacing: 0.5px;
    /* title - large */
    --md-sys-typescale-title-large-font-family-name: Roboto;
    --md-sys-typescale-title-large-font-family-style: Regular;
    --md-sys-typescale-title-large-font-weight: 400px;
    --md-sys-typescale-title-large-font-size: 22px;
    --md-sys-typescale-title-large-line-height: 28px;
    --md-sys-typescale-title-large-letter-spacing: 0px;
    /* title - medium */
    --md-sys-typescale-title-medium-font-family-name: Roboto;
    --md-sys-typescale-title-medium-font-family-style: Medium;
    --md-sys-typescale-title-medium-font-weight: 500px;
    --md-sys-typescale-title-medium-font-size: 16px;
    --md-sys-typescale-title-medium-line-height: 24px;
    --md-sys-typescale-title-medium-letter-spacing: 0.15px;
    /* title - small */
    --md-sys-typescale-title-small-font-family-name: Roboto;
    --md-sys-typescale-title-small-font-family-style: Medium;
    --md-sys-typescale-title-small-font-weight: 500px;
    --md-sys-typescale-title-small-font-size: 14px;
    --md-sys-typescale-title-small-line-height: 20px;
    --md-sys-typescale-title-small-letter-spacing: 0.1px;
    /* light */
    --md-sys-color-primary: #00b1f9;
    --md-sys-color-on-primary: #ffffff;
    --md-sys-color-primary-container: #c1f0ff;
    --md-sys-color-on-primary-container: #002432;
    --md-sys-color-secondary: #49616e;
    --md-sys-color-on-secondary: #ffffff;
    --md-sys-color-secondary-container: #cde6f5;
    --md-sys-color-on-secondary-container: #021d29;
    --md-sys-color-tertiary: #753fa9;
    --md-sys-color-on-tertiary: #ffffff;
    --md-sys-color-tertiary-container: #ebdcf6;
    --md-sys-color-on-tertiary-container: #1e102b;
    --md-sys-color-error: #cf0000;
    --md-sys-color-on-error: #ffffff;
    --md-sys-color-error-container: #ffd9d3;
    --md-sys-color-on-error-container: #490000;
    --md-sys-color-outline: #70787e;
    --md-sys-color-background: #ffffff;
    --md-sys-color-on-background: #191c1e;
    --md-sys-color-surface: #fcfcff;
    --md-sys-color-on-surface: #191c1e;
    --md-sys-color-surface-variant: #dbe3ea;
    --md-sys-color-on-surface-variant: #3f474d;
    --md-sys-color-inverse-surface: #191c1e;
    --md-sys-color-inverse-on-surface: #fcfcff;
    --md-sys-color-shadow: #000000;
    --md-sys-color-outline-variant: var(--divider-color);
    --md-sys-color-scrim: #000000;
    --md-sys-color-surface-container-lowest: #ffffff;
    --md-sys-color-surface-container-low: #f0f4f9;
    --md-sys-color-surface-container: #eaeef3;
    --md-sys-color-surface-container-high: #e5e8ee;
    --md-sys-color-surface-container-highest: #dfe3e8;
    /* primary */
    --md-ref-palette-primary0: #000000;
    --md-ref-palette-primary10: #002432;
    --md-ref-palette-primary20: #004763;
    --md-ref-palette-primary30: #006a96;
    --md-ref-palette-primary40: #008dc7;
    --md-ref-palette-primary50: #00b1f9;
    --md-ref-palette-primary60: #00c1fa;
    --md-ref-palette-primary70: #00d1fc;
    --md-ref-palette-primary80: #7ce1fd;
    --md-ref-palette-primary90: #c1f0ff;
    --md-ref-palette-primary95: #e0f8fe;
    --md-ref-palette-primary99: #f4fcff;
    --md-ref-palette-primary100: #ffffff;
    /* secondary */
    --md-ref-palette-secondary0: #000000;
    --md-ref-palette-secondary10: #021d29;
    --md-ref-palette-secondary20: #1a333e;
    --md-ref-palette-secondary30: #324a56;
    --md-ref-palette-secondary40: #49616e;
    --md-ref-palette-secondary50: #627a87;
    --md-ref-palette-secondary60: #7b94a2;
    --md-ref-palette-secondary70: #97aebd;
    --md-ref-palette-secondary80: #b1cad9;
    --md-ref-palette-secondary90: #cde6f5;
    --md-ref-palette-secondary95: #e0f3ff;
    --md-ref-palette-secondary99: #f9fcff;
    --md-ref-palette-secondary100: #ffffff;
    /* tertiary */
    --md-ref-palette-tertiary0: #000000;
    --md-ref-palette-tertiary10: #1e102b;
    --md-ref-palette-tertiary20: #3b1f55;
    --md-ref-palette-tertiary30: #582f7f;
    --md-ref-palette-tertiary40: #753fa9;
    --md-ref-palette-tertiary50: #934ed4;
    --md-ref-palette-tertiary60: #a972dc;
    --md-ref-palette-tertiary70: #c096e4;
    --md-ref-palette-tertiary80: #d5b8ee;
    --md-ref-palette-tertiary90: #ebdcf6;
    --md-ref-palette-tertiary95: #f4eefb;
    --md-ref-palette-tertiary99: #fcfafe;
    --md-ref-palette-tertiary100: #ffffff;
    /* neutral */
    --md-ref-palette-neutral0: #000000;
    --md-ref-palette-neutral10: #191c1e;
    --md-ref-palette-neutral20: #2f3032;
    --md-ref-palette-neutral30: #444749;
    --md-ref-palette-neutral40: #5b5e61;
    --md-ref-palette-neutral50: #74777a;
    --md-ref-palette-neutral60: #909194;
    --md-ref-palette-neutral70: #aaabae;
    --md-ref-palette-neutral80: #c5c6c9;
    --md-ref-palette-neutral90: #e2e2e5;
    --md-ref-palette-neutral95: #f0f0f3;
    --md-ref-palette-neutral99: #fcfcff;
    --md-ref-palette-neutral100: #ffffff;
    /* neutral-variant */
    --md-ref-palette-neutral-variant0: #000000;
    --md-ref-palette-neutral-variant10: #141c21;
    --md-ref-palette-neutral-variant20: #293137;
    --md-ref-palette-neutral-variant30: #3f474d;
    --md-ref-palette-neutral-variant40: #575f65;
    --md-ref-palette-neutral-variant50: #70787e;
    --md-ref-palette-neutral-variant60: #899197;
    --md-ref-palette-neutral-variant70: #a4acb2;
    --md-ref-palette-neutral-variant80: #bfc7ce;
    --md-ref-palette-neutral-variant90: #dbe3ea;
    --md-ref-palette-neutral-variant95: #e9f1f8;
    --md-ref-palette-neutral-variant99: #f9fcff;
    --md-ref-palette-neutral-variant100: #ffffff;
    /* error */
    --md-ref-palette-error0: #000000;
    --md-ref-palette-error10: #490000;
    --md-ref-palette-error20: #740000;
    --md-ref-palette-error30: #a40000;
    --md-ref-palette-error40: #cf0000;
    --md-ref-palette-error50: #f51f12;
    --md-ref-palette-error60: #ff4335;
    --md-ref-palette-error70: #ff8272;
    --md-ref-palette-error80: #ffb0a6;
    --md-ref-palette-error90: #ffd9d3;
    --md-ref-palette-error95: #ffece8;
    --md-ref-palette-error99: #fcfcfc;
    --md-ref-palette-error100: #ffffff;

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
