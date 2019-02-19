import "@material/mwc-button";
import "@polymer/paper-card/paper-card";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";
import { ANSI_HTML_STYLE, parseTextToColoredPre } from "../ansi-to-html";

class HassioSupervisorLog extends PolymerElement {
  static get template() {
    return html`
      <style include="ha-style">
        paper-card {
          display: block;
        }
        pre {
          overflow-x: auto;
          white-space: pre-wrap;
          overflow-wrap: break-word;
        }
        .fg-green {
          color: var(--primary-text-color) !important;
        }
      </style>
      ${ANSI_HTML_STYLE}
      <paper-card>
        <div class="card-content" id="content"></div>
        <div class="card-actions">
          <mwc-button on-click="refresh">Refresh</mwc-button>
        </div>
      </paper-card>
    `;
  }

  static get properties() {
    return {
      hass: Object,
    };
  }

  ready() {
    super.ready();
    this.loadData();
  }

  loadData() {
    this.hass.callApi("get", "hassio/supervisor/logs").then(
      (text) => {
        while (this.$.content.lastChild) {
          this.$.content.removeChild(this.$.content.lastChild);
        }
        this.$.content.appendChild(parseTextToColoredPre(text));
      },
      () => {
        this.$.content.innerHTML =
          '<span class="fg-red bold">Error fetching logs</span>';
      }
    );
  }

  refresh() {
    this.loadData();
  }
}

customElements.define("hassio-supervisor-log", HassioSupervisorLog);
