import "@polymer/paper-button/paper-button.js";
import "@polymer/paper-card/paper-card.js";
import "@polymer/paper-item/paper-item-body.js";
import "@polymer/paper-toggle-button/paper-toggle-button.js";
import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import "../../../components/buttons/ha-call-api-button.js";
import "../../../layouts/hass-subpage.js";
import "../../../resources/ha-style.js";

import "../ha-config-section.js";

import formatDateTime from "../../../common/datetime/format_date_time.js";
import EventsMixin from "../../../mixins/events-mixin.js";
import LocalizeMixin from "../../../mixins/localize-mixin.js";

/*
 * @appliesMixin EventsMixin
 * @appliesMixin LocalizeMixin
 */
class HaConfigCloudAccount extends EventsMixin(LocalizeMixin(PolymerElement)) {
  static get template() {
    return html`
    <style include="iron-flex ha-style">
      [slot=introduction] {
        margin: -1em 0;
      }
      [slot=introduction] a {
        color: var(--primary-color);
      }
      .content {
        padding-bottom: 24px;
      }
      paper-card {
        display: block;
      }
      .account-row {
        display: flex;
        padding: 0 16px;
      }
      paper-button {
        align-self: center;
      }
      .soon {
        font-style: italic;
        margin-top: 24px;
        text-align: center;
      }
      .nowrap {
        white-space: nowrap;;
      }
      .wrap {
        white-space: normal;
      }
      .status {
        text-transform: capitalize;
        padding: 16px;
      }
      paper-button {
        color: var(--primary-color);
        font-weight: 500;
      }
      a {
        color: var(--primary-color);
      }
      paper-card > paper-toggle-button {
        position: absolute;
        right: 8px;
        top: 16px;
      }
    </style>
    <hass-subpage header="Home Assistant Cloud">
      <div class="content">
        <ha-config-section is-wide="[[isWide]]">
          <span slot="header">Home Assistant Cloud</span>
          <div slot="introduction">
            <p>
              Thank you for being part of Home Assistant Cloud. It's because of people like you that we are able to make a great home automation experience for everyone. Thank you!
            </p>
          </div>

          <paper-card heading="Nabu Casa Account">
            <div class="account-row">
              <paper-item-body two-line="">
                [[cloudStatus.email]]
                <div secondary="" class="wrap">
                  [[_formatSubscription(_subscription)]]
                </div>
              </paper-item-body>
            </div>

            <div class="account-row">
              <paper-item-body>
                Cloud connection status
              </paper-item-body>
              <div class="status">[[cloudStatus.cloud]]</div>
            </div>

            <div class='card-actions'>
              <a href='https://account.nabucasa.com' target='_blank'><paper-button>Manage Account</paper-button></a>
              <paper-button style='float: right' on-click="handleLogout">Sign out</paper-button>
            </div>
          </paper-card>
        </ha-config-section>

        <ha-config-section is-wide="[[isWide]]">
          <span slot="header">Integrations</span>
          <div slot="introduction">
            <p>
              Integrations for Home Assistant Cloud allow you to connect with services in the cloud without having to expose your Home Assistant instance publicly on the internet.
            </p>
            <p>
              Check the website for <a href='https://www.nabucasa.com' target='_blank'>all available features</a>.
            </p>
          </div>

          <paper-card heading="Alexa">
            <paper-toggle-button
              checked='[[cloudStatus.alexa_enabled]]'
              on-change='_alexaChanged'
            ></paper-toggle-button>
            <div class="card-content">
              With the Alexa integration for Home Assistant Cloud you'll be able to control all your Home Assistant devices via any Alexa-enabled device.
              <ul>
                <li>
                  To activate, search in the Alexa app for the Home Assistant Smart Home skill.
                </li>
                <li>
                  <a href="https://www.home-assistant.io/cloud/alexa/" target="_blank">
                    Config documentation
                  </a>
                </li>
              </ul>
              <p><em>This integration requires an Alexa-enabled device like the Amazon Echo.</em></p>
            </div>
          </paper-card>

          <paper-card heading="Google Assistant">
            <paper-toggle-button
              checked='[[cloudStatus.google_enabled]]'
              on-change='_googleChanged'
            ></paper-toggle-button>
            <div class="card-content">
              With the Google Assistant integration for Home Assistant Cloud you'll be able to control all your Home Assistant devices via any Google Assistant-enabled device.
              <ul>
                <li>
                  <a href="https://assistant.google.com/services/a/uid/00000091fd5fb875" target="_blank">
                    Activate the Home Assistant skill for Google Assistant
                  </a>
                </li>
                <li>
                  <a href="https://www.home-assistant.io/cloud/google_assistant/" target="_blank">
                    Config documentation
                  </a>
                </li>
              </ul>
              <p><em>This integration requires a Google Assistant-enabled device like the Google Home or Android phone.</em></p>
            </div>
            <div class="card-actions">
              <ha-call-api-button
                hass="[[hass]]"
                disabled='[[!cloudStatus.google_enabled]]'
                path="cloud/google_actions/sync"
              >Sync devices</ha-call-api-button>
            </div>
          </paper-card>
        </ha-config-section>
      </div>
    </hass-subpage>
`;
  }

  static get properties() {
    return {
      hass: Object,
      isWide: Boolean,
      cloudStatus: Object,
      _subscription: {
        type: Object,
        value: null,
      },
    };
  }

  ready() {
    super.ready();
    this._fetchSubscriptionInfo();
  }

  async _fetchSubscriptionInfo() {
    this._subscription = await this.hass.callWS({ type: "cloud/subscription" });
    if (this._subscription.provider && this.cloudStatus.cloud !== "connected") {
      this.fire("ha-refresh-cloud-status");
    }
  }

  handleLogout() {
    this.hass
      .callApi("post", "cloud/logout")
      .then(() => this.fire("ha-refresh-cloud-status"));
  }

  _formatSubscription(subInfo) {
    if (subInfo === null) {
      return "Fetching subscription…";
    }

    let description = subInfo.human_description;

    if (subInfo.plan_renewal_date) {
      description = description.replace(
        "{periodEnd}",
        formatDateTime(
          new Date(subInfo.plan_renewal_date * 1000),
          this.hass.language
        )
      );
    }

    return description;
  }

  _alexaChanged(ev) {
    this._handleToggleChange("alexa_enabled", ev.target);
  }

  _googleChanged(ev) {
    this._handleToggleChange("google_enabled", ev.target);
  }

  async _handleToggleChange(property, element) {
    try {
      await this.hass.callWS({
        type: "cloud/update_prefs",
        [property]: element.checked,
      });
      this.fire("ha-refresh-cloud-status");
    } catch (err) {
      element.checked = !element.checked;
    }
  }
}

customElements.define("ha-config-cloud-account", HaConfigCloudAccount);
