import "@material/mwc-button";
import "@polymer/paper-card/paper-card";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";
import { ANSI_HTML_STYLE, parseTextToColoredPre } from "../ansi-to-html";

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
          white-space: pre-wrap;
          overflow-wrap: break-word;
        }
        ${ANSI_HTML_STYLE}
      </style>
      <paper-card heading="Log">
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
      addonSlug: {
        type: String,
        observer: "addonSlugChanged",
      },
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
      .then((text) => {
        while (this.$.content.lastChild) {
          this.$.content.removeChild(this.$.content.lastChild);
        }
        this.$.content.appendChild(parseTextToColoredPre(text));
      });
  }
}

customElements.define("hassio-addon-logs", HassioAddonLogs);
