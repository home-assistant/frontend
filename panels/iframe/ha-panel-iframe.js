import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/app-layout/app-toolbar/app-toolbar.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import '../../src/components/ha-menu-button.js';
import '../../src/resources/ha-style.js';

class HaPanelIframe extends PolymerElement {
  static get template() {
    return html`
    <style include='ha-style'>
      iframe {
        border: 0;
        width: 100%;
        height: calc(100% - 64px);
      }
    </style>
    <app-toolbar>
      <ha-menu-button narrow='[[narrow]]' show-menu='[[showMenu]]'></ha-menu-button>
      <div main-title>[[panel.title]]</div>
    </app-toolbar>

    <iframe
      src='[[panel.config.url]]'
      sandbox="allow-forms allow-popups allow-pointer-lock allow-same-origin allow-scripts"
      allowfullscreen="true" webkitallowfullscreen="true" mozallowfullscreen="true"
    ></iframe>
    `;
  }
  static get is() { return 'ha-panel-iframe'; }

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

customElements.define(HaPanelIframe.is, HaPanelIframe);
