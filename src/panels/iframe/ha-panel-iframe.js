import "@polymer/app-layout/app-toolbar/app-toolbar";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../components/ha-menu-button";
import "../../resources/ha-style";

class HaPanelIframe extends PolymerElement {
  static get template() {
    return html`
      <style include="ha-style">
        iframe {
          border: 0;
          width: 100%;
          height: calc(100% - 64px);
        }
      </style>
      <app-toolbar>
        <ha-menu-button
          narrow="[[narrow]]"
          show-menu="[[showMenu]]"
        ></ha-menu-button>
        <div main-title>[[panel.title]]</div>
      </app-toolbar>

      <iframe
        src="[[panel.config.url]]"
        sandbox="allow-forms allow-popups allow-pointer-lock allow-same-origin allow-scripts"
        allowfullscreen="true"
        webkitallowfullscreen="true"
        mozallowfullscreen="true"
      ></iframe>
    `;
  }

  static get properties() {
    return {
      panel: {
        type: Object,
      },

      narrow: {
        type: Boolean,
      },

      showMenu: {
        type: Boolean,
      },
    };
  }
}

customElements.define("ha-panel-iframe", HaPanelIframe);
