import "@polymer/app-layout/app-header-layout/app-header-layout";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-tabs/paper-tab";
import "@polymer/paper-tabs/paper-tabs";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../src/components/ha-menu-button";
import "../../src/resources/ha-style";
import "./addon-store/hassio-addon-store";
import "./dashboard/hassio-dashboard";
import "./hassio-markdown-dialog";
import "./snapshots/hassio-snapshot";
import "./snapshots/hassio-snapshots";
import "./system/hassio-system";

import scrollToTarget from "../../src/common/dom/scroll-to-target";

import NavigateMixin from "../../src/mixins/navigate-mixin";

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
          --paper-tabs-selection-bar-color: #fff;
          text-transform: uppercase;
        }
      </style>
      <app-header-layout id="layout" has-scrolling-region>
        <app-header fixed slot="header">
          <app-toolbar>
            <ha-menu-button
              hassio
              narrow="[[narrow]]"
              show-menu="[[showMenu]]"
            ></ha-menu-button>
            <div main-title>Hass.io</div>
            <template is="dom-if" if="[[showRefreshButton(page)]]">
              <paper-icon-button
                icon="hassio:refresh"
                on-click="refreshClicked"
              ></paper-icon-button>
            </template>
          </app-toolbar>
          <paper-tabs
            scrollable=""
            selected="[[page]]"
            attr-for-selected="page-name"
            on-iron-activate="handlePageSelected"
          >
            <paper-tab page-name="dashboard">Dashboard</paper-tab>
            <paper-tab page-name="snapshots">Snapshots</paper-tab>
            <paper-tab page-name="store">Add-on store</paper-tab>
            <paper-tab page-name="system">System</paper-tab>
          </paper-tabs>
        </app-header>
        <template is="dom-if" if='[[equals(page, "dashboard")]]'>
          <hassio-dashboard
            hass="[[hass]]"
            supervisor-info="[[supervisorInfo]]"
            hass-info="[[hassInfo]]"
          ></hassio-dashboard>
        </template>
        <template is="dom-if" if='[[equals(page, "snapshots")]]'>
          <hassio-snapshots
            hass="[[hass]]"
            installed-addons="[[supervisorInfo.addons]]"
            snapshot-slug="{{snapshotSlug}}"
            snapshot-deleted="{{snapshotDeleted}}"
          ></hassio-snapshots>
        </template>
        <template is="dom-if" if='[[equals(page, "store")]]'>
          <hassio-addon-store hass="[[hass]]"></hassio-addon-store>
        </template>
        <template is="dom-if" if='[[equals(page, "system")]]'>
          <hassio-system
            hass="[[hass]]"
            supervisor-info="[[supervisorInfo]]"
            host-info="[[hostInfo]]"
          ></hassio-system>
        </template>
      </app-header-layout>

      <hassio-markdown-dialog
        title="[[markdownTitle]]"
        content="[[markdownContent]]"
      ></hassio-markdown-dialog>

      <template is="dom-if" if='[[equals(page, "snapshots")]]'>
        <hassio-snapshot
          hass="[[hass]]"
          snapshot-slug="{{snapshotSlug}}"
          snapshot-deleted="{{snapshotDeleted}}"
        ></hassio-snapshot>
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
