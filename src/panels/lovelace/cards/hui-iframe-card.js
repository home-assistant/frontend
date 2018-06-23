import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

class IframeCard extends PolymerElement {
  static get template() {
    return html`
      <style>
        ha-card {
          position: relative;
          cursor: pointer;
          min-height: 48px;
          line-height: 0;
        }
        iframe {
          width: 100%;
          border-radius: 2px;
        }
        .title {
          @apply --paper-font-common-nowrap;
          position: relative;
          left: 0;
          right: 0;
          bottom: 0;
          padding: 10px;
          line-height: 10px;
          border-bottom-left-radius: 2px;
          border-bottom-right-radius: 2px;
          display: flex;
          justify-content: space-between;
        }
        .title:empty {
          display: none;
        }
      </style>
      <ha-card>
        <iframe height="[[config.height]]" src="[[config.url]]" frameborder="0"></iframe>
        <div class="title" style="background-color:[[config.title-background-color]];color:[[config.title-color]];font-size:[[config.title-font-size]];font-weight:[[config.title-font-weight]];">[[config.title]]</div>
      </ha-card>
    `;
  }
  static get properties() {
    return {
      hass: Object,
      config: {
        type: Object,
      },
    };
  }
}
customElements.define('hui-iframe-card', IframeCard);
