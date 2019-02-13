import "@material/mwc-button";
import "@polymer/paper-card/paper-card";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../src/components/buttons/ha-call-api-button";
import "../components/hassio-card-content";
import "../resources/hassio-style";

class HassioHassUpdate extends PolymerElement {
  static get template() {
    return html`
      <style include="ha-style hassio-style">
        paper-card {
          display: block;
          margin-bottom: 32px;
        }
        .errors {
          color: var(--google-red-500);
          margin-top: 16px;
        }
        a {
          color: var(--primary-color);
        }
      </style>
      <template is="dom-if" if="[[computeUpdateAvailable(hassInfo)]]">
        <div class="content">
          <div class="card-group">
            <div class="title">Update available! 🎉</div>
            <paper-card>
              <div class="card-content">
                <hassio-card-content
                  hass="[[hass]]"
                  title="Home Assistant [[hassInfo.last_version]] is available"
                  description="You are currently running version [[hassInfo.version]]"
                  icon="hassio:home-assistant"
                  icon-class="hassupdate"
                ></hassio-card-content>
                <template is="dom-if" if="[[error]]">
                  <div class="error">Error: [[error]]</div>
                </template>
                <p>
                  <a
                    href="https://www.home-assistant.io/latest-release-notes/"
                    target="_blank"
                    >Read the release notes</a
                  >
                </p>
              </div>
              <div class="card-actions">
                <ha-call-api-button
                  hass="[[hass]]"
                  path="hassio/homeassistant/update"
                  >Update</ha-call-api-button
                >
                <a
                  href="https://github.com/home-assistant/home-assistant/releases"
                  target="_blank"
                  ><mwc-button>Release notes</mwc-button></a
                >
              </div>
            </paper-card>
          </div>
        </div>
      </template>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      hassInfo: Object,
      error: String,
    };
  }

  ready() {
    super.ready();
    this.addEventListener("hass-api-called", (ev) => this.apiCalled(ev));
  }

  apiCalled(ev) {
    if (ev.detail.success) {
      this.errors = null;
      return;
    }

    const response = ev.detail.response;

    if (typeof response.body === "object") {
      this.errors = response.body.message || "Unknown error";
    } else {
      this.errors = response.body;
    }
  }

  computeUpdateAvailable(hassInfo) {
    return hassInfo.version !== hassInfo.last_version;
  }
}

customElements.define("hassio-hass-update", HassioHassUpdate);
