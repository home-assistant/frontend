import {
  html,
  PropertyValues,
  customElement,
  TemplateResult,
  property,
} from "lit-element";
import {
  getAuth,
  createConnection,
  genClientId,
} from "home-assistant-js-websocket";
import { litLocalizeLiteMixin } from "../mixins/lit-localize-lite-mixin";
import {
  OnboardingStep,
  ValidOnboardingStep,
  OnboardingResponses,
  fetchOnboardingOverview,
} from "../data/onboarding";
import { registerServiceWorker } from "../util/register-service-worker";
import { HASSDomEvent } from "../common/dom/fire_event";
import "./onboarding-create-user";
import "./onboarding-loading";
import { hassUrl } from "../data/auth";
import { HassElement } from "../state/hass-element";

interface OnboardingEvent<T extends ValidOnboardingStep> {
  type: T;
  result: OnboardingResponses[T];
}

declare global {
  interface HASSDomEvents {
    "onboarding-step": OnboardingEvent<ValidOnboardingStep>;
  }

  interface GlobalEventHandlersEventMap {
    "onboarding-step": HASSDomEvent<OnboardingEvent<ValidOnboardingStep>>;
  }
}

@customElement("ha-onboarding")
class HaOnboarding extends litLocalizeLiteMixin(HassElement) {
  public translationFragment = "page-onboarding";

  @property() private _loading = false;
  @property() private _steps?: OnboardingStep[];
  private _finishAuthCode?: string;

  protected render(): TemplateResult | void {
    const step = this._curStep()!;

    if (this._loading || !step) {
      return html`
        <onboarding-loading></onboarding-loading>
      `;
    } else if (step.step === "user") {
      return html`
        <onboarding-create-user
          .localize=${this.localize}
          .language=${this.language}
        ></onboarding-create-user>
      `;
    } else if (step.step === "integration") {
      return html`
        <onboarding-integrations
          .hass=${this.hass}
          .onboardingLocalize=${this.localize}
        ></onboarding-integrations>
      `;
    }
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this._fetchOnboardingSteps();
    import("./onboarding-integrations");
    registerServiceWorker(false);
    this.addEventListener("onboarding-step", (ev) => this._handleStepDone(ev));
  }

  private _curStep() {
    return this._steps ? this._steps.find((stp) => !stp.done) : undefined;
  }

  private async _fetchOnboardingSteps() {
    try {
      const response = await (window.stepsPromise || fetchOnboardingOverview());

      if (response.status === 404) {
        // We don't load the component when onboarding is done
        document.location.href = "/";
        return;
      }

      const steps: OnboardingStep[] = await response.json();

      if (steps.every((step) => step.done)) {
        // Onboarding is done!
        document.location.href = "/";
      }

      // Concatenate our non-mandatory onboarding steps, if user refreshes, they go to the app.
      this._steps = [...steps, { step: "integration", done: false }];
    } catch (err) {
      alert("Something went wrong loading loading onboarding, try refreshing");
    }
  }

  private async _handleStepDone(
    ev: HASSDomEvent<OnboardingEvent<ValidOnboardingStep>>
  ) {
    const stepResult = ev.detail;
    this._steps = this._steps!.map((step) =>
      step.step === stepResult.type ? { ...step, done: true } : step
    );

    if (stepResult.type === "user") {
      const result = stepResult.result as OnboardingResponses["user"];
      this._finishAuthCode = result.auth_code_2;

      this._loading = true;
      try {
        const auth = await getAuth({
          hassUrl,
          authCode: result.auth_code,
        });
        const conn = await createConnection({ auth });
        this.initializeHass(auth, conn);
        // Load config strings for integrations
        (this as any)._loadFragmentTranslations(this.hass!.language, "config");
      } catch (err) {
        alert("Ah snap, something went wrong!");
        location.reload();
      } finally {
        this._loading = false;
      }
    } else if (stepResult.type === "integration") {
      this._loading = true;

      // Revoke current auth token.
      await this.hass!.auth.revoke();

      const state = btoa(
        JSON.stringify({
          hassUrl: `${location.protocol}//${location.host}`,
          clientId: genClientId(),
        })
      );
      document.location.assign(
        `/?auth_callback=1&code=${encodeURIComponent(
          this._finishAuthCode!
        )}&state=${state}`
      );
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-onboarding": HaOnboarding;
  }
}
