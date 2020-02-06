import "@polymer/app-layout/app-header-layout/app-header-layout";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@material/mwc-button";
import "@polymer/paper-input/paper-textarea";
import "@polymer/paper-item/paper-item-body";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-tabs/paper-tab";
import "@polymer/paper-tabs/paper-tabs";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../components/ha-menu-button";
import "../../components/ha-card";
import "../../resources/ha-style";

import { formatDateTime } from "../../common/datetime/format_date_time";
import LocalizeMixin from "../../mixins/localize-mixin";
import { EventsMixin } from "../../mixins/events-mixin";

let registeredDialog = false;

/*
 * @appliesMixin LocalizeMixin
 */
class HaPanelMailbox extends EventsMixin(LocalizeMixin(PolymerElement)) {
  static get template() {
    return html`
      <style include="ha-style">
        :host {
          -ms-user-select: initial;
          -webkit-user-select: initial;
          -moz-user-select: initial;
        }

        .content {
          padding: 16px;
          max-width: 600px;
          margin: 0 auto;
        }

        ha-card {
          overflow: hidden;
        }

        paper-item {
          cursor: pointer;
        }

        .empty {
          text-align: center;
          color: var(--secondary-text-color);
        }

        .header {
          @apply --paper-font-title;
        }

        .row {
          display: flex;
          justify-content: space-between;
        }

        @media all and (max-width: 450px) {
          .content {
            width: auto;
            padding: 0;
          }
        }

        .tip {
          color: var(--secondary-text-color);
          font-size: 14px;
        }
        .date {
          color: var(--primary-text-color);
        }
      </style>

      <app-header-layout has-scrolling-region>
        <app-header slot="header" fixed>
          <app-toolbar>
            <ha-menu-button
              hass="[[hass]]"
              narrow="[[narrow]]"
            ></ha-menu-button>
            <div main-title>[[localize('panel.mailbox')]]</div>
          </app-toolbar>
          <div sticky hidden$="[[areTabsHidden(platforms)]]">
            <paper-tabs
              scrollable
              selected="[[_currentPlatform]]"
              on-iron-activate="handlePlatformSelected"
            >
              <template is="dom-repeat" items="[[platforms]]">
                <paper-tab data-entity="[[item]]">
                  [[getPlatformName(item)]]
                </paper-tab>
              </template>
            </paper-tabs>
          </div>
        </app-header>
        <div class="content">
          <ha-card>
            <template is="dom-if" if="[[!_messages.length]]">
              <div class="card-content empty">
                [[localize('ui.panel.mailbox.empty')]]
              </div>
            </template>
            <template is="dom-repeat" items="[[_messages]]">
              <paper-item on-click="openMP3Dialog">
                <paper-item-body style="width:100%" two-line>
                  <div class="row">
                    <div>[[item.caller]]</div>
                    <div class="tip">
                      [[localize('ui.duration.second', 'count', item.duration)]]
                    </div>
                  </div>
                  <div secondary>
                    <span class="date">[[item.timestamp]]</span> -
                    [[item.message]]
                  </div>
                </paper-item-body>
              </paper-item>
            </template>
          </ha-card>
        </div>
      </app-header-layout>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      narrow: Boolean,

      platforms: {
        type: Array,
      },

      _messages: {
        type: Array,
      },

      _currentPlatform: {
        type: Number,
        value: 0,
      },
    };
  }

  connectedCallback() {
    super.connectedCallback();
    if (!registeredDialog) {
      registeredDialog = true;
      this.fire("register-dialog", {
        dialogShowEvent: "show-audio-message-dialog",
        dialogTag: "ha-dialog-show-audio-message",
        dialogImport: () =>
          import(
            /* webpackChunkName: "ha-dialog-show-audio-message" */ "./ha-dialog-show-audio-message"
          ),
      });
    }
    this.hassChanged = this.hassChanged.bind(this);
    this.hass.connection
      .subscribeEvents(this.hassChanged, "mailbox_updated")
      .then(
        function(unsub) {
          this._unsubEvents = unsub;
        }.bind(this)
      );
    this.computePlatforms().then(
      function(platforms) {
        this.platforms = platforms;
        this.hassChanged();
      }.bind(this)
    );
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsubEvents) this._unsubEvents();
  }

  hassChanged() {
    if (!this._messages) {
      this._messages = [];
    }
    this.getMessages().then(
      function(items) {
        this._messages = items;
      }.bind(this)
    );
  }

  openMP3Dialog(event) {
    this.fire("show-audio-message-dialog", {
      hass: this.hass,
      message: event.model.item,
    });
  }

  getMessages() {
    const platform = this.platforms[this._currentPlatform];
    return this.hass
      .callApi("GET", `mailbox/messages/${platform.name}`)
      .then((values) => {
        const platformItems = [];
        const arrayLength = values.length;
        for (let i = 0; i < arrayLength; i++) {
          const datetime = formatDateTime(
            new Date(values[i].info.origtime * 1000),
            this.hass.language
          );
          platformItems.push({
            timestamp: datetime,
            caller: values[i].info.callerid,
            message: values[i].text,
            sha: values[i].sha,
            duration: values[i].info.duration,
            platform: platform,
          });
        }
        return platformItems.sort(function(a, b) {
          return new Date(b.timestamp) - new Date(a.timestamp);
        });
      });
  }

  computePlatforms() {
    return this.hass.callApi("GET", "mailbox/platforms");
  }

  handlePlatformSelected(ev) {
    const newPlatform = ev.detail.selected;
    if (newPlatform !== this._currentPlatform) {
      this._currentPlatform = newPlatform;
      this.hassChanged();
    }
  }

  areTabsHidden(platforms) {
    return !platforms || platforms.length < 2;
  }

  getPlatformName(item) {
    const entity = `mailbox.${item.name}`;
    const stateObj = this.hass.states[entity.toLowerCase()];
    return stateObj.attributes.friendly_name;
  }
}

customElements.define("ha-panel-mailbox", HaPanelMailbox);
