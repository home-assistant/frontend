import '@polymer/app-layout/app-header-layout/app-header-layout.js';
import '@polymer/app-layout/app-header/app-header.js';
import '@polymer/app-layout/app-toolbar/app-toolbar.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-dialog/paper-dialog.js';
import '@polymer/paper-input/paper-textarea.js';
import '@polymer/paper-item/paper-item-body.js';
import '@polymer/paper-item/paper-item.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../components/ha-menu-button.js';
import '../../resources/ha-style.js';


import formatDateTime from '../../common/datetime/format_date_time.js';
import LocalizeMixin from '../../mixins/localize-mixin.js';

class HaPanelMailbox extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
    <style include='ha-style'>
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

      paper-card {
        display: block;
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
      paper-dialog {
        border-radius: 2px;
      }
      paper-dialog p {
        color: var(--secondary-text-color);
      }

      #mp3dialog paper-icon-button {
        float: right;
      }

      @media all and (max-width: 450px) {
        paper-dialog {
          margin: 0;
          width: 100%;
          max-height: calc(100% - 64px);

          position: fixed !important;
          bottom: 0px;
          left: 0px;
          right: 0px;
          overflow: scroll;
          border-bottom-left-radius: 0px;
          border-bottom-right-radius: 0px;
        }

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
          <ha-menu-button narrow='[[narrow]]' show-menu='[[showMenu]]'></ha-menu-button>
          <div main-title>[[localize('panel.mailbox')]]</div>
        </app-toolbar>
      </app-header>
      <div class='content'>
        <paper-card>
          <template is='dom-if' if='[[!_messages.length]]'>
            <div class='card-content empty'>
              [[localize('ui.panel.mailbox.empty')]]
            </div>
          </template>
          <template is='dom-repeat' items='[[_messages]]'>
            <paper-item on-click='openMP3Dialog'>
              <paper-item-body style="width:100%" two-line>
                <div class="row">
                  <div>[[item.caller]]</div>
                  <div class="tip">[[localize('ui.duration.second', 'count', item.duration)]]</div>
                </div>
                <div secondary>
                  <span class="date">[[item.timestamp]]</span> - [[item.message]]
                </div>
              </paper-item-body>
            </paper-item>
          </template>
        </paper-card>
      </div>
    </app-header-layout>

    <paper-dialog with-backdrop id="mp3dialog" on-iron-overlay-closed="_mp3Closed">
      <h2>
        [[localize('ui.panel.mailbox.playback_title')]]
        <paper-icon-button
          on-click='openDeleteDialog'
          icon='hass:delete'
        ></paper-icon-button>
      </h2>
      <div id="transcribe"></div>
      <div>
        <audio id="mp3" preload="none" controls> <source id="mp3src" src="" type="audio/mpeg" /></audio>
      </div>
    </paper-dialog>

    <paper-dialog with-backdrop id="confirmdel">
      <p>[[localize('ui.panel.mailbox.delete_prompt')]]</p>
      <div class="buttons">
        <paper-button dialog-dismiss>[[localize('ui.common.cancel')]]</paper-button>
        <paper-button dialog-confirm autofocus on-click="deleteSelected">[[localize('ui.panel.mailbox.delete_button')]]</paper-button>
      </div>
    </paper-dialog>
    `;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
      },

      narrow: {
        type: Boolean,
        value: false,
      },

      showMenu: {
        type: Boolean,
        value: false,
      },

      platforms: {
        type: Array,
      },

      _messages: {
        type: Array,
      },

      currentMessage: {
        type: Object,
      },
    };
  }

  connectedCallback() {
    super.connectedCallback();
    this.hassChanged = this.hassChanged.bind(this);
    this.hass.connection.subscribeEvents(this.hassChanged, 'mailbox_updated')
      .then(function (unsub) { this._unsubEvents = unsub; }.bind(this));
    this.computePlatforms().then(function (platforms) {
      this.platforms = platforms;
      this.hassChanged();
    }.bind(this));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsubEvents) this._unsubEvents();
  }

  hassChanged() {
    if (!this._messages) {
      this._messages = [];
    }
    this.getMessages().then(function (items) {
      this._messages = items;
    }.bind(this));
  }

  openMP3Dialog(event) {
    var platform = event.model.item.platform;
    this.currentMessage = event.model.item;
    this.$.mp3dialog.open();
    this.$.mp3src.src = '/api/mailbox/media/' + platform + '/' + event.model.item.sha;
    this.$.transcribe.innerText = event.model.item.message;
    this.$.mp3.load();
    this.$.mp3.play();
  }

  _mp3Closed() {
    this.$.mp3.pause();
  }

  openDeleteDialog() {
    this.$.confirmdel.open();
  }

  deleteSelected() {
    var msg = this.currentMessage;
    this.hass.callApi('DELETE', 'mailbox/delete/' + msg.platform + '/' + msg.sha);
    this.$.mp3dialog.close();
  }
  getMessages() {
    const items = this.platforms.map(function (platform) {
      return this.hass.callApi('GET', 'mailbox/messages/' + platform).then(function (values) {
        var platformItems = [];
        var arrayLength = values.length;
        for (var i = 0; i < arrayLength; i++) {
          var datetime = formatDateTime(new Date(values[i].info.origtime * 1000));
          platformItems.push({
            timestamp: datetime,
            caller: values[i].info.callerid,
            message: values[i].text,
            sha: values[i].sha,
            duration: values[i].info.duration,
            platform: platform
          });
        }
        return platformItems;
      });
    }.bind(this));
    return Promise.all(items).then(function (platformItems) {
      var arrayLength = items.length;
      var final = [];
      for (var i = 0; i < arrayLength; i++) {
        final = final.concat(platformItems[i]);
      }
      final.sort(function (a, b) {
        return new Date(b.timestamp) - new Date(a.timestamp);
      });
      return final;
    });
  }

  computePlatforms() {
    return this.hass.callApi('GET', 'mailbox/platforms');
  }
}

customElements.define('ha-panel-mailbox', HaPanelMailbox);
