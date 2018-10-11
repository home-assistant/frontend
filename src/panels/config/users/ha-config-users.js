import "@polymer/app-route/app-route.js";
import { timeOut } from "@polymer/polymer/lib/utils/async.js";
import { Debouncer } from "@polymer/polymer/lib/utils/debounce.js";
import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import NavigateMixin from "../../../mixins/navigate-mixin.js";

import "./ha-user-picker.js";
import "./ha-user-editor.js";

/*
 * @appliesMixin NavigateMixin
 */
class HaConfigUsers extends NavigateMixin(PolymerElement) {
  static get template() {
    return html`
    <app-route
      route='[[route]]'
      pattern='/users/:user'
      data="{{_routeData}}"
    ></app-route>

    <template is='dom-if' if='[[_equals(_routeData.user, "picker")]]'>
      <ha-user-picker
        hass='[[hass]]'
        users='[[_users]]'
      ></ha-user-picker>
    </template>
    <template is='dom-if' if='[[!_equals(_routeData.user, "picker")]]' restamp>
      <ha-user-editor
        hass='[[hass]]'
        user='[[_computeUser(_users, _routeData.user)]]'
      ></ha-user-editor>
    </template>
`;
  }

  static get properties() {
    return {
      hass: Object,
      route: {
        type: Object,
        observer: "_checkRoute",
      },
      _routeData: Object,
      _user: {
        type: Object,
        value: null,
      },
      _users: {
        type: Array,
        value: null,
      },
    };
  }

  ready() {
    super.ready();
    this._loadData();
    this.addEventListener("reload-users", () => this._loadData());
  }

  _handlePickUser(ev) {
    this._user = ev.detail.user;
  }

  _checkRoute(route) {
    if (!route || route.path.substr(0, 6) !== "/users") return;

    // prevent list gettung under toolbar
    this.fire("iron-resize");

    this._debouncer = Debouncer.debounce(
      this._debouncer,
      timeOut.after(0),
      () => {
        if (route.path === "/users") {
          this.navigate("/config/users/picker", true);
        }
      }
    );
  }

  _computeUser(users, userId) {
    return users && users.filter((u) => u.id === userId)[0];
  }

  _equals(a, b) {
    return a === b;
  }

  async _loadData() {
    this._users = await this.hass.callWS({
      type: "config/auth/list",
    });
  }
}

customElements.define("ha-config-users", HaConfigUsers);
