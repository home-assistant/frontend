import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-button/paper-button.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
class HassioSupervisorLog extends PolymerElement {
  static get template() {
    return html`
    <style include="ha-style">
      paper-card {
        display: block;
      }
    </style>
    <paper-card>
      <div class="card-content">
        <pre>[[log]]</pre>
      </div>
      <div class="card-actions">
        <paper-button on-click="refreshTapped">Refresh</paper-button>
      </div>
    </paper-card>
`;
  }

  static get is() { return 'hassio-supervisor-log'; }

  static get properties() {
    return {
      hass: Object,
      log: String,
    };
  }

  ready() {
    super.ready();
    this.loadData();
  }

  loadData() {
    this.hass.callApi('get', 'hassio/supervisor/logs')
      .then((info) => {
        this.log = info;
      }, () => {
        this.log = 'Error fetching logs';
      });
  }

  refreshTapped() {
    this.loadData();
  }
}

customElements.define(HassioSupervisorLog.is, HassioSupervisorLog);
