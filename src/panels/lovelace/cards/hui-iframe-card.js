import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

class HuiIframeCard extends PolymerElement {
  static get properties() {
    return {
      config: {
        type: Object,
        observer: '_configChanged'
      }
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
        .wrapper {
          width: 100%;
          position: relative;
        }
        iframe {
          border: none;
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }
      </style>
      <ha-card>
        <template is="dom-if" if="[[_computeTitle(config)]]">
          <div class="header">
            <div class="name">[[_computeTitle(config)]]</div>
          </div>
        </template>
        <div class="wrapper">
          <iframe src="[[config.url]]"></iframe>
        </div>
      </ha-card>
    `;
  }

  _computeTitle(config) {
    if (!config.url) return 'Error: URL not configured';
    return config.title || '';
  }

  _configChanged(config) {
    this.shadowRoot.querySelector('.wrapper').style.paddingTop = config.aspect_ratio || '50%';
  }

  getCardSize() {
    return 1 + (this.offsetHeight / 50);
  }
}
customElements.define('hui-iframe-card', HuiIframeCard);
