import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-button/paper-button.js';
import '../../src/resources/ha-style.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

class HassioAddonLogs extends PolymerElement {
  static get template() {
    return html`
    <style include="ha-style">
      :host,
      paper-card {
        display: block;
      }
    </style>
    <paper-card heading="Log">
      <div class="card-content">
        <pre>[[log]]</pre>
      </div>
      <div class="card-actions">
        <paper-button on-click="refresh">Refresh</paper-button>
      </div>
    </paper-card>
`;
  }

  static get is() { return 'hassio-addon-logs'; }

  static get properties() {
    return {
      hass: Object,
      addonSlug: {
        type: String,
        observer: 'addonSlugChanged',
      },
      log: String,
    };
  }

  addonSlugChanged(slug) {
    if (!this.hass) {
      setTimeout(() => { this.addonChanged(slug); }, 0);
      return;
    }

    this.refresh();
  }

  refresh() {
    this.hass.callApi('get', `hassio/addons/${this.addonSlug}/logs`)
      .then((info) => {
        this.log = info;
      });
  }
}

customElements.define(HassioAddonLogs.is, HassioAddonLogs);
