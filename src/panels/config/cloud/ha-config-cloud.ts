import "./account/cloud-account";
import "./login/cloud-login";
import {
  HassRouterPage,
  RouterOptions,
} from "../../../layouts/hass-router-page";
import { property, customElement } from "lit-element";
import { HomeAssistant, Route } from "../../../types";
import { navigate } from "../../../common/navigate";
import { CloudStatus } from "../../../data/cloud";
import { PolymerChangedEvent } from "../../../polymer-types";
import { PolymerElement } from "@polymer/polymer";

const LOGGED_IN_URLS = ["account", "google-assistant", "alexa"];
const NOT_LOGGED_IN_URLS = ["login", "register", "forgot-password"];

@customElement("ha-config-cloud")
class HaConfigCloud extends HassRouterPage {
  @property() public hass!: HomeAssistant;
  @property() public isWide!: boolean;
  @property() public narrow!: boolean;
  @property() public route!: Route;
  @property() public cloudStatus!: CloudStatus;

  protected routerOptions: RouterOptions = {
    defaultPage: "login",
    showLoading: true,
    initialLoad: () => this._cloudStatusLoaded,
    // Guard the different pages based on if we're logged in.
    beforeRender: (page: string) => {
      if (this.cloudStatus.logged_in) {
        if (!LOGGED_IN_URLS.includes(page)) {
          return "account";
        }
      } else {
        if (!NOT_LOGGED_IN_URLS.includes(page)) {
          return "login";
        }
      }
      return undefined;
    },
    routes: {
      login: {
        tag: "cloud-login",
      },
      register: {
        tag: "cloud-register",
        load: () =>
          import(
            /* webpackChunkName: "cloud-register" */ "./register/cloud-register"
          ),
      },
      "forgot-password": {
        tag: "cloud-forgot-password",
        load: () =>
          import(
            /* webpackChunkName: "cloud-forgot-password" */ "./forgot-password/cloud-forgot-password"
          ),
      },
      account: {
        tag: "cloud-account",
      },
      "google-assistant": {
        tag: "cloud-google-assistant",
        load: () =>
          import(
            /* webpackChunkName: "cloud-google-assistant" */ "./google-assistant/cloud-google-assistant"
          ),
      },
      alexa: {
        tag: "cloud-alexa",
        load: () =>
          import(/* webpackChunkName: "cloud-alexa" */ "./alexa/cloud-alexa"),
      },
    },
  };

  @property() private _flashMessage = "";
  @property() private _loginEmail = "";
  private _resolveCloudStatusLoaded!: () => void;
  private _cloudStatusLoaded = new Promise((resolve) => {
    this._resolveCloudStatusLoaded = resolve;
  });

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this.addEventListener("cloud-done", (ev) => {
      this._flashMessage = (ev as any).detail.flashMessage;
      navigate(this, "/config/cloud/login");
    });
  }

  protected updated(changedProps) {
    super.updated(changedProps);

    if (changedProps.has("cloudStatus")) {
      const oldStatus = changedProps.get("cloudStatus") as
        | CloudStatus
        | undefined;
      if (oldStatus === undefined) {
        this._resolveCloudStatusLoaded();
      } else if (oldStatus.logged_in !== this.cloudStatus.logged_in) {
        navigate(this, this.route.prefix, true);
      }
    }
  }

  protected createElement(tag: string) {
    const el = super.createElement(tag);
    el.addEventListener("email-changed", (ev) => {
      this._loginEmail = (ev as PolymerChangedEvent<string>).detail.value;
    });
    el.addEventListener("flash-message-changed", (ev) => {
      this._flashMessage = (ev as PolymerChangedEvent<string>).detail.value;
    });
    return el;
  }

  protected updatePageEl(el) {
    // We are not going to update if the current page if we are not logged in
    // and the current page requires being logged in. Happens when we log out.
    if (
      this.cloudStatus &&
      !this.cloudStatus.logged_in &&
      LOGGED_IN_URLS.includes(this._currentPage)
    ) {
      return;
    }

    if ("setProperties" in el) {
      // As long as we have Polymer pages
      (el as PolymerElement).setProperties({
        hass: this.hass,
        email: this._loginEmail,
        isWide: this.isWide,
        cloudStatus: this.cloudStatus,
        flashMessage: this._flashMessage,
      });
    } else {
      el.hass = this.hass;
      el.email = this._loginEmail;
      el.isWide = this.isWide;
      el.narrow = this.narrow;
      el.cloudStatus = this.cloudStatus;
      el.flashMessage = this._flashMessage;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-cloud": HaConfigCloud;
  }
}
