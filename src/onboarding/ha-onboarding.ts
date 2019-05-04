import {
  LitElement,
  html,
  PropertyValues,
  customElement,
  TemplateResult,
  property,
} from "lit-element";
import { genClientId } from "home-assistant-js-websocket";
import { litLocalizeLiteMixin } from "../mixins/lit-localize-lite-mixin";
import {
  OnboardingStep,
  ValidOnboardingStep,
  OnboardingResponses,
} from "../data/onboarding";
import { registerServiceWorker } from "../util/register-service-worker";
import { HASSDomEvent } from "../common/dom/fire_event";
import "./onboarding-create-user";
import "./onboarding-loading";

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
class HaOnboarding extends litLocalizeLiteMixin(LitElement) {
  public translationFragment = "page-onboarding";

  @property() private _steps?: OnboardingStep[];

  protected render(): TemplateResult | void {
    if (!this._steps) {
      return html`
        <onboarding-loading></onboarding-loading>
      `;
    }

    const step = this._steps.find((stp) => !stp.done)!;

    if (step.step === "user") {
      return html`
        <onboarding-create-user
          .localize=${this.localize}
        ></onboarding-create-user>
      `;
    }
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this._fetchOnboardingSteps();
    registerServiceWorker(false);
    this.addEventListener("onboarding-step", (ev) => this._handleStepDone(ev));
  }

  private async _fetchOnboardingSteps() {
    try {
      const response = await window.stepsPromise;

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

      this._steps = steps;
    } catch (err) {
      alert("Something went wrong loading loading onboarding, try refreshing");
    }
  }

  private async _handleStepDone(
    ev: HASSDomEvent<OnboardingEvent<ValidOnboardingStep>>
  ) {
    const stepResult = ev.detail;

    if (stepResult.type === "user") {
      const result = stepResult.result as OnboardingResponses["user"];
      const state = btoa(
        JSON.stringify({
          hassUrl: `${location.protocol}//${location.host}`,
          clientId: genClientId(),
        })
      );
      document.location.href = `/?auth_callback=1&code=${encodeURIComponent(
        result.auth_code
      )}&state=${state}`;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-onboarding": HaOnboarding;
  }
}
