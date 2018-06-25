import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

class HuiIframeCard extends PolymerElement {
  static get properties() {
    return {
      config: Object
    };
  }

  static get template() {
    return html`
      <style>
        ha-card {
          line-height: 0;
          overflow: hidden;
        }
        .header {
          @apply --paper-font-headline;
          /* overwriting line-height +8 because entity-toggle can be 40px height,
            compensating this with reduced padding */
          line-height: 40px;
          color: var(--primary-text-color);
          padding: 20px 16px 12px 16px;
        }
        .header .name {
          @apply --paper-font-common-nowrap;
        }
        iframe {
          width: 100%;
          border: none;
        }
      </style>
      <ha-card>
        <template is="dom-if" if="[[_computeTitle(config)]]">
          <div class="header">
            <div class="name">[[_computeTitle(config)]]</div>
          </div>
        </template>
        <iframe height="[[_computeIframeHeight(config.height)]]" src="[[config.url]]"></iframe>
      </ha-card>
    `;
  }

  _computeTitle(config) {
    if (!config.url) return 'Error: URL not configured';
    return config.title || '';
  }

  _computeIframeHeight(height) {
    return height || '300px';
  }

  getCardSize() {
    return 1 + ((this.config.height ? parseInt(this.config.height) : 300) / 40);
  }
}
customElements.define('hui-iframe-card', HuiIframeCard);
