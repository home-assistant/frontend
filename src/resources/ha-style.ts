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
      --warning-color: #FF9800;
      --success-color: #0f9d58;
      --info-color: #4285f4;

      /* background and sidebar */
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

      /* states and badges */
      --state-icon-color: #44739e;
      /* an active state is anything that would require attention */ 
      --state-icon-active-color: #FDD835;
      /* an error state is anything that would be considered an error */
      /* --state-icon-error-color: #db4437; derived from error-color */

      --state-on-color: #66a61e;
      --state-off-color: #ff0029;
      --state-home-color: #66a61e;
      --state-not_home-color: #ff0029;
      /* --state-unavailable-color: #a0a0a0; derived from disabled-text-color */
      --state-unknown-color: #606060;
      --state-idle-color: #377eb8;

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
      --energy-grid-consumption-color: #126a9a;
      --energy-grid-return-color: #673ab7;
      --energy-solar-color: #ff9800;
      --energy-non-fossil-color: #0f9d58;
      --energy-battery-out-color: #4db6ac;
      --energy-battery-in-color: #f06292;

      --rgb-energy-solar-color: 255, 152, 0;

      /*
        Paper-styles color.html dependency is stripped on build.
        When a default paper-style color is used, it needs to be copied
        from paper-styles/color.html to here.
      */

      --paper-grey-50: #fafafa; /* default for: --mwc-switch-unchecked-button-color */
      --paper-grey-200: #eeeeee;  /* for ha-date-picker-style */
      --paper-grey-500: #9e9e9e;  /* --label-badge-grey */

      /* for paper-slider */
      --paper-green-400: #66bb6a;
      --paper-blue-400: #42a5f5;
      --paper-orange-400: #ffa726;

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

      /* set our slider style */
      --ha-slider-pin-font-size: 15px;

      /* rgb */
      --rgb-primary-color: 3, 169, 244;
      --rgb-accent-color: 255, 152, 0;
      --rgb-primary-text-color: 33, 33, 33;
      --rgb-secondary-text-color: 114, 114, 114;
      --rgb-text-primary-color: 255, 255, 255;
      --rgb-card-background-color: 255, 255, 255;

      /* Vaadin typography */
      --material-h6-font-size: 1.25rem;
      --material-small-font-size: 0.875rem;
      --material-caption-font-size: 0.75rem;
      --material-button-font-size: 0.875rem;

      ${Object.entries(derivedStyles)
        .map(([key, value]) => `--${key}: ${value};`)
        .join("")}
    }

    /*
      prevent clipping of positioned elements in a small scrollable
      force smooth scrolling if can scroll
      use non-shady selectors so this only targets iOS 9
      conditional mixin set in ha-style-dialog does not work with shadyCSS
    */
    paper-dialog-scrollable:not(.can-scroll) > .scrollable {
      -webkit-overflow-scrolling: auto !important;
    }

    paper-dialog-scrollable.can-scroll > .scrollable {
      -webkit-overflow-scrolling: touch !important;
    }

    /* for paper-dialog */
    iron-overlay-backdrop {
      backdrop-filter: var(--dialog-backdrop-filter, none);
    }
  </style>
</custom-style>`;

document.head.appendChild(documentContainer.content);
