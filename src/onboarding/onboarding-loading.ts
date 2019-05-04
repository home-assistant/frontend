import { LitElement, TemplateResult, html, customElement } from "lit-element";

@customElement("onboarding-loading")
class OnboardingLoading extends LitElement {
  protected render(): TemplateResult | void {
    return html`
      Loading…
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "onboarding-loading": OnboardingLoading;
  }
}
