import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../components/ha-card.js';
import '../../../components/ha-markdown.js';

class HuiMarkdownCard extends PolymerElement {
  static get template() {
    return html`
      <style>
        :host {
          @apply --paper-font-body1;
        }
        ha-markdown {
          display: block;
          padding: 0 16px 16px;
          -ms-user-select: initial;
          -webkit-user-select: initial;
          -moz-user-select: initial;
        }
        :host([no-title]) ha-markdown {
          padding-top: 16px;
        }
        ha-markdown p:first-child {
          margin-top: 0;
        }
        ha-markdown p:last-child {
          margin-bottom: 0;
        }
        ha-markdown a {
          color: var(--primary-color);
        }
        ha-markdown img {
          max-width: 100%;
        }
      </style>
      <ha-card header="[[_config.title]]">
        <ha-markdown content='[[_config.content]]'></ha-markdown>
      </ha-card>
    `;
  }

  static get properties() {
    return {
      _config: Object,
      noTitle: {
        type: Boolean,
        reflectToAttribute: true,
        computed: '_computeNoTitle(config.title)',
      },
    };
  }

  setConfig(config) {
    this._config = config;
  }

  getCardSize() {
    return this._config.content.split('\n').length;
  }

  _computeNoTitle(title) {
    return !title;
  }
}

customElements.define('hui-markdown-card', HuiMarkdownCard);
