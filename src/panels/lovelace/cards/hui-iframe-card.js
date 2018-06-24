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
      .header {
        @apply --paper-font-headline;
        /* overwriting line-height +8 because entity-toggle can be 40px height,
           compensating this with reduced padding */
        line-height: 40px;
        color: var(--primary-text-color);
        padding: -1px 0 12px;
        margin-left: 15px;
      }
      .header .name {
        @apply --paper-font-common-nowrap;
      }
      </style>
      <ha-card>
        <div class='header'><div class="name">[[config.title]]</div></div>
        <iframe height="[[config.height]]" src="[[config.url]]" frameborder="0"></iframe>
      </ha-card>
    `;
  }
}
customElements.define('hui-iframe-card', HuiIframeCard);
