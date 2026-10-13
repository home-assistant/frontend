import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators";

@customElement("onboarding-loading")
class OnboardingLoading extends LitElement {
  protected render(): TemplateResult {
    return html`<div class="loader"></div>`;
  }

  static styles = css`
    /* MIT License (MIT). Copyright (c) 2014 Luke Haas */
    .loader,
    .loader:after {
      border-radius: var(--ha-border-radius-circle);
      width: 40px;
      height: 40px;
    }
    .loader {
      margin: 60px auto;
      font-size: 4px;
      position: relative;
      text-indent: -9999em;
      border-top: 1.1em solid rgba(3, 169, 244, 0.2);
      border-right: 1.1em solid rgba(3, 169, 244, 0.2);
      border-bottom: 1.1em solid rgba(3, 169, 244, 0.2);
      border-left: 1.1em solid rgb(3, 168, 244);
      transform: translateZ(0);
      animation: load8 1.4s infinite linear;
    }
    @keyframes load8 {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "onboarding-loading": OnboardingLoading;
  }
}
