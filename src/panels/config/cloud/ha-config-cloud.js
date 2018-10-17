import "@polymer/app-route/app-route.js";
import { timeOut } from "@polymer/polymer/lib/utils/async.js";
import { Debouncer } from "@polymer/polymer/lib/utils/debounce.js";
import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import "../ha-config-section.js";
import "./ha-config-cloud-account.js";
import "./ha-config-cloud-forgot-password.js";
import "./ha-config-cloud-login.js";
import "./ha-config-cloud-register.js";
import NavigateMixin from "../../../mixins/navigate-mixin.js";

const LOGGED_IN_URLS = ["/cloud/account"];
const NOT_LOGGED_IN_URLS = [
  "/cloud/login",
  "/cloud/register",
  "/cloud/forgot-password",
];

/*
 * @appliesMixin NavigateMixin
 */
class HaConfigCloud extends NavigateMixin(PolymerElement) {
  static get template() {
    return html`
  <app-route route="[[route]]" pattern="/cloud/:page" data="{{_routeData}}" tail="{{_routeTail}}"></app-route>

  <template is="dom-if" if="[[_equals(_routeData.page, &quot;account&quot;)]]" restamp="">
    <ha-config-cloud-account
      hass="[[hass]]"
      cloud-status="[[cloudStatus]]"
      is-wide="[[isWide]]"
    ></ha-config-cloud-account>
  </template>

  <template is="dom-if" if="[[_equals(_routeData.page, &quot;login&quot;)]]" restamp="">
    <ha-config-cloud-login
      page-name="login"
      hass="[[hass]]"
      is-wide="[[isWide]]"
      email="{{_loginEmail}}"
      flash-message="{{_flashMessage}}"
    ></ha-config-cloud-login>
  </template>

  <template is="dom-if" if="[[_equals(_routeData.page, &quot;register&quot;)]]" restamp="">
    <ha-config-cloud-register
      page-name="register"
      hass="[[hass]]"
      is-wide="[[isWide]]"
      email="{{_loginEmail}}"
    ></ha-config-cloud-register>
  </template>

  <template is="dom-if" if="[[_equals(_routeData.page, &quot;forgot-password&quot;)]]" restamp="">
    <ha-config-cloud-forgot-password
      page-name="forgot-password"
      hass="[[hass]]"
      email="{{_loginEmail}}"
    ></ha-config-cloud-forgot-password>
  </template>
`;
  }

  static get properties() {
    return {
      hass: Object,
      isWide: Boolean,
      loadingAccount: {
        type: Boolean,
        value: false,
      },
      cloudStatus: {
        type: Object,
      },
      _flashMessage: {
        type: String,
        value: "",
      },

      route: Object,

      _routeData: Object,
      _routeTail: Object,
      _loginEmail: String,
    };
  }

  static get observers() {
    return ["_checkRoute(route, cloudStatus)"];
  }

  ready() {
    super.ready();
    this.addEventListener("cloud-done", (ev) => {
      this._flashMessage = ev.detail.flashMessage;
      this.navigate("/config/cloud/login");
    });
  }

  _checkRoute(route) {
    if (!route || route.path.substr(0, 6) !== "/cloud") return;

    this._debouncer = Debouncer.debounce(
      this._debouncer,
      timeOut.after(0),
      () => {
        if (
          !this.cloudStatus ||
          (!this.cloudStatus.logged_in &&
            !NOT_LOGGED_IN_URLS.includes(route.path))
        ) {
          this.navigate("/config/cloud/login", true);
        } else if (
          this.cloudStatus.logged_in &&
          !LOGGED_IN_URLS.includes(route.path)
        ) {
          this.navigate("/config/cloud/account", true);
        }
      }
    );
  }

  _equals(a, b) {
    return a === b;
  }
}

customElements.define("ha-config-cloud", HaConfigCloud);
