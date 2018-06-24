import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

class HuiIframeCard extends PolymerElement {
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
      </style>
      <ha-card>
        <iframe id="ifr" height="[[config.height]]" src="[[config.url]]" frameborder="0"></iframe>
      </ha-card>
    `;
  }
}
customElements.define('hui-iframe-card', HuiIframeCard);
