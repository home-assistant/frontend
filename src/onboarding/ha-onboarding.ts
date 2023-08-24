import {
  Auth,
  createConnection,
  genClientId,
  getAuth,
  subscribeConfig,
} from "home-assistant-js-websocket";
import { html, PropertyValues, nothing, css } from "lit";
import { customElement, property, state } from "lit/decorators";
import { applyThemesOnElement } from "../common/dom/apply_themes_on_element";
import { HASSDomEvent } from "../common/dom/fire_event";
import { extractSearchParamsObject } from "../common/url/search-params";
import { subscribeOne } from "../common/util/subscribe-one";
import { AuthUrlSearchParams, hassUrl } from "../data/auth";
import {
  fetchInstallationType,
  fetchOnboardingOverview,
  OnboardingResponses,
  OnboardingStep,
  onboardIntegrationStep,
} from "../data/onboarding";
import { subscribeUser } from "../data/ws-user";
import { litLocalizeLiteMixin } from "../mixins/lit-localize-lite-mixin";
import { HassElement } from "../state/hass-element";
import { HomeAssistant } from "../types";
import { registerServiceWorker } from "../util/register-service-worker";
import "./onboarding-analytics";
import "./onboarding-create-user";
import "./onboarding-loading";
import "../components/ha-language-picker";
import "../components/ha-card";
import { storeState } from "../util/ha-pref-storage";
import {
  enableWrite,
  loadTokens,
  saveTokens,
} from "../common/auth/token_storage";
import { storeState } from "../util/ha-pref-storage";

type OnboardingEvent =
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

declare global {
  interface HASSDomEvents {
    "onboarding-step": OnboardingEvent;
  }

  interface GlobalEventHandlersEventMap {
    "onboarding-step": HASSDomEvent<OnboardingEvent>;
  }
}

@customElement("ha-onboarding")
class HaOnboarding extends litLocalizeLiteMixin(HassElement) {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public translationFragment = "page-onboarding";

  @state() private _loading = false;

  @state() private _restoring = false;

  @state() private _supervisor?: boolean;

  @state() private _steps?: OnboardingStep[];

  protected render() {
    return html`<ha-card>
        <div class="card-content">${this._renderStep()}</div>
      </ha-card>
      <ha-language-picker
        .value=${this.language}
        .label=${""}
        nativeName
        @value-changed=${this._languageChanged}
      ></ha-language-picker>`;
  }

  private _renderStep() {
    const step = this._curStep()!;

    if (this._loading || !step) {
      return html`<onboarding-loading></onboarding-loading> `;
    }
    if (step.step === "user") {
      return html`
        ${!this._restoring
          ? html`<onboarding-create-user
              .localize=${this.localize}
              .language=${this.language}
            >
            </onboarding-create-user>`
          : ""}
        ${this._supervisor
          ? html`<onboarding-restore-backup
              .localize=${this.localize}
              .restoring=${this._restoring}
              @restoring=${this._restoringBackup}
            >
            </onboarding-restore-backup>`
          : ""}
      `;
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
    if (window.innerWidth > 450) {
      import("./particles");
    }
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
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

  private _restoringBackup() {
    this._restoring = true;
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
      } else {
        // User creating screen needs to know the installation type.
        this._fetchInstallationType();
      }

      this._steps = steps;
    } catch (err: any) {
      alert("Something went wrong loading onboarding, try refreshing");
    }
  }

  private async _handleStepDone(ev: HASSDomEvent<OnboardingEvent>) {
    const stepResult = ev.detail;
    this._steps = this._steps!.map((step) =>
      step.step === stepResult.type ? { ...step, done: true } : step
    );

    if (stepResult.type === "user") {
      const result = stepResult.result as OnboardingResponses["user"];
      this._loading = true;
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
    }
  }

  static styles = css`
    ha-language-picker {
      display: block;
      width: 200px;
      margin-top: 8px;
      border-radius: 4px;
      overflow: hidden;
      --mdc-select-fill-color: none;
      --mdc-select-label-ink-color: var(--primary-text-color, #212121);
      --mdc-select-ink-color: var(--primary-text-color, #212121);
      --mdc-select-idle-line-color: transparent;
      --mdc-select-hover-line-color: transparent;
      --mdc-select-dropdown-icon-color: var(--primary-text-color, #212121);
      --mdc-shape-small: 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-onboarding": HaOnboarding;
  }
}
