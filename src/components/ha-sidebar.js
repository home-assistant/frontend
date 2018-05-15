import '@polymer/app-layout/app-toolbar/app-toolbar.js';
import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-item/paper-icon-item.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-listbox/paper-listbox.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../util/hass-mixins.js';
import '../util/hass-translation.js';

/*
 * @appliesMixin window.hassMixins.LocalizeMixin
 * @appliesMixin window.hassMixins.EventsMixin
 */
class HaSidebar extends
  window.hassMixins.LocalizeMixin(window.hassMixins.NavigateMixin(PolymerElement)) {
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

      paper-listbox {
        padding-bottom: 0;
      }

      paper-icon-item {
        --paper-icon-item: {
          cursor: pointer;
        };

        --paper-item-icon: {
          color: var(--sidebar-icon-color);
        };
      }

      paper-icon-item.iron-selected {
        --paper-icon-item: {
          background-color: var(--sidebar-selected-background-color, var(--paper-grey-200));
        };

        --paper-item-icon: {
          color: var(--sidebar-selected-icon-color);
        };
      }

      paper-icon-item .item-text {
        @apply --sidebar-text;
      }
      paper-icon-item.iron-selected .item-text {
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

      .setting {
        @apply --sidebar-text;
      }

      .subheader {
        @apply --sidebar-text;
        padding: 16px;
      }

      .dev-tools {
        color: var(--sidebar-icon-color);
        padding: 0 8px;
      }
    </style>

    <app-toolbar>
      <div main-title="">Home Assistant</div>
      <paper-icon-button icon="mdi:chevron-left" hidden\$="[[narrow]]" on-click="toggleMenu"></paper-icon-button>
    </app-toolbar>

    <paper-listbox attr-for-selected="data-panel" selected="[[hass.panelUrl]]">
      <paper-icon-item on-click="menuClicked" data-panel="states">
        <iron-icon slot="item-icon" icon="mdi:apps"></iron-icon>
        <span class="item-text">[[localize('panel.states')]]</span>
      </paper-icon-item>

      <template is="dom-repeat" items="[[panels]]">
        <paper-icon-item on-click="menuClicked">
          <iron-icon slot="item-icon" icon="[[item.icon]]"></iron-icon>
          <span class="item-text">[[computePanelName(localize, item)]]</span>
        </paper-icon-item>
      </template>

      <paper-icon-item on-click="menuClicked" data-panel="logout" class="logout">
        <iron-icon slot="item-icon" icon="mdi:exit-to-app"></iron-icon>
        <span class="item-text">[[localize('ui.sidebar.log_out')]]</span>
      </paper-icon-item>
    </paper-listbox>

    <div>
      <div class="divider"></div>

      <div class="subheader">[[localize('ui.sidebar.developer_tools')]]</div>

      <div class="dev-tools layout horizontal justified">
        <paper-icon-button icon="mdi:remote" data-panel="dev-service" alt="[[localize('panel.dev-services')]]" title="[[localize('panel.dev-services')]]" on-click="menuClicked"></paper-icon-button>
        <paper-icon-button icon="mdi:code-tags" data-panel="dev-state" alt="[[localize('panel.dev-states')]]" title="[[localize('panel.dev-states')]]" on-click="menuClicked"></paper-icon-button>
        <paper-icon-button icon="mdi:radio-tower" data-panel="dev-event" alt="[[localize('panel.dev-events')]]" title="[[localize('panel.dev-events')]]" on-click="menuClicked"></paper-icon-button>
        <paper-icon-button icon="mdi:file-xml" data-panel="dev-template" alt="[[localize('panel.dev-templates')]]" title="[[localize('panel.dev-templates')]]" on-click="menuClicked"></paper-icon-button>
        <template is="dom-if" if="[[_mqttLoaded(hass)]]">
          <paper-icon-button icon="mdi:altimeter" data-panel="dev-mqtt" alt="[[localize('panel.dev-mqtt')]]" title="[[localize('panel.dev-mqtt')]]" on-click="menuClicked"></paper-icon-button>
        </template>
        <paper-icon-button icon="mdi:information-outline" data-panel="dev-info" alt="[[localize('panel.dev-info')]]" title="[[localize('panel.dev-info')]]" on-click="menuClicked"></paper-icon-button>
      </div>
    </div>
`;
  }

  static get is() { return 'ha-sidebar'; }

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
    };
  }

  _mqttLoaded(hass) {
    return hass.config.core.components.indexOf('mqtt') !== -1;
  }

  computePanelName(localize, panel) {
    return localize(`panel.${panel.title}`) || panel.title;
  }

  computePanels(hass) {
    var panels = hass.config.panels;
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

  menuClicked(ev) {
    // Selection made inside dom-repeat
    if (ev.model) {
      this.selectPanel(ev.model.item.url_path);
      return;
    }

    let target = ev.target;
    let checks = 5;
    let attr;

    do {
      attr = target.getAttribute('data-panel');
      target = target.parentElement;
      checks--;
    } while (checks > 0 && target !== null && !attr);

    if (checks > 0 && target !== null) {
      this.selectPanel(attr);
    }
  }

  toggleMenu() {
    this.fire('hass-close-menu');
  }

  selectPanel(newChoice) {
    if (newChoice === 'logout') {
      this.handleLogOut();
      return;
    }
    var path = '/' + newChoice;
    if (path === document.location.pathname) {
      return;
    }
    this.navigate(path);
  }

  handleLogOut() {
    this.fire('hass-logout');
  }
}

customElements.define(HaSidebar.is, HaSidebar);
