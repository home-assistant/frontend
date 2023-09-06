import "@material/mwc-linear-progress/mwc-linear-progress";
import {
  Auth,
  createConnection,
  genClientId,
  getAuth,
  subscribeConfig,
} from "home-assistant-js-websocket";
import { PropertyValues, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  enableWrite,
  loadTokens,
  saveTokens,
} from "../common/auth/token_storage";
import { applyThemesOnElement } from "../common/dom/apply_themes_on_element";
import { HASSDomEvent } from "../common/dom/fire_event";
import {
  addSearchParam,
  extractSearchParam,
  extractSearchParamsObject,
} from "../common/url/search-params";
import { subscribeOne } from "../common/util/subscribe-one";
import "../components/ha-card";
import "../components/ha-language-picker";
import { AuthUrlSearchParams, hassUrl } from "../data/auth";
import {
  OnboardingResponses,
  OnboardingStep,
  fetchInstallationType,
  fetchOnboardingOverview,
  onboardIntegrationStep,
} from "../data/onboarding";
import { subscribeUser } from "../data/ws-user";
import { litLocalizeLiteMixin } from "../mixins/lit-localize-lite-mixin";
import { HassElement } from "../state/hass-element";
import { HomeAssistant } from "../types";
import { storeState } from "../util/ha-pref-storage";
import { registerServiceWorker } from "../util/register-service-worker";
import "./onboarding-analytics";
import "./onboarding-create-user";
import "./onboarding-loading";
import "./onboarding-welcome";
import "./onboarding-welcome-links";
import { makeDialogManager } from "../dialogs/make-dialog-manager";
import { navigate } from "../common/navigate";
import { mainWindow } from "../common/dom/get_main_window";

type OnboardingEvent =
  | {
      type: "init";
      result: { restore: boolean };
    }
  | {
      type: "user";
      result: OnboardingResponses["user"];
    }
  | {
      type: "core_config";
      result: OnboardingResponses["core_config"];
    }
  | {
      type: "integration";
    }
  | {
      type: "analytics";
    };

interface OnboardingProgressEvent {
  increase?: number;
  decrease?: number;
  progress?: number;
}

declare global {
  interface HASSDomEvents {
    "onboarding-step": OnboardingEvent;
    "onboarding-progress": OnboardingProgressEvent;
  }

  interface GlobalEventHandlersEventMap {
    "onboarding-step": HASSDomEvent<OnboardingEvent>;
    "onboarding-progress": HASSDomEvent<OnboardingProgressEvent>;
  }
}

@customElement("ha-onboarding")
class HaOnboarding extends litLocalizeLiteMixin(HassElement) {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public translationFragment = "page-onboarding";

  @state() private _progress = 0;

  @state() private _loading = false;

  @state() private _init = false;

  @state() private _restoring = false;

  @state() private _supervisor?: boolean;

  @state() private _steps?: OnboardingStep[];

  @state() private _page = extractSearchParam("page");

  private _mobileApp =
    extractSearchParam("redirect_uri") === "homeassistant://auth-callback";

  connectedCallback() {
    super.connectedCallback();
    mainWindow.addEventListener("location-changed", this._updatePage);
    mainWindow.addEventListener("popstate", this._updatePage);
  }

  disconnectedCallback() {
    super.connectedCallback();
    mainWindow.removeEventListener("location-changed", this._updatePage);
    mainWindow.removeEventListener("popstate", this._updatePage);
  }

  private _updatePage = () => {
    this._page = extractSearchParam("page");
  };

  protected render() {
    return html`<mwc-linear-progress
        .progress=${this._progress}
      ></mwc-linear-progress>
      <ha-card>
        <div class="card-content">${this._renderStep()}</div>
      </ha-card>
      ${this._init && !this._restoring
        ? html`<onboarding-welcome-links
            .localize=${this.localize}
            .mobileApp=${this._mobileApp}
          ></onboarding-welcome-links>`
        : nothing}
      <div class="footer">
        <ha-language-picker
          .value=${this.language}
          .label=${""}
          nativeName
          @value-changed=${this._languageChanged}
        ></ha-language-picker>
        <a
          href="https://www.home-assistant.io/getting-started/onboarding/"
          target="_blank"
          rel="noreferrer noopener"
          >${this.localize("ui.panel.page-onboarding.help")}</a
        >
      </div>`;
  }

  private _renderStep() {
    if (this._restoring) {
      return html`<onboarding-restore-backup
        .hass=${this.hass}
        .localize=${this.localize}
      >
      </onboarding-restore-backup>`;
    }

    if (this._init) {
      return html`<onboarding-welcome
        .localize=${this.localize}
        .language=${this.language}
        .supervisor=${this._supervisor}
      ></onboarding-welcome>`;
    }

    const step = this._curStep()!;

    if (this._loading || !step) {
      return html`<onboarding-loading></onboarding-loading> `;
    }
    if (step.step === "user") {
      return html`<onboarding-create-user
        .localize=${this.localize}
        .language=${this.language}
      >
      </onboarding-create-user>`;
    }
    if (step.step === "core_config") {
      return html`
        <onboarding-core-config
          .hass=${this.hass}
          .onboardingLocalize=${this.localize}
        ></onboarding-core-config>
      `;
    }
    if (step.step === "analytics") {
      return html`
        <onboarding-analytics
          .hass=${this.hass}
          .localize=${this.localize}
        ></onboarding-analytics>
      `;
    }
    if (step.step === "integration") {
      return html`
        <onboarding-integrations
          .hass=${this.hass}
          .onboardingLocalize=${this.localize}
        ></onboarding-integrations>
      `;
    }
    return nothing;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this._fetchOnboardingSteps();
    import("./onboarding-integrations");
    import("./onboarding-core-config");
    registerServiceWorker(this, false);
    this.addEventListener("onboarding-step", (ev) => this._handleStepDone(ev));
    this.addEventListener("onboarding-progress", (ev) =>
      this._handleProgress(ev)
    );
    if (window.innerWidth > 450) {
      import("./particles");
    }
    makeDialogManager(this, this.shadowRoot!);
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (changedProps.has("_page")) {
      this._restoring = this._page === "restore_backup";
      if (this._page === null && this._steps && !this._steps[0].done) {
        this._init = true;
      }
    }
    if (changedProps.has("language")) {
      document.querySelector("html")!.setAttribute("lang", this.language!);
    }
    if (changedProps.has("hass")) {
      const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
      this.hassChanged(this.hass!, oldHass);
      if (oldHass?.themes !== this.hass!.themes) {
        if (matchMedia("(prefers-color-scheme: dark)").matches) {
          applyThemesOnElement(
            document.documentElement,
            {
              default_theme: "default",
              default_dark_theme: null,
              themes: {},
              darkMode: true,
              theme: "default",
            },
            undefined,
            undefined,
            true
          );
        }
      }
    }
  }

  private _curStep() {
    return this._steps ? this._steps.find((stp) => !stp.done) : undefined;
  }

  private async _fetchInstallationType(): Promise<void> {
    try {
      const response = await fetchInstallationType();
      this._supervisor = [
        "Home Assistant OS",
        "Home Assistant Supervised",
      ].includes(response.installation_type);
      if (this._supervisor) {
        // Only load if we have supervisor
        import("./onboarding-restore-backup");
      }
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error(
        "Something went wrong loading onboarding-restore-backup",
        err
      );
    }
  }

  private async _fetchOnboardingSteps() {
    try {
      const response = await (window.stepsPromise || fetchOnboardingOverview());

      if (response.status === 404) {
        // We don't load the component when onboarding is done
        document.location.assign("/");
        return;
      }

      const steps: OnboardingStep[] = await response.json();

      if (steps.every((step) => step.done)) {
        // Onboarding is done!
        document.location.assign("/");
        return;
      }

      if (steps[0].done) {
        // First step is already done, so we need to get auth somewhere else.
        const auth = await getAuth({
          hassUrl,
          limitHassInstance: true,
          saveTokens,
          loadTokens: () => Promise.resolve(loadTokens()),
        });
        history.replaceState(null, "", location.pathname);
        await this._connectHass(auth);
        const currentStep = steps.findIndex((stp) => !stp.done);
        const singelStepProgress = 1 / steps.length;
        this._progress = currentStep * singelStepProgress + singelStepProgress;
      } else {
        this._init = true;
        // Init screen needs to know the installation type.
        this._fetchInstallationType();
      }

      this._steps = steps;
    } catch (err: any) {
      alert("Something went wrong loading onboarding, try refreshing");
    }
  }

  private _handleProgress(ev: HASSDomEvent<OnboardingProgressEvent>) {
    const stepSize = 1 / this._steps!.length;
    if (ev.detail.increase) {
      this._progress += ev.detail.increase * stepSize;
    }
    if (ev.detail.decrease) {
      this._progress -= ev.detail.decrease * stepSize;
    }
    if (ev.detail.progress) {
      this._progress = ev.detail.progress;
    }
  }

  private async _handleStepDone(ev: HASSDomEvent<OnboardingEvent>) {
    const stepResult = ev.detail;
    this._steps = this._steps!.map((step) =>
      step.step === stepResult.type ? { ...step, done: true } : step
    );

    if (stepResult.type === "init") {
      this._init = false;
      this._restoring = stepResult.result.restore;
      if (!this._restoring) {
        this._progress = 0.25;
      } else {
        navigate(
          `${location.pathname}?${addSearchParam({ page: "restore_backup" })}`
        );
      }
    } else if (stepResult.type === "user") {
      const result = stepResult.result as OnboardingResponses["user"];
      this._loading = true;
      this._progress = 0.5;
      enableWrite();
      try {
        const auth = await getAuth({
          hassUrl,
          limitHassInstance: true,
          authCode: result.auth_code,
          saveTokens,
        });
        await this._connectHass(auth);
      } catch (err: any) {
        alert("Ah snap, something went wrong!");
        location.reload();
      } finally {
        this._loading = false;
      }
    } else if (stepResult.type === "core_config") {
      this._progress = 0.75;
      // We do nothing
    } else if (stepResult.type === "analytics") {
      this._progress = 1;
      // We do nothing
    } else if (stepResult.type === "integration") {
      this._loading = true;

      // Determine if oauth redirect has been provided
      const externalAuthParams =
        extractSearchParamsObject() as AuthUrlSearchParams;
      const authParams =
        externalAuthParams.client_id && externalAuthParams.redirect_uri
          ? externalAuthParams
          : {
              client_id: genClientId(),
              redirect_uri: `${location.protocol}//${location.host}/?auth_callback=1`,
              state: btoa(
                JSON.stringify({
                  hassUrl: `${location.protocol}//${location.host}`,
                  clientId: genClientId(),
                })
              ),
            };

      let result: OnboardingResponses["integration"];

      try {
        result = await onboardIntegrationStep(this.hass!, {
          client_id: authParams.client_id!,
          redirect_uri: authParams.redirect_uri!,
        });
      } catch (err: any) {
        this.hass!.connection.close();
        await this.hass!.auth.revoke();

        alert(`Unable to finish onboarding: ${err.message}`);

        document.location.assign("/?");
        return;
      }

      // If we don't close the connection manually, the connection will be
      // closed when we navigate away from the page. Firefox allows JS to
      // continue to execute, and so HAWS will automatically reconnect once
      // the connection is closed. However, since we revoke our token below,
      // HAWS will reload the page, since that will trigger the auth flow.
      // In Firefox, triggering a reload will overrule the navigation that
      // was in progress.
      this.hass!.connection.close();

      // Revoke current auth token.
      await this.hass!.auth.revoke();

      // Build up the url to redirect to
      let redirectUrl = authParams.redirect_uri!;
      redirectUrl +=
        (redirectUrl.includes("?") ? "&" : "?") +
        `code=${encodeURIComponent(result.auth_code)}`;

      if (authParams.state) {
        redirectUrl += `&state=${encodeURIComponent(authParams.state)}`;
      }

      document.location.assign(redirectUrl);
    }
  }

  private async _connectHass(auth: Auth) {
    const conn = await createConnection({ auth });
    // Make sure config and user info is loaded before we initialize.
    // It is needed for the core config step.
    await Promise.all([
      subscribeOne(conn, subscribeConfig),
      subscribeOne(conn, subscribeUser),
    ]);
    this.initializeHass(auth, conn);
    if (this.language && this.language !== this.hass!.language) {
      this._updateHass({
        locale: { ...this.hass!.locale, language: this.language },
        language: this.language,
        selectedLanguage: this.language,
      });
      storeState(this.hass!);
    }
    // Load config strings for integrations
    (this as any)._loadFragmentTranslations(this.hass!.language, "config");
    // Make sure hass is initialized + the config/user callbacks have called.
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  }

  private _languageChanged(ev: CustomEvent) {
    const language = ev.detail.value;
    this.language = language;
    if (this.hass) {
      this._updateHass({
        locale: { ...this.hass!.locale, language },
        language,
        selectedLanguage: language,
      });
      storeState(this.hass!);
    } else {
      try {
        localStorage.setItem("selectedLanguage", JSON.stringify(language));
      } catch (err: any) {
        // Ignore
      }
    }
  }

  static styles = css`
    mwc-linear-progress {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      z-index: 10;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    ha-language-picker {
      display: block;
      width: 200px;
      margin-top: 8px;
      border-radius: 4px;
      overflow: hidden;
      --ha-select-height: 40px;
      --mdc-select-fill-color: none;
      --mdc-select-label-ink-color: var(--primary-text-color, #212121);
      --mdc-select-ink-color: var(--primary-text-color, #212121);
      --mdc-select-idle-line-color: transparent;
      --mdc-select-hover-line-color: transparent;
      --mdc-select-dropdown-icon-color: var(--primary-text-color, #212121);
      --mdc-shape-small: 0;
    }
    a {
      text-decoration: none;
      color: var(--primary-text-color);
      margin-right: 16px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-onboarding": HaOnboarding;
  }
}
