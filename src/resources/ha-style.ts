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
      --rgb-disabled-color: 189, 189, 189;
      --rgb-inactive-color: 114, 114, 114;
      --rgb-primary-text-color: 33, 33, 33;
      --rgb-secondary-text-color: 114, 114, 114;
      --rgb-text-primary-color: 255, 255, 255;
      --rgb-card-background-color: 255, 255, 255;
      --rgb-red-color: 244, 67, 54;
      --rgb-pink-color: 233, 30, 99;
      --rgb-purple-color: 156, 39, 176;
      --rgb-deep-purple-color: 103, 58, 183;
      --rgb-indigo-color: 63, 81, 181;
      --rgb-blue-color: 33, 150, 243;
      --rgb-light-blue-color: 3, 169, 244;
      --rgb-cyan-color: 0, 188, 212;
      --rgb-teal-color: 0, 150, 136;
      --rgb-green-color: 76, 175, 80;
      --rgb-light-green-color: 139, 195, 74;
      --rgb-lime-color: 205, 220, 57;
      --rgb-yellow-color: 255, 235, 59;
      --rgb-amber-color: 255, 193, 7;
      --rgb-orange-color: 255, 152, 0;
      --rgb-deep-orange-color: 255, 87, 34;
      --rgb-brown-color: 121, 85, 72;
      --rgb-grey-color: 158, 158, 158;
      --rgb-blue-grey-color: 96, 125, 139;
      --rgb-black-color: 0, 0, 0;
      --rgb-white-color: 255, 255, 255;

      /* rgb state color */
      --rgb-state-default-color: var(--rgb-dark-primary-color, 68, 115, 158);
      --rgb-state-inactive-color: var(--rgb-inactive-color);
      --rgb-state-unavailable-color: var(--rgb-disabled-color);

      /* rgb state domain colors */
      --rgb-state-alarm-armed-color: var(--rgb-green-color);
      --rgb-state-alarm-arming-color: var(--rgb-orange-color);
      --rgb-state-alarm-disarmed-color: var(--rgb-inactive-color);
      --rgb-state-alarm-pending-color: var(--rgb-orange-color);
      --rgb-state-alarm-triggered-color: var(--rgb-red-color);
      --rgb-state-alert-color: var(--rgb-red-color);
      --rgb-state-automation-color: var(--rgb-amber-color);
      --rgb-state-binary-sensor-alerting-color: var(--rgb-red-color);
      --rgb-state-binary-sensor-color: var(--rgb-amber-color);
      --rgb-state-calendar-color: var(--rgb-amber-color);
      --rgb-state-camera-color: var(--rgb-amber-color);
      --rgb-state-climate-auto-color: var(--rgb-green-color);
      --rgb-state-climate-cool-color: var(--rgb-blue-color);
      --rgb-state-climate-dry-color: var(--rgb-orange-color);
      --rgb-state-climate-fan-only-color: var(--rgb-cyan-color);
      --rgb-state-climate-heat-color: var(--rgb-deep-orange-color);
      --rgb-state-climate-heat-cool-color: var(--rgb-amber-color);
      --rgb-state-climate-idle-color: var(--rgb-off-color);
      --rgb-state-cover-color: var(--rgb-purple-color);
      --rgb-state-fan-color: var(--rgb-cyan-color);
      --rgb-state-group-color: var(--rgb-amber-color);
      --rgb-state-humidifier-color: var(--rgb-blue-color);
      --rgb-state-input-boolean-color: var(--rgb-amber-color);
      --rgb-state-light-color: var(--rgb-amber-color);
      --rgb-state-lock-jammed-color: var(--rgb-red-color);
      --rgb-state-lock-locked-color: var(--rgb-green-color);
      --rgb-state-lock-pending-color: var(--rgb-orange-color);
      --rgb-state-lock-unlocked-color: var(--rgb-red-color);
      --rgb-state-media-player-color: var(--rgb-indigo-color);
      --rgb-state-person-home-color: var(--rgb-green-color);
      --rgb-state-person-not-home-color: var(--rgb-inactive-color);
      --rgb-state-person-zone-color: var(--rgb-blue-color);
      --rgb-state-remote-color: var(--rgb-amber-color);
      --rgb-state-script-color: var(--rgb-amber-color);
      --rgb-state-sensor-battery-high-color: var(--rgb-green-color);
      --rgb-state-sensor-battery-low-color: var(--rgb-red-color);
      --rgb-state-sensor-battery-medium-color: var(--rgb-orange-color);
      --rgb-state-sensor-battery-unknown-color: var(--rgb-off-color);
      --rgb-state-siren-color: var(--rgb-red-color);
      --rgb-state-sun-day-color: var(--rgb-amber-color);
      --rgb-state-sun-night-color: var(--rgb-deep-purple-color);
      --rgb-state-switch-color: var(--rgb-amber-color);
      --rgb-state-timer-color: var(--rgb-amber-color);
      --rgb-state-update-color: var(--rgb-green-color);
      --rgb-state-update-installing-color: var(--rgb-orange-color);
      --rgb-state-vacuum-color: var(--rgb-teal-color);

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
