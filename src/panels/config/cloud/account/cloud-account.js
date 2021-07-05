import "@material/mwc-button";
import "@polymer/paper-item/paper-item-body";
import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import { formatDateTime } from "../../../../common/datetime/format_date_time";
import { computeRTLDirection } from "../../../../common/util/compute_rtl";
import "../../../../components/buttons/ha-call-api-button";
import "../../../../components/ha-card";
import { fetchCloudSubscriptionInfo } from "../../../../data/cloud";
import "../../../../layouts/hass-subpage";
import { EventsMixin } from "../../../../mixins/events-mixin";
import LocalizeMixin from "../../../../mixins/localize-mixin";
import "../../../../styles/polymer-ha-style";
import "../../ha-config-section";
import "./cloud-alexa-pref";
import "./cloud-google-pref";
import "./cloud-remote-pref";
import "./cloud-tts-pref";
import "./cloud-webhooks";

/*
 * @appliesMixin EventsMixin
 * @appliesMixin LocalizeMixin
 */
class CloudAccount extends EventsMixin(LocalizeMixin(PolymerElement)) {
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
        a {
          color: var(--primary-color);
        }
      </style>
      <hass-subpage
        hass="[[hass]]"
        narrow="[[narrow]]"
        header="Home Assistant Cloud"
      >
        <div class="content">
          <ha-config-section is-wide="[[isWide]]">
            <span slot="header">Home Assistant Cloud</span>
            <div slot="introduction">
              <p>
                [[localize('ui.panel.config.cloud.account.thank_you_note')]]
              </p>
            </div>

            <ha-card
              header="[[localize('ui.panel.config.cloud.account.nabu_casa_account')]]"
            >
              <div class="account-row">
                <paper-item-body two-line="">
                  [[cloudStatus.email]]
                  <div secondary class="wrap">
                    [[_formatSubscription(_subscription)]]
                  </div>
                </paper-item-body>
              </div>

              <div class="account-row">
                <paper-item-body
                  >[[localize('ui.panel.config.cloud.account.connection_status')]]</paper-item-body
                >
                <div class="status">
                  [[_computeConnectionStatus(cloudStatus.cloud)]]
                </div>
              </div>

              <div class="card-actions">
                <a
                  href="https://account.nabucasa.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  <mwc-button
                    >[[localize('ui.panel.config.cloud.account.manage_account')]]</mwc-button
                  >
                </a>
                <mwc-button style="float: right" on-click="handleLogout"
                  >[[localize('ui.panel.config.cloud.account.sign_out')]]</mwc-button
                >
              </div>
            </ha-card>
          </ha-config-section>

          <ha-config-section is-wide="[[isWide]]">
            <span slot="header"
              >[[localize('ui.panel.config.cloud.account.integrations')]]</span
            >
            <div slot="introduction">
              <p>
                [[localize('ui.panel.config.cloud.account.integrations_introduction')]]
              </p>
              <p>
                [[localize('ui.panel.config.cloud.account.integrations_introduction2')]]
                <a
                  href="https://www.nabucasa.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  [[localize('ui.panel.config.cloud.account.integrations_link_all_features')]]</a
                >.
              </p>
            </div>

            <cloud-remote-pref
              hass="[[hass]]"
              cloud-status="[[cloudStatus]]"
              dir="[[_rtlDirection]]"
            ></cloud-remote-pref>

            <cloud-tts-pref
              hass="[[hass]]"
              cloud-status="[[cloudStatus]]"
              dir="[[_rtlDirection]]"
            ></cloud-tts-pref>

            <cloud-alexa-pref
              hass="[[hass]]"
              cloud-status="[[cloudStatus]]"
              dir="[[_rtlDirection]]"
            ></cloud-alexa-pref>

            <cloud-google-pref
              hass="[[hass]]"
              cloud-status="[[cloudStatus]]"
              dir="[[_rtlDirection]]"
            ></cloud-google-pref>

            <cloud-webhooks
              hass="[[hass]]"
              cloud-status="[[cloudStatus]]"
              dir="[[_rtlDirection]]"
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
      narrow: Boolean,
      cloudStatus: Object,
      _subscription: {
        type: Object,
        value: null,
      },
      _rtlDirection: {
        type: Boolean,
        computed: "_computeRTLDirection(hass)",
      },
    };
  }

  ready() {
    super.ready();
    this._fetchSubscriptionInfo();
  }

  _computeConnectionStatus(status) {
    return status === "connected"
      ? this.hass.localize("ui.panel.config.cloud.account.connected")
      : status === "disconnected"
      ? this.hass.localize("ui.panel.config.cloud.account.not_connected")
      : this.hass.localize("ui.panel.config.cloud.account.connecting");
  }

  async _fetchSubscriptionInfo() {
    this._subscription = await fetchCloudSubscriptionInfo(this.hass);
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
      return this.hass.localize(
        "ui.panel.config.cloud.account.fetching_subscription"
      );
    }

    let description = subInfo.human_description;

    if (subInfo.plan_renewal_date) {
      description = description.replace(
        "{periodEnd}",
        formatDateTime(
          new Date(subInfo.plan_renewal_date * 1000),
          this.hass.locale
        )
      );
    }

    return description;
  }

  _computeRTLDirection(hass) {
    return computeRTLDirection(hass);
  }
}

customElements.define("cloud-account", CloudAccount);
