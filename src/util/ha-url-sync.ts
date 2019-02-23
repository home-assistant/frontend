import { HomeAssistant } from "../types";
import { fireEvent } from "../common/dom/fire_event";

/* tslint:disable:no-console */
const DEBUG = false;

class HaUrlSync extends HTMLElement {
  private _hass?: HomeAssistant;
  private _ignoreNextHassChange = false;
  private _moreInfoOpenedFromPath?: string;
  private _ignoreNextPopstate = false;

  public connectedCallback() {
    window.addEventListener("popstate", this._popstateChangeListener);
  }

  public disconnectedCallback() {
    window.removeEventListener("popstate", this._popstateChangeListener);
  }

  set hass(newHass) {
    const oldHass = this._hass;
    this._hass = newHass;

    if (this._ignoreNextHassChange) {
      if (DEBUG) {
        console.log("ignore hasschange");
      }
      this._ignoreNextHassChange = false;
      return;
    }
    if (!oldHass || oldHass.moreInfoEntityId === newHass.moreInfoEntityId) {
      return;
    }

    if (newHass.moreInfoEntityId) {
      if (DEBUG) {
        console.log("pushing state");
      }
      // We keep track of where we opened moreInfo from so that we don't
      // pop the state when we close the modal if the modal has navigated
      // us away.
      this._moreInfoOpenedFromPath = window.location.pathname;
      history.pushState(null, "", window.location.pathname);
    } else if (window.location.pathname === this._moreInfoOpenedFromPath) {
      if (DEBUG) {
        console.log("history back");
      }
      this._ignoreNextPopstate = true;
      history.back();
    }
  }

  private _popstateChangeListener = (ev) => {
    if (this._ignoreNextPopstate) {
      if (DEBUG) {
        console.log("ignore popstate");
      }
      this._ignoreNextPopstate = false;
      return;
    }

    if (DEBUG) {
      console.log("popstate", ev);
    }

    if (this._hass && this._hass.moreInfoEntityId) {
      if (DEBUG) {
        console.log("deselect entity");
      }
      this._ignoreNextHassChange = true;
      fireEvent(this, "hass-more-info", { entityId: null });
    }
  };
}

if (!__DEMO__) {
  customElements.define("ha-url-sync", HaUrlSync);
}
