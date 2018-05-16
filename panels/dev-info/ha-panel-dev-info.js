import '@polymer/app-layout/app-header-layout/app-header-layout.js';
import '@polymer/app-layout/app-header/app-header.js';
import '@polymer/app-layout/app-toolbar/app-toolbar.js';
import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js';
import '@polymer/paper-dialog/paper-dialog.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-item/paper-item-body.js';
import '@polymer/paper-item/paper-item.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../src/components/buttons/ha-call-service-button.js';
import '../../src/components/ha-menu-button.js';
import '../../src/resources/ha-style.js';

class HaPanelDevInfo extends PolymerElement {
  static get template() {
    return html`
    <style include="iron-positioning ha-style">
      :host {
        -ms-user-select: initial;
        -webkit-user-select: initial;
        -moz-user-select: initial;
      }

      .content {
        padding: 16px 0px 16px 0;
      }

      .about {
        text-align: center;
        line-height: 2em;
      }

      .version {
        @apply --paper-font-headline;
      }

      .develop {
        @apply --paper-font-subhead;
      }

      .about a {
        color: var(--dark-primary-color);
      }

      .error-log-intro {
        margin: 16px;
      }

      paper-icon-button {
        float: right;
      }

      .error-log {
        @apply --paper-font-code)
        clear: both;
        white-space: pre-wrap;
        margin: 16px;
      }

      .system-log-intro {
        margin: 16px;
        border-top: 1px solid var(--light-primary-color);
        padding-top: 16px;
      }

      paper-card {
        display: block;
        padding-top: 16px;
      }

      paper-item {
        cursor: pointer;
      }

      .header {
        @apply --paper-font-title;
      }

      paper-dialog {
        border-radius: 2px;
      }

      @media all and (max-width: 450px), all and (max-height: 500px) {
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
      }

      .loading-container {
        @apply --layout-vertical;
        @apply --layout-center-center;
        height: 100px;
       }
    </style>

    <app-header-layout has-scrolling-region>
      <app-header slot="header" fixed>
        <app-toolbar>
          <ha-menu-button narrow='[[narrow]]' show-menu='[[showMenu]]'></ha-menu-button>
          <div main-title>About</div>
        </app-toolbar>
      </app-header>

      <div class='content'>
        <div class='about'>
          <p class='version'>
            <a href='https://www.home-assistant.io'><img src="/static/icons/favicon-192x192.png" height="192" /></a><br />
            Home Assistant<br />
            [[hass.config.core.version]]
          </p>
          <p>
            Path to configuration.yaml: [[hass.config.core.config_dir]]
          </p>
          <p class='develop'>
            <a href='https://www.home-assistant.io/developers/credits/' target='_blank'>
              Developed by a bunch of awesome people.
            </a>
          </p>
          <p>
            Published under the Apache 2.0 license<br />
            Source:
            <a href='https://github.com/home-assistant/home-assistant' target='_blank'>server</a> &mdash;
            <a href='https://github.com/home-assistant/home-assistant-polymer' target='_blank'>frontend-ui</a>
          </p>
          <p>
            Built using
            <a href='https://www.python.org'>Python 3</a>,
            <a href='https://www.polymer-project.org' target='_blank'>Polymer [[polymerVersion]]</a>,
            Icons by <a href='https://www.google.com/design/icons/' target='_blank'>Google</a> and <a href='https://MaterialDesignIcons.com' target='_blank'>MaterialDesignIcons.com</a>.
          </p>
          <p>
            Frontend JavaScript version: [[jsVersion]]
            <template is='dom-if' if='[[customUiList.length]]'>
              <div>
                Custom UIs:
                <template is='dom-repeat' items='[[customUiList]]'>
                  <div>
                    <a href='[[item.url]]' target='_blank'>[[item.name]]</a>: [[item.version]]
                  </div>
                </template>
              </div>
            </template>
          </p>
        </div>

        <div class="system-log-intro">
          <paper-card>
            <template is='dom-if' if='[[updating]]'>
              <div class='loading-container'>
                <paper-spinner active></paper-spinner>
              </div>
            </template>
            <template is='dom-if' if='[[!updating]]'>
              <template is='dom-if' if='[[!items.length]]'>
                <div class='card-content'>There are no new issues!</div>
              </template>
              <template is='dom-repeat' items='[[items]]'>
                <paper-item on-click='openLog'>
                  <paper-item-body two-line>
                    <div class="row">
                      [[item.message]]
                    </div>
                    <div secondary>
                      [[formatTime(item.timestamp)]] [[item.source]] ([[item.level]])
                    </div>
                  </paper-item-body>
                </paper-item>
              </template>

              <div class='card-actions'>
                <ha-call-service-button
                 hass='[[hass]]'
                 domain='system_log'
                 service='clear'
                 >Clear</ha-call-service-button>
                <ha-progress-button
                 on-click='_fetchData'
                 >Refresh</ha-progress-button>
              </div>
            </template>
          </paper-card>
        </div>
        <p class='error-log-intro'>
          Press the button to load the full Home Assistant log.
          <paper-icon-button icon='mdi:refresh' on-click='refreshErrorLog'></paper-icon-button>
        </p>
        <div class='error-log'>[[errorLog]]</div>
      </div>
    </app-header-layout>

    <paper-dialog with-backdrop id="showlog">
      <h2>Log Details ([[selectedItem.level]])</h2>
      <paper-dialog-scrollable id="scrollable">
        <p>[[fullTimeStamp(selectedItem.timestamp)]]</p>
        <template is='dom-if' if='[[selectedItem.message]]'>
          <pre>[[selectedItem.message]]</pre>
        </template>
        <template is='dom-if' if='[[selectedItem.exception]]'>
          <pre>[[selectedItem.exception]]</pre>
        </template>
      </paper-dialog-scrollable>
    </paper-dialog>
    `;
  }

  static get properties() {
    return {
      hass: Object,

      narrow: {
        type: Boolean,
        value: false,
      },

      showMenu: {
        type: Boolean,
        value: false,
      },

      polymerVersion: {
        type: String,
        value: Polymer.version,
      },

      errorLog: {
        type: String,
        value: '',
      },

      updating: {
        type: Boolean,
        value: true,
      },

      items: {
        type: Array,
        value: [],
      },

      selectedItem: Object,

      jsVersion: {
        type: String,
        value: window.HASS_BUILD,
      },

      customUiList: {
        type: Array,
        value: window.CUSTOM_UI_LIST || [],
      },
    };
  }

  ready() {
    super.ready();
    this.addEventListener('hass-service-called', ev => this.serviceCalled(ev));
    // Fix for overlay showing on top of dialog.
    this.$.showlog.addEventListener('iron-overlay-opened', (ev) => {
      if (ev.target.withBackdrop) {
        ev.target.parentNode.insertBefore(ev.target.backdropElement, ev.target);
      }
    });
  }

  serviceCalled(ev) {
    // Check if this is for us
    if (ev.detail.success && ev.detail.domain === 'system_log') {
      // Do the right thing depending on service
      if (ev.detail.service === 'clear') {
        this.items = [];
      }
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this.$.scrollable.dialogElement = this.$.showlog;
    this._fetchData();
  }

  refreshErrorLog(ev) {
    if (ev) ev.preventDefault();

    this.errorLog = 'Loading error log…';

    this.hass.callApi('GET', 'error_log').then(function (log) {
      this.errorLog = log || 'No errors have been reported.';
    }.bind(this));
  }

  fullTimeStamp(date) {
    return new Date(date * 1000);
  }

  formatTime(date) {
    const today = new Date().setHours(0, 0, 0, 0);
    const dateTime = new Date(date * 1000);
    const dateTimeDay = new Date(date * 1000).setHours(0, 0, 0, 0);

    return dateTimeDay < today ?
      window.hassUtil.formatDateTime(dateTime) : window.hassUtil.formatTime(dateTime);
  }

  openLog(event) {
    this.selectedItem = event.model.item;
    this.$.showlog.open();
  }

  _fetchData() {
    this.updating = true;
    this.hass.callApi('get', 'error/all')
      .then(function (items) {
        this.items = items;
        this.updating = false;
      }.bind(this));
  }
}

customElements.define('ha-panel-dev-info', HaPanelDevInfo);
