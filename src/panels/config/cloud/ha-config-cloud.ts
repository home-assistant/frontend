import type { PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { navigate } from "../../../common/navigate";
import type { CloudStatus } from "../../../data/cloud";
import type { RouterOptions } from "../../../layouts/hass-router-page";
import { HassRouterPage } from "../../../layouts/hass-router-page";
import type { ValueChangedEvent, HomeAssistant, Route } from "../../../types";
import "./account/cloud-account";
import "./login/cloud-login-panel";

const LOGGED_IN_URLS = [
  "account",
  "remote",
  "backup",
  "voice-assistants",
  "companion",
  "webrtc",
  "webhooks",
] as const;

const NOT_LOGGED_IN_URLS = ["login", "register", "forgot-password"] as const;

type CloudPage =
  (typeof LOGGED_IN_URLS)[number] | (typeof NOT_LOGGED_IN_URLS)[number];

@customElement("ha-config-cloud")
class HaConfigCloud extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: false }) public cloudStatus!: CloudStatus;

  protected routerOptions: RouterOptions = {
    defaultPage: "login",
    showLoading: true,
    initialLoad: () => this._cloudStatusLoaded,
    // Guard the different pages based on if we're logged in.
    beforeRender: (page: string) => {
      if (this.cloudStatus.logged_in) {
        if (!LOGGED_IN_URLS.some((url) => url === page)) {
          return "account";
        }
      } else if (!NOT_LOGGED_IN_URLS.some((url) => url === page)) {
        return "login";
      }
      return undefined;
    },
    routes: {
      login: {
        tag: "cloud-login-panel",
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
      remote: {
        tag: "cloud-remote-pref",
        load: () => import("./account/cloud-remote-pref"),
      },
      backup: {
        tag: "cloud-backup-pref",
        load: () => import("./account/cloud-backup-pref"),
      },
      "voice-assistants": {
        tag: "cloud-tts-pref",
        load: () => import("./account/cloud-tts-pref"),
      },
      companion: {
        tag: "cloud-companion-pref",
        load: () => import("./account/cloud-companion-pref"),
      },
      webrtc: {
        tag: "cloud-ice-servers-pref",
        load: () => import("./account/cloud-ice-servers-pref"),
      },
      webhooks: {
        tag: "cloud-webhooks",
        load: () => import("./account/cloud-webhooks"),
      },
    } satisfies Record<CloudPage, RouterOptions["routes"][string]>,
  };

  @state() private _flashMessage = "";

  @state() private _loginEmail = "";

  private _resolveCloudStatusLoaded!: () => void;

  private _cloudStatusLoaded = new Promise<void>((resolve) => {
    this._resolveCloudStatusLoaded = resolve;
  });

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    this.addEventListener("cloud-done", (ev) => {
      this._flashMessage = (ev as any).detail.flashMessage;
      navigate("/config/cloud/login");
    });
  }

  protected updated(changedProps: PropertyValues<this>) {
    super.updated(changedProps);

    if (changedProps.has("cloudStatus")) {
      const oldStatus = changedProps.get("cloudStatus") as
        CloudStatus | undefined;
      if (oldStatus === undefined) {
        this._resolveCloudStatusLoaded();
      } else if (oldStatus.logged_in !== this.cloudStatus.logged_in) {
        navigate(this.route.prefix, { replace: true });
      }
    }
  }

  protected createElement(tag: string) {
    const el = super.createElement(tag);
    el.addEventListener("cloud-email-changed", (ev) => {
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
      LOGGED_IN_URLS.some((url) => url === this._currentPage)
    ) {
      return;
    }

    el.hass = this.hass;
    el.email = this._loginEmail;
    el.isWide = this.isWide;
    el.narrow = this.narrow;
    el.cloudStatus = this.cloudStatus;
    el.flashMessage = this._flashMessage;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-cloud": HaConfigCloud;
  }
}
