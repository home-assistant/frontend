import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-card/paper-card.js';
import '@polymer/iron-autogrow-textarea/iron-autogrow-textarea.js';
import '@polymer/paper-button/paper-button.js';
import '../../src/components/buttons/ha-call-api-button.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
class HassioAddonConfig extends PolymerElement {
  static get template() {
    return html`
    <style include="ha-style">
      :host {
        display: block;
      }
      paper-card {
        display: block;
      }
      .card-actions {
        @apply --layout;
        @apply --layout-justified;
      }
      .errors {
        color: var(--google-red-500);
        margin-bottom: 16px;
      }
      iron-autogrow-textarea {
        width: 100%;
        font-family: monospace;
      }
      .syntaxerror {
        color: var(--google-red-500);
      }
    </style>
    <paper-card heading="Config">
      <div class="card-content">
        <template is="dom-if" if="[[error]]">
          <div class="errors">[[error]]</div>
        </template>
        <iron-autogrow-textarea id="config" value="{{config}}"></iron-autogrow-textarea>
      </div>
      <div class="card-actions">
        <ha-call-api-button class="warning" hass="[[hass]]" path="hassio/addons/[[addonSlug]]/options" data="[[resetData]]">Reset to defaults</ha-call-api-button>
        <paper-button on-click="saveTapped" disabled="[[!configParsed]]">Save</paper-button>
      </div>
    </paper-card>
`;
  }

  static get is() { return 'hassio-addon-config'; }

  static get properties() {
    return {
      hass: Object,
      addon: {
        type: Object,
        observer: 'addonChanged',
      },
      addonSlug: String,
      config: {
        type: String,
        observer: 'configChanged',
      },
      configParsed: Object,
      error: String,
      resetData: {
        type: Object,
        value: {
          options: null,
        },
      },
    };
  }

  addonChanged(addon) {
    this.config = addon ? JSON.stringify(addon.options, null, 2) : '';
  }

  configChanged(config) {
    try {
      this.$.config.classList.remove('syntaxerror');
      this.configParsed = JSON.parse(config);
    } catch (err) {
      this.$.config.classList.add('syntaxerror');
      this.configParsed = null;
    }
  }

  saveTapped() {
    this.error = null;

    this.hass.callApi('post', `hassio/addons/${this.addonSlug}/options`, {
      options: this.configParsed
    }).catch((resp) => {
      this.error = resp.body.message;
    });
  }
}

customElements.define(HassioAddonConfig.is, HassioAddonConfig);
