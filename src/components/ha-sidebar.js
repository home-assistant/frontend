import '@polymer/app-layout/app-toolbar/app-toolbar.js';
import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-item/paper-icon-item.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-listbox/paper-listbox.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '../components/ha-icon.js';

import '../util/hass-translation.js';
import LocalizeMixin from '../mixins/localize-mixin.js';

/*
 * @appliesMixin LocalizeMixin
 */
class HaSidebar extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="iron-flex iron-flex-alignment iron-positioning">
      :host {
        --sidebar-text: {
          color: var(--sidebar-text-color);
          font-weight: 500;
          font-size: 14px;
        };
        height: 100%;
        display: block;
        overflow: auto;
        -ms-user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        border-right: 1px solid var(--divider-color);
        background-color: var(--sidebar-background-color, var(--primary-background-color));
      }

      app-toolbar {
        font-weight: 400;
        color: var(--primary-text-color);
        border-bottom: 1px solid var(--divider-color);
        background-color: var(--primary-background-color);
      }

      app-toolbar a {
        color: var(--primary-text-color);
      }

      paper-listbox {
        padding-bottom: 0;
      }

      paper-listbox > a {
        @apply --sidebar-text;
        text-decoration: none;

        --paper-item-icon: {
          color: var(--sidebar-icon-color);
        };
      }

      paper-icon-item span {
        @apply --sidebar-text;
      }

      a.iron-selected {
        --paper-icon-item: {
          background-color: var(--sidebar-selected-background-color, var(--paper-grey-200));
        };

        --paper-item-icon: {
          color: var(--sidebar-selected-icon-color);
        };
      }

      a.iron-selected .item-text {
        color: var(--sidebar-selected-text-color);
      }

      paper-icon-item.logout {
        margin-top: 16px;
      }

      .divider {
        height: 1px;
        background-color: var(--divider-color);
        margin: 4px 0;
      }

      .subheader {
        @apply --sidebar-text;
        padding: 16px;
      }

      .dev-tools {
        padding: 0 8px;
      }

      .dev-tools a {
        color: var(--sidebar-icon-color);
      }

      .profile-badge {
        /* for ripple */
        position: relative;
        box-sizing: border-box;
        width: 40px;
        line-height: 40px;
        border-radius: 50%;
        text-align: center;
        background-color: var(--light-primary-color);
        text-decoration: none;
        color: var(--primary-text-color);
      }

      .profile-badge.long {
        font-size: 80%;
      }
    </style>

    <app-toolbar>
      <div main-title=>Home Assistant</div>
      <template is='dom-if' if='[[hass.user]]'>
        <a href='/profile' class$='[[_computeBadgeClass(_initials)]]'>
          <paper-ripple></paper-ripple>
          [[_initials]]
        </a>
      </template>
    </app-toolbar>

    <paper-listbox attr-for-selected="data-panel" selected="[[hass.panelUrl]]">
      <a href='[[_computeUrl(defaultPage)]]' data-panel$="[[defaultPage]]">
        <paper-icon-item>
          <ha-icon slot="item-icon" icon="hass:apps"></ha-icon>
          <span class="item-text">[[localize('panel.states')]]</span>
        </paper-icon-item>
      </a>

      <template is="dom-repeat" items="[[panels]]">
        <a href='[[_computeUrl(item.url_path)]]' data-panel$='[[item.url_path]]'>
          <paper-icon-item>
            <ha-icon slot="item-icon" icon="[[item.icon]]"></ha-icon>
            <span class="item-text">[[_computePanelName(localize, item)]]</span>
          </paper-icon-item>
        </a>
      </template>

      <template is='dom-if' if='[[!hass.user]]'>
        <paper-icon-item on-click='_handleLogOut' class="logout">
          <ha-icon slot="item-icon" icon="hass:exit-to-app"></ha-icon>
          <span class="item-text">[[localize('ui.sidebar.log_out')]]</span>
        </paper-icon-item>
      </template>
    </paper-listbox>

    <div>
      <div class="divider"></div>

      <div class="subheader">[[localize('ui.sidebar.developer_tools')]]</div>

      <div class="dev-tools layout horizontal justified">
        <a href="/dev-service">
          <paper-icon-button
            icon="hass:remote"
            alt="[[localize('panel.dev-services')]]"
            title="[[localize('panel.dev-services')]]"
          ></paper-icon-button>
        </a>
        <a href="/dev-state/">
          <paper-icon-button
            icon="hass:code-tags"
            alt="[[localize('panel.dev-states')]]"
            title="[[localize('panel.dev-states')]]"

          ></paper-icon-button>
        </a>
        <a href="/dev-event/">
          <paper-icon-button
            icon="hass:radio-tower"
            alt="[[localize('panel.dev-events')]]"
            title="[[localize('panel.dev-events')]]"

          ></paper-icon-button>
        </a>
        <a href="/dev-template/">
          <paper-icon-button
            icon="hass:file-xml"
            alt="[[localize('panel.dev-templates')]]"
            title="[[localize('panel.dev-templates')]]"

          ></paper-icon-button>
          </a>
        <template is="dom-if" if="[[_mqttLoaded(hass)]]">
          <a href="/dev-mqtt/">
            <paper-icon-button
              icon="hass:altimeter"
              alt="[[localize('panel.dev-mqtt')]]"
              title="[[localize('panel.dev-mqtt')]]"

            ></paper-icon-button>
          </a>
        </template>
        <a href="/dev-info/">
          <paper-icon-button
            icon="hass:information-outline"
            alt="[[localize('panel.dev-info')]]"
            title="[[localize('panel.dev-info')]]"
          ></paper-icon-button>
        </a>
      </div>
    </div>
`;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
      },
      menuShown: {
        type: Boolean,
      },
      menuSelected: {
        type: String,
      },
      narrow: Boolean,
      panels: {
        type: Array,
        computed: 'computePanels(hass)',
      },
      defaultPage: String,
      _initials: {
        type: String,
        computed: '_computeUserInitials(hass.user.name)',
      },
    };
  }

  _computeUserInitials(name) {
    if (!name) return 'user';
    return name.trim()
      // Split by space and take first 3 words
      .split(' ').slice(0, 3)
      // Of each word, take first letter
      .map(s => s.substr(0, 1))
      .join('');
  }

  _computeBadgeClass(initials) {
    return `profile-badge ${initials.length > 2 ? 'long' : ''}`;
  }

  _mqttLoaded(hass) {
    return hass.config.core.components.indexOf('mqtt') !== -1;
  }

  _computeUserName(user) {
    return user && (user.name || 'Unnamed User');
  }

  _computePanelName(localize, panel) {
    return localize(`panel.${panel.title}`) || panel.title;
  }

  computePanels(hass) {
    var panels = hass.panels;
    var sortValue = {
      map: 1,
      logbook: 2,
      history: 3,
    };
    var result = [];

    Object.keys(panels).forEach(function (key) {
      if (panels[key].title) {
        result.push(panels[key]);
      }
    });

    result.sort(function (a, b) {
      var aBuiltIn = (a.component_name in sortValue);
      var bBuiltIn = (b.component_name in sortValue);

      if (aBuiltIn && bBuiltIn) {
        return sortValue[a.component_name] - sortValue[b.component_name];
      } else if (aBuiltIn) {
        return -1;
      } else if (bBuiltIn) {
        return 1;
      }
      // both not built in, sort by title
      if (a.title < b.title) {
        return -1;
      }
      if (a.title > b.title) {
        return 1;
      }
      return 0;
    });

    return result;
  }

  _computeUrl(urlPath) {
    return `/${urlPath}`;
  }

  _handleLogOut() {
    this.fire('hass-logout');
  }
}

customElements.define('ha-sidebar', HaSidebar);
