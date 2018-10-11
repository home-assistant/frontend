import "@polymer/app-layout/app-header-layout/app-header-layout.js";
import "@polymer/app-layout/app-header/app-header.js";
import "@polymer/app-layout/app-toolbar/app-toolbar.js";
import "@polymer/paper-icon-button/paper-icon-button.js";
import "@polymer/paper-tabs/paper-tab.js";
import "@polymer/paper-tabs/paper-tabs.js";
import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import "../../src/components/ha-menu-button.js";
import "../../src/resources/ha-style.js";
import "./addon-store/hassio-addon-store.js";
import "./dashboard/hassio-dashboard.js";
import "./hassio-markdown-dialog.js";
import "./snapshots/hassio-snapshot.js";
import "./snapshots/hassio-snapshots.js";
import "./system/hassio-system.js";

import scrollToTarget from "../../src/common/dom/scroll-to-target.js";

import NavigateMixin from "../../src/mixins/navigate-mixin.js";

class HassioPagesWithTabs extends NavigateMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="iron-flex iron-positioning ha-style">
      :host {
        color: var(--primary-text-color);
        --paper-card-header-color: var(--primary-text-color);
      }
      paper-tabs {
        margin-left: 12px;
        --paper-tabs-selection-bar-color: #FFF;
        text-transform: uppercase;
      }
    </style>
    <app-header-layout id="layout" has-scrolling-region>
      <app-header fixed slot="header">
        <app-toolbar>
          <ha-menu-button hassio narrow="[[narrow]]" show-menu="[[showMenu]]"></ha-menu-button>
          <div main-title>Hass.io</div>
          <template is="dom-if" if="[[showRefreshButton(page)]]">
            <paper-icon-button icon="hassio:refresh" on-click="refreshClicked"></paper-icon-button>
          </template>
        </app-toolbar>
        <paper-tabs scrollable="" selected="[[page]]" attr-for-selected="page-name" on-iron-activate="handlePageSelected">
          <paper-tab page-name="dashboard">Dashboard</paper-tab>
          <paper-tab page-name="snapshots">Snapshots</paper-tab>
          <paper-tab page-name="store">Add-on store</paper-tab>
          <paper-tab page-name="system">System</paper-tab>
        </paper-tabs>
      </app-header>
      <template is="dom-if" if="[[equals(page, &quot;dashboard&quot;)]]">
        <hassio-dashboard hass="[[hass]]" supervisor-info="[[supervisorInfo]]" hass-info="[[hassInfo]]"></hassio-dashboard>
      </template>
      <template is="dom-if" if="[[equals(page, &quot;snapshots&quot;)]]">
        <hassio-snapshots hass="[[hass]]" installed-addons="[[supervisorInfo.addons]]" snapshot-slug="{{snapshotSlug}}" snapshot-deleted="{{snapshotDeleted}}"></hassio-snapshots>
      </template>
      <template is="dom-if" if="[[equals(page, &quot;store&quot;)]]">
        <hassio-addon-store hass="[[hass]]"></hassio-addon-store>
      </template>
      <template is="dom-if" if="[[equals(page, &quot;system&quot;)]]">
        <hassio-system hass="[[hass]]" supervisor-info="[[supervisorInfo]]" host-info="[[hostInfo]]"></hassio-system>
      </template>
    </app-header-layout>

    <hassio-markdown-dialog title="[[markdownTitle]]" content="[[markdownContent]]"></hassio-markdown-dialog>

    <template is="dom-if" if="[[equals(page, &quot;snapshots&quot;)]]">
      <hassio-snapshot hass="[[hass]]" snapshot-slug="{{snapshotSlug}}" snapshot-deleted="{{snapshotDeleted}}"></hassio-snapshot>
    </template>
`;
  }

  static get properties() {
    return {
      hass: Object,
      showMenu: Boolean,
      narrow: Boolean,
      page: String,
      supervisorInfo: Object,
      hostInfo: Object,
      hassInfo: Object,
      snapshotSlug: String,
      snapshotDeleted: Boolean,

      markdownTitle: String,
      markdownContent: {
        type: String,
        value: "",
      },
    };
  }

  ready() {
    super.ready();
    this.addEventListener("hassio-markdown-dialog", (ev) =>
      this.openMarkdown(ev)
    );
  }

  handlePageSelected(ev) {
    const newPage = ev.detail.item.getAttribute("page-name");
    if (newPage !== this.page) {
      this.navigate(`/hassio/${newPage}`);
    }
    scrollToTarget(this, this.$.layout.header.scrollTarget);
  }

  equals(a, b) {
    return a === b;
  }

  showRefreshButton(page) {
    return page === "store" || page === "snapshots";
  }

  refreshClicked() {
    if (this.page === "snapshots") {
      this.shadowRoot.querySelector("hassio-snapshots").refreshData();
    } else {
      this.shadowRoot.querySelector("hassio-addon-store").refreshData();
    }
  }

  openMarkdown(ev) {
    this.setProperties({
      markdownTitle: ev.detail.title,
      markdownContent: ev.detail.content,
    });
    this.shadowRoot.querySelector("hassio-markdown-dialog").openDialog();
  }
}

customElements.define("hassio-pages-with-tabs", HassioPagesWithTabs);
