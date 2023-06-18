import { PolymerElement } from "@polymer/polymer";
import { customElement, property, state } from "lit/decorators";
import { navigate } from "../../../common/navigate";
import { CloudStatus } from "../../../data/cloud";
import {
  HassRouterPage,
  RouterOptions,
} from "../../../layouts/hass-router-page";
import { ValueChangedEvent, HomeAssistant, Route } from "../../../types";
import "./account/cloud-account";
import "./login/cloud-login";

const LOGGED_IN_URLS = ["account", "google-assistant", "alexa"];
const NOT_LOGGED_IN_URLS = ["login", "register", "forgot-password"];

@customElement("ha-config-cloud")
class HaConfigCloud extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

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
      } else if (!NOT_LOGGED_IN_URLS.includes(page)) {
        return "login";
      }
      return undefined;
    },
    routes: {
      login: {
        tag: "cloud-login",
      },
      register: {
        tag: "cloud-register",
        load: () => import("./register/cloud-register"),
      },
      "forgot-password": {
        tag: "cloud-forgot-password",
        load: () => import("./forgot-password/cloud-forgot-password"),
      },
      account: {
        tag: "cloud-account",
      },
    },
  };

  @state() private _flashMessage = "";

  @state() private _loginEmail = "";

  private _resolveCloudStatusLoaded!: () => void;

  private _cloudStatusLoaded = new Promise<void>((resolve) => {
    this._resolveCloudStatusLoaded = resolve;
  });

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this.addEventListener("cloud-done", (ev) => {
      this._flashMessage = (ev as any).detail.flashMessage;
      navigate("/config/cloud/login");
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
        navigate(this.route.prefix, { replace: true });
      }
    }
  }

  protected createElement(tag: string) {
    const el = super.createElement(tag);
    el.addEventListener("email-changed", (ev) => {
      this._loginEmail = (ev as ValueChangedEvent<string>).detail.value;
    });
    el.addEventListener("flash-message-changed", (ev) => {
      this._flashMessage = (ev as ValueChangedEvent<string>).detail.value;
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
        narrow: this.narrow,
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
