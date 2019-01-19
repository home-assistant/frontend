import "@polymer/app-layout/app-drawer-layout/app-drawer-layout";
import "@polymer/app-layout/app-drawer/app-drawer";
import "@polymer/app-route/app-route";
import "@polymer/iron-media-query/iron-media-query";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../util/ha-url-sync";

import "./partial-panel-resolver";
import EventsMixin from "../mixins/events-mixin";
import NavigateMixin from "../mixins/navigate-mixin";
import { computeRTL } from "../common/util/compute_rtl";
import { DEFAULT_PANEL } from "../common/const";

import(/* webpackChunkName: "ha-sidebar" */ "../components/ha-sidebar");
import(/* webpackChunkName: "voice-command-dialog" */ "../dialogs/ha-voice-command-dialog");

const NON_SWIPABLE_PANELS = ["kiosk", "map"];

class HomeAssistantMain extends NavigateMixin(EventsMixin(PolymerElement)) {
  static get template() {
    return html`
      <style>
        :host {
          color: var(--primary-text-color);
          /* remove the grey tap highlights in iOS on the fullscreen touch targets */
          -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
        }
        :host([rtl]) {
          direction: rtl;
        }
        partial-panel-resolver,
        ha-sidebar {
          /* allow a light tap highlight on the actual interface elements  */
          -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
        }
        partial-panel-resolver {
          height: 100%;
        }
      </style>
      <ha-url-sync hass="[[hass]]"></ha-url-sync>
      <ha-voice-command-dialog
        hass="[[hass]]"
        id="voiceDialog"
      ></ha-voice-command-dialog>
      <iron-media-query query="(max-width: 870px)" query-matches="{{narrow}}">
      </iron-media-query>

      <app-drawer-layout
        fullbleed=""
        force-narrow="[[computeForceNarrow(narrow, dockedSidebar)]]"
        responsive-width="0"
      >
        <app-drawer
          id="drawer"
          align="start"
          slot="drawer"
          disable-swipe="[[_computeDisableSwipe(hass)]]"
          swipe-open="[[!_computeDisableSwipe(hass)]]"
          persistent="[[dockedSidebar]]"
        >
          <ha-sidebar
            narrow="[[narrow]]"
            hass="[[hass]]"
            default-page="[[_defaultPage]]"
          ></ha-sidebar>
        </app-drawer>

        <partial-panel-resolver
          narrow="[[narrow]]"
          hass="[[hass]]"
          route="[[route]]"
          show-menu="[[dockedSidebar]]"
        ></partial-panel-resolver>
      </app-drawer-layout>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      narrow: Boolean,
      route: {
        type: Object,
        observer: "_routeChanged",
      },
      dockedSidebar: {
        type: Boolean,
        computed: "computeDockedSidebar(hass)",
      },
      rtl: {
        type: Boolean,
        reflectToAttribute: true,
        computed: "_computeRTL(hass)",
      },
    };
  }

  ready() {
    super.ready();
    this._defaultPage = localStorage.defaultPage || DEFAULT_PANEL;
    this.addEventListener("hass-open-menu", () => this.handleOpenMenu());
    this.addEventListener("hass-close-menu", () => this.handleCloseMenu());
    this.addEventListener("hass-start-voice", (ev) =>
      this.handleStartVoice(ev)
    );
  }

  _routeChanged() {
    if (this.narrow) {
      this.$.drawer.close();
    }
  }

  handleStartVoice(ev) {
    ev.stopPropagation();
    this.$.voiceDialog.opened = true;
  }

  handleOpenMenu() {
    if (this.narrow) {
      this.$.drawer.open();
    } else {
      this.fire("hass-dock-sidebar", { dock: true });
    }
  }

  handleCloseMenu() {
    this.$.drawer.close();
    if (this.dockedSidebar) {
      this.fire("hass-dock-sidebar", { dock: false });
    }
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.route.prefix === "") {
      this.navigate(`/${localStorage.defaultPage || DEFAULT_PANEL}`, true);
    }
  }

  computeForceNarrow(narrow, dockedSidebar) {
    return narrow || !dockedSidebar;
  }

  computeDockedSidebar(hass) {
    return hass.dockedSidebar;
  }

  _computeDisableSwipe(hass) {
    return NON_SWIPABLE_PANELS.indexOf(hass.panelUrl) !== -1;
  }

  _computeRTL(hass) {
    return computeRTL(hass);
  }
}

customElements.define("home-assistant-main", HomeAssistantMain);
