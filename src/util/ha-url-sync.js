import { PolymerElement } from "@polymer/polymer/polymer-element";

import EventsMixin from "../mixins/events-mixin";

/* eslint-disable no-console */
const DEBUG = false;

/*
 * @appliesMixin EventsMixin
 */
class HaUrlSync extends EventsMixin(PolymerElement) {
  static get properties() {
    return {
      hass: {
        type: Object,
        observer: "hassChanged",
      },
    };
  }

  hassChanged(newHass, oldHass) {
    if (this.ignoreNextHassChange) {
      if (DEBUG) console.log("ignore hasschange");
      this.ignoreNextHassChange = false;
      return;
    }
    if (!oldHass || oldHass.moreInfoEntityId === newHass.moreInfoEntityId) {
      return;
    }

    if (newHass.moreInfoEntityId) {
      if (DEBUG) console.log("pushing state");
      // We keep track of where we opened moreInfo from so that we don't
      // pop the state when we close the modal if the modal has navigated
      // us away.
      this.moreInfoOpenedFromPath = window.location.pathname;
      history.pushState(null, null, window.location.pathname);
    } else if (window.location.pathname === this.moreInfoOpenedFromPath) {
      if (DEBUG) console.log("history back");
      this.ignoreNextPopstate = true;
      history.back();
    }
  }

  popstateChangeListener(ev) {
    if (this.ignoreNextPopstate) {
      if (DEBUG) console.log("ignore popstate");
      this.ignoreNextPopstate = false;
      return;
    }

    if (DEBUG) console.log("popstate", ev);

    if (this.hass.moreInfoEntityId) {
      if (DEBUG) console.log("deselect entity");
      this.ignoreNextHassChange = true;
      this.fire("hass-more-info", { entityId: null });
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this.ignoreNextPopstate = false;
    this.ignoreNextHassChange = false;
    this.popstateChangeListener = this.popstateChangeListener.bind(this);
    window.addEventListener("popstate", this.popstateChangeListener);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("popstate", this.popstateChangeListener);
  }
}
customElements.define("ha-url-sync", HaUrlSync);
