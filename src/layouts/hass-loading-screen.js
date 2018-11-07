import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import "@polymer/paper-spinner/paper-spinner";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../components/ha-menu-button";

class HassLoadingScreen extends PolymerElement {
  static get template() {
    return html`
      <style include="iron-flex ha-style">
        .placeholder {
          height: 100%;
        }

        .layout {
          height: calc(100% - 64px);
        }
      </style>

      <div class="placeholder">
        <app-toolbar>
          <ha-menu-button
            narrow="[[narrow]]"
            show-menu="[[showMenu]]"
          ></ha-menu-button>
          <div main-title="">[[title]]</div>
        </app-toolbar>
        <div class="layout horizontal center-center">
          <paper-spinner active=""></paper-spinner>
        </div>
      </div>
    `;
  }

  static get properties() {
    return {
      narrow: {
        type: Boolean,
        value: false,
      },

      showMenu: {
        type: Boolean,
        value: false,
      },

      title: {
        type: String,
        value: "",
      },
    };
  }
}

customElements.define("hass-loading-screen", HassLoadingScreen);
