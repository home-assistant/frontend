import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

class HuiIframeCard extends PolymerElement {
  static get template() {
    return html`
      <style>
        ha-card {
          line-height: 0;
          overflow: hidden;
        }
        #root {
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
      <ha-card header="[[_config.title]]">
        <div id="root">
          <iframe src="[[_config.url]]"></iframe>
        </div>
      </ha-card>
    `;
  }

  static get properties() {
    return {
      _config: Object,
    };
  }

  ready() {
    super.ready();
    if (this._config) this._buildConfig();
  }

  setConfig(config) {
    this._config = config;
    if (this.$) this._buildConfig();
  }

  _buildConfig() {
    const config = this._config;

    this.$.root.style.paddingTop = config.aspect_ratio || '50%';
  }

  getCardSize() {
    return 1 + (this.offsetHeight / 50);
  }
}
customElements.define('hui-iframe-card', HuiIframeCard);
