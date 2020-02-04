import "@polymer/paper-styles/paper-styles";
import "@polymer/polymer/lib/elements/custom-style";
import { haStyle, haStyleDialog, derivedStyles } from "./styles";

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

      /* states and badges */
      --state-icon-color: #44739e;
      --state-icon-active-color: #FDD835;

      /* background and sidebar */
      --card-background-color: #ffffff;
      --primary-background-color: #fafafa;
      --secondary-background-color: #e5e5e5; /* behind the cards on state */

      /* sidebar menu */
      --sidebar-icon-color: rgba(0, 0, 0, 0.5);

      /* for label-badge */
      --label-badge-background-color: white;
      --label-badge-text-color: rgb(76, 76, 76);
      --label-badge-red: #DF4C1E;
      --label-badge-blue: #039be5;
      --label-badge-green: #0DA035;
      --label-badge-yellow: #f4b400;

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
      --ha-paper-slider-pin-font-size: 15px;

      /* rgb */
      --rgb-primary-color: 3, 169, 244;
      --rgb-accent-color: 255, 152, 0;
      --rgb-primary-text-color: 33, 33, 33;
      --rgb-secondary-text-color: 114, 114, 114;
      --rgb-text-primary-color: 255, 255, 255;

      ${Object.entries(derivedStyles)
        .map(([key, value]) => `--${key}: ${value};`)
        .join("")}
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
