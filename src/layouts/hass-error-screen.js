import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import "@polymer/paper-button/paper-button";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

class HassErrorScreen extends PolymerElement {
  static get template() {
    return html`
    <style include="iron-flex ha-style">
      .placeholder {
        height: 100%;
      }

      .layout {
        height: calc(100% - 64px);
      }

      paper-button {
        font-weight: bold;
        color: var(--primary-color);
      }
    </style>

    <div class="placeholder">
      <app-toolbar>
        <div main-title="">[[title]]</div>
      </app-toolbar>
      <div class="layout vertical center-center">
        <h3>[[error]]</h3>
        <slot><paper-button on-click="backTapped">go back</paper-button></slot>
      </div>
    </div>
`;
  }

  static get properties() {
    return {
      title: {
        type: String,
        value: "Home Assistant",
      },

      error: {
        type: String,
        value: "Oops! It looks like something went wrong.",
      },
    };
  }

  backTapped() {
    history.back();
  }
}

customElements.define("hass-error-screen", HassErrorScreen);
