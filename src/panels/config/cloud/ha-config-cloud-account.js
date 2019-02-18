import "@material/mwc-button";
import "@polymer/paper-card/paper-card";
import "@polymer/paper-item/paper-item-body";
import "@polymer/paper-toggle-button/paper-toggle-button";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../components/buttons/ha-call-api-button";
import "../../../layouts/hass-subpage";
import "../../../resources/ha-style";

import "../ha-config-section";
import "./cloud-webhooks";

import formatDateTime from "../../../common/datetime/format_date_time";
import EventsMixin from "../../../mixins/events-mixin";
import LocalizeMixin from "../../../mixins/localize-mixin";
import { fireEvent } from "../../../common/dom/fire_event";

import { fetchSubscriptionInfo } from "./data";
import "./cloud-alexa-pref";
import "./cloud-google-pref";

let registeredWebhookDialog = false;

/*
 * @appliesMixin EventsMixin
 * @appliesMixin LocalizeMixin
 */
class HaConfigCloudAccount extends EventsMixin(LocalizeMixin(PolymerElement)) {
  static get template() {
    return html`
      <style include="iron-flex ha-style">
        [slot="introduction"] {
          margin: -1em 0;
        }
        [slot="introduction"] a {
          color: var(--primary-color);
        }
        .content {
          padding-bottom: 24px;
          direction: ltr;
        }
        paper-card {
          display: block;
        }
        .account-row {
          display: flex;
          padding: 0 16px;
        }
        mwc-button {
          align-self: center;
        }
        .soon {
          font-style: italic;
          margin-top: 24px;
          text-align: center;
        }
        .nowrap {
          white-space: nowrap;
        }
        .wrap {
          white-space: normal;
        }
        .status {
          text-transform: capitalize;
          padding: 16px;
        }
      </style>
      <hass-subpage header="Home Assistant Cloud">
        <div class="content">
          <ha-config-section is-wide="[[isWide]]">
            <span slot="header">Home Assistant Cloud</span>
            <div slot="introduction">
              <p>
                Thank you for being part of Home Assistant Cloud. It's because
                of people like you that we are able to make a great home
                automation experience for everyone. Thank you!
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
                <paper-item-body> Cloud connection status </paper-item-body>
                <div class="status">[[cloudStatus.cloud]]</div>
              </div>

              <div class="card-actions">
                <a href="https://account.nabucasa.com" target="_blank"
                  ><mwc-button>Manage Account</mwc-button></a
                >
                <mwc-button style="float: right" on-click="handleLogout"
                  >Sign out</mwc-button
                >
              </div>
            </paper-card>
          </ha-config-section>

          <ha-config-section is-wide="[[isWide]]">
            <span slot="header">Integrations</span>
            <div slot="introduction">
              <p>
                Integrations for Home Assistant Cloud allow you to connect with
                services in the cloud without having to expose your Home
                Assistant instance publicly on the internet.
              </p>
              <p>
                Check the website for
                <a href="https://www.nabucasa.com" target="_blank"
                  >all available features</a
                >.
              </p>
            </div>

            <cloud-alexa-pref
              hass="[[hass]]"
              cloud-status="[[cloudStatus]]"
            ></cloud-alexa-pref>

            <cloud-google-pref
              hass="[[hass]]"
              cloud-status="[[cloudStatus]]"
            ></cloud-google-pref>

            <cloud-webhooks
              hass="[[hass]]"
              cloud-status="[[cloudStatus]]"
            ></cloud-webhooks>
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

  connectedCallback() {
    super.connectedCallback();

    if (!registeredWebhookDialog) {
      registeredWebhookDialog = true;
      fireEvent(this, "register-dialog", {
        dialogShowEvent: "manage-cloud-webhook",
        dialogTag: "cloud-webhook-manage-dialog",
        dialogImport: () =>
          import(/* webpackChunkName: "cloud-webhook-manage-dialog" */ "./cloud-webhook-manage-dialog"),
      });
    }
  }

  async _fetchSubscriptionInfo() {
    this._subscription = await fetchSubscriptionInfo(this.hass);
    if (
      this._subscription.provider &&
      this.cloudStatus &&
      this.cloudStatus.cloud !== "connected"
    ) {
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
}

customElements.define("ha-config-cloud-account", HaConfigCloudAccount);
