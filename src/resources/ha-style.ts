import "@polymer/paper-styles/paper-styles";
import "@polymer/polymer/lib/elements/custom-style";
import { haStyle, haStyleDialog } from "./styles";

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
      --disabled-text-color: #bdbdbd;

      /* main interface colors */
      --primary-color: #03a9f4;
      --dark-primary-color: #0288d1;
      --light-primary-color: #b3e5fC;
      --accent-color: #ff9800;
      --divider-color: rgba(0, 0, 0, .12);

      --scrollbar-thumb-color: rgb(194, 194, 194);


      --error-color: #db4437;
      --error-state-color: var(--error-color);

      /* states and badges */
      --state-icon-color: #44739e;
      --state-icon-active-color: #FDD835;
      --state-icon-unavailable-color: var(--disabled-text-color);

      /* background and sidebar */
      --card-background-color: #ffffff;
      --primary-background-color: #fafafa;
      --secondary-background-color: #e5e5e5; /* behind the cards on state */

      /* sidebar menu */
      --sidebar-text-color: var(--primary-text-color);
      --sidebar-background-color: var(--paper-listbox-background-color); /* backward compatible with existing themes */
      --sidebar-icon-color: rgba(0, 0, 0, 0.5);
      --sidebar-selected-text-color: var(--primary-color);
      --sidebar-selected-icon-color: var(--primary-color);

      /* controls */
      --switch-checked-button-color: var(--primary-color, var(--paper-grey-50));
      --switch-checked-track-color: var(--primary-color, #000000);
      --switch-unchecked-button-color: var(--switch-unchecked-color, var(--paper-grey-50));
      --switch-unchecked-track-color: var(--switch-unchecked-color, #000000);
      --slider-color: var(--primary-color);
      --slider-secondary-color: var(--light-primary-color);
      --slider-bar-color: var(--disabled-text-color);

      /* for label-badge */
      --label-badge-background-color: white;
      --label-badge-text-color: rgb(76, 76, 76);
      --label-badge-red: #DF4C1E;
      --label-badge-blue: #039be5;
      --label-badge-green: #0DA035;
      --label-badge-yellow: #f4b400;
      --label-badge-grey: var(--paper-grey-500);

      /*
        Paper-styles color.html dependency is stripped on build.
        When a default paper-style color is used, it needs to be copied
        from paper-styles/color.html to here.
      */

      --paper-grey-50: #fafafa; /* default for: --mwc-switch-unchecked-button-color */
      --paper-grey-200: #eeeeee;  /* for ha-date-picker-style */
      --paper-grey-500: #9e9e9e;  /* --label-badge-grey */

      /* for paper-spinner */
      --google-red-500: #db4437;
      --google-blue-500: #4285f4;
      --google-green-500: #0f9d58;
      --google-yellow-500: #f4b400;
      --paper-spinner-color: var(--primary-color);

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

      /* derived colors, to keep existing themes mostly working */
      --paper-card-background-color: var(--card-background-color);
      --paper-listbox-background-color: var(--card-background-color);
      --paper-item-icon-color: var(--state-icon-color);
      --paper-item-icon-active-color: var(--state-icon-active-color);
      --table-row-background-color: var(--primary-background-color);
      --table-row-alternative-background-color: var(--secondary-background-color);

      /* set our slider style */
      --paper-slider-knob-color: var(--slider-color);
      --paper-slider-knob-start-color: var(--slider-color);
      --paper-slider-pin-color: var(--slider-color);
      --paper-slider-active-color: var(--slider-color);
      --paper-slider-secondary-color: var(--slider-secondary-color);
      --paper-slider-container-color: var(--slider-bar-color);
      --ha-paper-slider-pin-font-size: 15px;

      /* set data table style */
      --data-table-background-color: var(--card-background-color);

      /* rgb */
      --rgb-primary-color: 3, 169, 244;
      --rgb-accent-color: 255, 152, 0;
      --rgb-primary-text-color: 33, 33, 33;
      --rgb-secondary-text-color: 114, 114, 114;
      --rgb-text-primary-color: 255, 255, 255;

      /* mwc */
      --mdc-theme-primary: var(--primary-color);
      --mdc-theme-secondary: var(--accent-color);
      --mdc-theme-background: var(--primary-background-color);
      --mdc-theme-surface: var(--paper-card-background-color, var(--card-background-color));

      /* mwc text styles */
      --mdc-theme-on-primary: var(--text-primary-color);
      --mdc-theme-on-secondary: var(--text-primary-color);
      --mdc-theme-on-surface: var(--primary-text-color);
    }
  </style>

  <style shady-unscoped="">
    /*
      prevent clipping of positioned elements in a small scrollable
      force smooth scrolling if can scroll
      use non-shady selectors so this only targets iOS 9
      conditional mixin set in ha-style-dialog does not work with shadyCSS
    */
    paper-dialog-scrollable:not(.can-scroll) &gt; .scrollable {
      -webkit-overflow-scrolling: auto !important;
    }

    paper-dialog-scrollable.can-scroll &gt; .scrollable {
      -webkit-overflow-scrolling: touch !important;
    }
  </style>
</custom-style><dom-module id="ha-style">
  <template>
    <style>
    ${haStyle.cssText}
    </style>
  </template>
</dom-module><dom-module id="ha-style-dialog">
  <template>
    <style>
      ${haStyleDialog.cssText}
    </style>
  </template>
</dom-module>`;

document.head.appendChild(documentContainer.content);
