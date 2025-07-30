import { css } from "lit";
import {
  extractVar,
  extractVars,
} from "../../../common/style/derived-css-vars";
import { coreColorVariables } from "./core.globals";

export const colorStyles = css`
  html {
    /* text */
    --primary-text-color: var(--color-text-primary);
    --secondary-text-color: var(--color-text-secondary);
    --text-primary-color: #ffffff;
    --text-light-primary-color: #212121;
    --disabled-text-color: #bdbdbd;

    /* main interface colors */
    --primary-color: var(--color-primary-40);
    --dark-primary-color: #0288d1;
    --light-primary-color: #b3e5fc;
    --accent-color: #ff9800;
    --divider-color: rgba(0, 0, 0, 0.12);
    --outline-color: rgba(0, 0, 0, 0.12);
    --outline-hover-color: rgba(0, 0, 0, 0.24);

    /* rgb */
    --rgb-primary-color: 0, 154, 199;
    --rgb-accent-color: 255, 152, 0;
    --rgb-primary-text-color: 33, 33, 33;
    --rgb-secondary-text-color: 114, 114, 114;
    --rgb-text-primary-color: 255, 255, 255;
    --rgb-card-background-color: 255, 255, 255;

    --rgb-warning-color: 255, 166, 0;
    --rgb-error-color: 219, 68, 55;
    --rgb-success-color: 67, 160, 71;
    --rgb-info-color: 3, 155, 229;

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

    /* for label-badge */
    --label-badge-red: var(--error-color);
    --label-badge-blue: var(--info-color);
    --label-badge-green: var(--success-color);
    --label-badge-yellow: var(--warning-color);

    /* state color */
    --state-active-color: var(--amber-color);
    --state-inactive-color: var(--grey-color);
    --state-unavailable-color: var(
      --state-icon-unavailable-color,
      var(--disabled-text-color)
    );

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
    --history-unknown-color: var(--dark-grey-color);

    --state-icon-error-color: var(--error-state-color, var(--error-color));
    --sidebar-text-color: var(--primary-text-color);
    --sidebar-background-color: var(--card-background-color);
    --sidebar-selected-text-color: var(--primary-color);
    --sidebar-selected-icon-color: var(--primary-color);
    --sidebar-icon-color: rgba(var(--rgb-primary-text-color), 0.6);
    --switch-checked-color: var(--primary-color);
    --switch-checked-button-color: var(
      --switch-checked-color,
      var(--primary-background-color)
    );
    --switch-checked-track-color: var(--switch-checked-color, #000000);
    --switch-unchecked-button-color: var(
      --switch-unchecked-color,
      var(--primary-background-color)
    );
    --switch-unchecked-track-color: var(--switch-unchecked-color, #000000);
    --slider-color: var(--primary-color);
    --slider-secondary-color: var(--light-primary-color);
    --slider-track-color: var(--scrollbar-thumb-color);
    --label-badge-background-color: var(--card-background-color);
    --label-badge-text-color: rgba(var(--rgb-primary-text-color), 0.8);
    --table-header-background-color: var(--input-fill-color);
    --table-row-background-color: var(--primary-background-color);
    --table-row-alternative-background-color: var(--secondary-background-color);
    --data-table-background-color: var(--card-background-color);
    --markdown-code-background-color: var(--primary-background-color);

    /* https://github.com/material-components/material-web/blob/master/docs/theming.md */
    --mdc-theme-primary: var(--primary-color);
    --mdc-theme-secondary: var(--accent-color);
    --mdc-theme-background: var(--primary-background-color);
    --mdc-theme-surface: var(--card-background-color);
    --mdc-theme-on-primary: var(--text-primary-color);
    --mdc-theme-on-secondary: var(--text-primary-color);
    --mdc-theme-on-surface: var(--primary-text-color);
    --mdc-theme-text-disabled-on-light: var(--disabled-text-color);
    --mdc-theme-text-primary-on-background: var(--primary-text-color);
    --mdc-theme-text-secondary-on-background: var(--secondary-text-color);
    --mdc-theme-text-hint-on-background: var(--secondary-text-color);
    --mdc-theme-text-icon-on-background: var(--secondary-text-color);
    --mdc-theme-error: var(--error-color);
    --app-header-text-color: var(--text-primary-color);
    --app-header-background-color: var(--primary-color);
    --app-theme-color: var(--app-header-background-color);
    --mdc-checkbox-unchecked-color: rgba(var(--rgb-primary-text-color), 0.54);
    --mdc-checkbox-disabled-color: var(--disabled-text-color);
    --mdc-radio-unchecked-color: rgba(var(--rgb-primary-text-color), 0.54);
    --mdc-radio-disabled-color: var(--disabled-text-color);
    --mdc-tab-text-label-color-default: var(--primary-text-color);
    --mdc-button-disabled-ink-color: var(--disabled-text-color);
    --mdc-button-outline-color: var(--outline-color);
    --mdc-dialog-scroll-divider-color: var(--divider-color);
    --mdc-dialog-heading-ink-color: var(--primary-text-color);
    --mdc-dialog-content-ink-color: var(--primary-text-color);

    --mdc-text-field-idle-line-color: var(--input-idle-line-color);
    --mdc-text-field-hover-line-color: var(--input-hover-line-color);
    --mdc-text-field-disabled-line-color: var(--input-disabled-line-color);
    --mdc-text-field-outlined-idle-border-color: var(
      --input-outlined-idle-border-color
    );
    --mdc-text-field-outlined-hover-border-color: var(
      --input-outlined-hover-border-color
    );
    --mdc-text-field-outlined-disabled-border-color: var(
      --input-outlined-disabled-border-color
    );
    --mdc-text-field-fill-color: var(--input-fill-color);
    --mdc-text-field-disabled-fill-color: var(--input-disabled-fill-color);
    --mdc-text-field-ink-color: var(--input-ink-color);
    --mdc-text-field-label-ink-color: var(--input-label-ink-color);
    --mdc-text-field-disabled-ink-color: var(--input-disabled-ink-color);

    --mdc-select-idle-line-color: var(--input-idle-line-color);
    --mdc-select-hover-line-color: var(--input-hover-line-color);
    --mdc-select-outlined-idle-border-color: var(
      --input-outlined-idle-border-color
    );
    --mdc-select-outlined-hover-border-color: var(
      --input-outlined-hover-border-color
    );
    --mdc-select-outlined-disabled-border-color: var(
      --input-outlined-disabled-border-color
    );
    --mdc-select-fill-color: var(--input-fill-color);
    --mdc-select-disabled-fill-color: var(--input-disabled-fill-color);
    --mdc-select-ink-color: var(--input-ink-color);
    --mdc-select-label-ink-color: var(--input-label-ink-color);
    --mdc-select-disabled-ink-color: var(--input-disabled-ink-color);
    --mdc-select-dropdown-icon-color: var(--input-dropdown-icon-color);
    --mdc-select-disabled-dropdown-icon-color: var(--input-disabled-ink-color);
    --ha-assist-chip-filled-container-color: rgba(
      var(--rgb-primary-text-color),
      0.15
    );
    --ha-assist-chip-active-container-color: rgba(
      var(--rgb-primary-color),
      0.15
    );
    --chip-background-color: rgba(var(--rgb-primary-text-color), 0.15);

    /* Vaadin */
    --material-body-text-color: var(--primary-text-color);
    --material-background-color: var(--card-background-color);
    --material-secondary-background-color: var(--secondary-background-color);
    --material-secondary-text-color: var(--secondary-text-color);
  }
`;

export const darkColorStyles = css`
  html {
    --primary-background-color: #111111;
    --card-background-color: #1c1c1c;
    --secondary-background-color: #282828;
    --clear-background-color: #111111;
    --primary-text-color: #e1e1e1;
    --secondary-text-color: #9b9b9b;
    --disabled-text-color: #6f6f6f;
    --app-header-text-color: #e1e1e1;
    --app-header-background-color: #101e24;
    --switch-unchecked-button-color: #999999;
    --switch-unchecked-track-color: #9b9b9b;
    --divider-color: rgba(225, 225, 225, 0.12);
    --outline-color: rgba(225, 225, 225, 0.12);
    --outline-hover-color: rgba(225, 225, 225, 0.24);
    --mdc-ripple-color: #aaaaaa;
    --mdc-linear-progress-buffer-color: rgba(255, 255, 255, 0.1);

    --input-idle-line-color: rgba(255, 255, 255, 0.42);
    --input-hover-line-color: rgba(255, 255, 255, 0.87);
    --input-disabled-line-color: rgba(255, 255, 255, 0.06);
    --input-outlined-idle-border-color: rgba(255, 255, 255, 0.38);
    --input-outlined-hover-border-color: rgba(255, 255, 255, 0.87);
    --input-outlined-disabled-border-color: rgba(255, 255, 255, 0.06);
    --input-fill-color: rgba(255, 255, 255, 0.05);
    --input-disabled-fill-color: rgba(255, 255, 255, 0.02);
    --input-ink-color: rgba(255, 255, 255, 0.87);
    --input-label-ink-color: rgba(255, 255, 255, 0.6);
    --input-disabled-ink-color: rgba(255, 255, 255, 0.37);
    --input-dropdown-icon-color: rgba(255, 255, 255, 0.54);

    --codemirror-keyword: #c792ea;
    --codemirror-operator: #89ddff;
    --codemirror-variable: #f07178;
    --codemirror-variable-2: #eeffff;
    --codemirror-variable-3: #decb6b;
    --codemirror-builtin: #ffcb6b;
    --codemirror-atom: #f78c6c;
    --codemirror-number: #ff5370;
    --codemirror-def: #82aaff;
    --codemirror-string: #c3e88d;
    --codemirror-string-2: #f07178;
    --codemirror-comment: #545454;
    --codemirror-tag: #ff5370;
    --codemirror-meta: #ffcb6b;
    --codemirror-attribute: #c792ea;
    --codemirror-property: #c792ea;
    --codemirror-qualifier: #decb6b;
    --codemirror-type: #decb6b;
    --energy-grid-return-color: #a280db;
    --map-filter: invert(0.9) hue-rotate(170deg) brightness(1.5) contrast(1.2)
      saturate(0.3);
    --disabled-color: #464646;
  }
`;
export const colorVariables = extractVars(colorStyles);

export const DefaultPrimaryColor = extractVar(
  colorStyles,
  "primary-color",
  coreColorVariables
);
export const DefaultAccentColor = extractVar(colorStyles, "accent-color");
