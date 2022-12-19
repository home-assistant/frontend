import "@polymer/paper-styles/paper-styles";
import "@polymer/polymer/lib/elements/custom-style";
import { derivedStyles } from "./styles";

export const DEFAULT_PRIMARY_COLOR = "#03a9f4";
export const DEFAULT_ACCENT_COLOR = "#ff9800";

const documentContainer = document.createElement("template");
documentContainer.setAttribute("style", "display: none;");

documentContainer.innerHTML = `<custom-style>
  <style>
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
      --primary-color: ${DEFAULT_PRIMARY_COLOR};
      --dark-primary-color: #0288d1;
      --light-primary-color: #b3e5fC;
      --accent-color: ${DEFAULT_ACCENT_COLOR};
      --divider-color: rgba(0, 0, 0, .12);

      --scrollbar-thumb-color: rgb(194, 194, 194);

      --error-color: #db4437;
      --warning-color: #ffa600;
      --success-color: #43a047;
      --info-color: #039be5;

      /* backgrounds */
      --card-background-color: #ffffff;
      --primary-background-color: #fafafa;
      --secondary-background-color: #e5e5e5; /* behind the cards on state */

      /* for header */
      --header-height: 56px;

      /* for label-badge */
      --label-badge-red: #DF4C1E;
      --label-badge-blue: #039be5;
      --label-badge-green: #0DA035;
      --label-badge-yellow: #f4b400;
      --label-badge-grey: #9e9e9e;

      /* states */
      --state-icon-color: #44739e;
      /* an error state is anything that would be considered an error */
      /* --state-icon-error-color: #db4437; derived from error-color */

      --state-on-color: #66a61e;
      --state-off-color: #ff0029;
      --state-home-color: #66a61e;
      --state-not_home-color: #ff0029;
      /* --state-unavailable-color: #a0a0a0; derived from disabled-text-color */
      --state-unknown-color: #606060;
      --state-idle-color: #7990a3;

      /* climate state colors */
      --state-climate-auto-color: #008000;
      --state-climate-eco-color: #00ff7f;
      --state-climate-cool-color: #2b9af9;
      --state-climate-heat-color: #ff8100;
      --state-climate-manual-color: #44739e;
      --state-climate-off-color: #8a8a8a;
      --state-climate-fan_only-color: #8a8a8a;
      --state-climate-dry-color: #efbd07;
      --state-climate-idle-color: #8a8a8a;

      /* energy */
      --energy-grid-consumption-color: #488fc2;
      --energy-grid-return-color: #8353d1;
      --energy-solar-color: #ff9800;
      --energy-non-fossil-color: #0f9d58;
      --energy-battery-out-color: #4db6ac;
      --energy-battery-in-color: #f06292;
      --energy-gas-color: #8E021B;
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
      --light-primary-opacity: 1.0;

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
      --purple-color: #9c27b0;
      --deep-purple-color: #673ab7;
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
      --deep-orange-color: #ff5722;
      --brown-color: #795548;
      --grey-color: #9e9e9e;
      --blue-grey-color: #607d8b;
      --black-color: #000000;
      --white-color: #ffffff;      

      /* rgb state color */
      --state-default-color: var(--dark-primary-color, #44739e);
      --state-inactive-color: var(--grey-color);
      --state-unavailable-color: var(--disabled-color);

      /* rgb state domain colors */
      --state-alarm_control_panel-armed_away-color: var(--green-color);
      --state-alarm_control_panel-armed_custom_bypass-color: var(--green-color);
      --state-alarm_control_panel-armed_home-color: var(--green-color);
      --state-alarm_control_panel-armed_night-color: var(--green-color);
      --state-alarm_control_panel-armed_vacation-color: var(--green-color);
      --state-alarm_control_panel-arming-color: var(--orange-color);
      --state-alarm_control_panel-disarmed-color: var(--state-inactive-color);
      --state-alarm_control_panel-disarming-color: var(--orange-color);
      --state-alarm_control_panel-pending-color: var(--orange-color);
      --state-alarm_control_panel-triggered-color: var(--red-color);


      --state-alert-on-color: var(--red-color);
      --state-alert-off-color: var(--orange-color);
      --state-alert-idle-color: var(--grey-color);

      --state-automation-color: var(--amber-color);

      --state-binary_sensor-alerting-color: var(--red-color);
      --state-binary_sensor-color: var(--amber-color);
      
      --state-calendar-color: var(--amber-color);
      --state-camera-color: var(--amber-color);
      --state-climate-auto-color: var(--green-color);
      --state-climate-cool-color: var(--blue-color);
      --state-climate-dry-color: var(--orange-color);
      --state-climate-fan_only-color: var(--cyan-color);
      --state-climate-heat-color: var(--deep-orange-color);
      --state-climate-heat-cool-color: var(--amber-color);
      --state-climate-idle-color: var(--grey-color);
      --state-cover-color: var(--purple-color);
      --state-fan-color: var(--cyan-color);
      --state-group-color: var(--amber-color);
      --state-humidifier-color: var(--blue-color);
      --state-input-boolean-color: var(--amber-color);
      --state-light-color: var(--amber-color);
      --state-lock-jammed-color: var(--red-color);
      --state-lock-locked-color: var(--green-color);
      --state-lock-pending-color: var(--orange-color);
      --state-lock-unlocked-color: var(--red-color);
      --state-media_player-color: var(--light-blue-color);
      --state-person-home-color: var(--green-color);
      --state-person-not_home-color: var(--grey-color);
      --state-person-zone-color: var(--blue-color);
      --state-device_tracker-home-color: var(--green-color);
      --state-device_tracker-not_home-color: var(--grey-color);
      --state-device_tracker-zone-color: var(--blue-color);
      --state-remote-color: var(--amber-color);
      --state-script-color: var(--amber-color);
      --state-sensor-battery-high-color: var(--green-color);
      --state-sensor-battery-low-color: var(--red-color);
      --state-sensor-battery-medium-color: var(--orange-color);
      --state-sensor-battery-unknown-color: var(--brown-color);
      --state-siren-color: var(--red-color);
      --state-sun-day-color: var(--amber-color);
      --state-sun-night-color: var(--deep-purple-color);
      --state-switch-color: var(--amber-color);
      --state-timer-color: var(--amber-color);
      --state-update-color: var(--green-color);
      --state-update-installing-color: var(--orange-color);
      --state-vacuum-color: var(--teal-color);

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

      ${Object.entries(derivedStyles)
        .map(([key, value]) => `--${key}: ${value};`)
        .join("")}
    }
  </style>
</custom-style>`;

document.head.appendChild(documentContainer.content);
