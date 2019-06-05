import "@material/mwc-button";
import "@polymer/paper-card/paper-card";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../src/components/buttons/ha-call-api-button";
import { EventsMixin } from "../../../src/mixins/events-mixin";

class HassioSupervisorInfo extends EventsMixin(PolymerElement) {
  static get template() {
    return html`
      <style>
        paper-card {
          display: inline-block;
          width: 400px;
        }
        .card-content {
          height: 200px;
          color: var(--primary-text-color);
        }
        @media screen and (max-width: 830px) {
          paper-card {
            width: 100%;
          }
          .card-content {
            height: auto;
          }
        }
        .info {
          width: 100%;
        }
        .info td:nth-child(2) {
          text-align: right;
        }
        .errors {
          color: var(--google-red-500);
          margin-top: 16px;
        }
      </style>
      <paper-card>
        <div class="card-content">
          <h2>Hass.io supervisor</h2>
          <table class="info">
            <tbody>
              <tr>
                <td>Version</td>
                <td>[[data.version]]</td>
              </tr>
              <tr>
                <td>Latest version</td>
                <td>[[data.last_version]]</td>
              </tr>
              <template is="dom-if" if='[[!_equals(data.channel, "stable")]]'>
                <tr>
                  <td>Channel</td>
                  <td>[[data.channel]]</td>
                </tr>
              </template>
            </tbody>
          </table>
          <template is="dom-if" if="[[errors]]">
            <div class="errors">Error: [[errors]]</div>
          </template>
        </div>
        <div class="card-actions">
          <ha-call-api-button hass="[[hass]]" path="hassio/supervisor/reload"
            >Reload</ha-call-api-button
          >
          <template is="dom-if" if="[[computeUpdateAvailable(data)]]">
            <ha-call-api-button hass="[[hass]]" path="hassio/supervisor/update"
              >Update</ha-call-api-button
            >
          </template>
          <template is="dom-if" if='[[_equals(data.channel, "beta")]]'>
            <ha-call-api-button
              hass="[[hass]]"
              path="hassio/supervisor/options"
              data="[[leaveBeta]]"
              >Leave beta channel</ha-call-api-button
            >
          </template>
          <template is="dom-if" if='[[_equals(data.channel, "stable")]]'>
            <mwc-button
              on-click="_joinBeta"
              class="warning"
              title="Get beta updates for Home Assistant (RCs), supervisor and host"
              >Join beta channel</mwc-button
            >
          </template>
        </div>
      </paper-card>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      data: Object,
      errors: String,
      leaveBeta: {
        type: Object,
        value: { channel: "stable" },
      },
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

    var response = ev.detail.response;

    if (typeof response.body === "object") {
      this.errors = response.body.message || "Unknown error";
    } else {
      this.errors = response.body;
    }
  }

  computeUpdateAvailable(data) {
    return data.version !== data.last_version;
  }

  _equals(a, b) {
    return a === b;
  }

  _joinBeta() {
    if (
      !confirm(`WARNING:
Beta releases are for testers and early adopters and can contain unstable code changes. Make sure you have backups of your data before you activate this feature.

This inludes beta releases for:
- Home Assistant (Release Candidates)
- Hass.io supervisor
- Host system`)
    ) {
      return;
    }
    const method = "post";
    const path = "hassio/supervisor/options";
    const data = { channel: "beta" };

    const eventData = {
      method: method,
      path: path,
      data: data,
    };

    this.hass
      .callApi(method, path, data)
      .then(
        (resp) => {
          eventData.success = true;
          eventData.response = resp;
        },
        (resp) => {
          eventData.success = false;
          eventData.response = resp;
        }
      )
      .then(() => {
        this.fire("hass-api-called", eventData);
      });
  }
}

customElements.define("hassio-supervisor-info", HassioSupervisorInfo);
