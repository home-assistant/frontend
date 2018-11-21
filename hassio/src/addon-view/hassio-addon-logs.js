import "@polymer/paper-button/paper-button";
import "@polymer/paper-card/paper-card";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../src/resources/ha-style";

class HassioAddonLogs extends PolymerElement {
  static get template() {
    return html`
      <style include="ha-style">
        :host,
        paper-card {
          display: block;
        }
        pre {
          overflow-x: auto;
        }
      </style>
      <paper-card heading="Log">
        <div class="card-content"><pre>[[log]]</pre></div>
        <div class="card-actions">
          <paper-button on-click="refresh">Refresh</paper-button>
        </div>
      </paper-card>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      addonSlug: {
        type: String,
        observer: "addonSlugChanged",
      },
      log: String,
    };
  }

  addonSlugChanged(slug) {
    if (!this.hass) {
      setTimeout(() => {
        this.addonChanged(slug);
      }, 0);
      return;
    }

    this.refresh();
  }

  refresh() {
    this.hass
      .callApi("get", `hassio/addons/${this.addonSlug}/logs`)
      .then((info) => {
        this.log = info;
      });
  }
}

customElements.define("hassio-addon-logs", HassioAddonLogs);
