import {
  LitElement,
  TemplateResult,
  html,
  customElement,
  CSSResult,
  css,
} from "lit-element";

@customElement("onboarding-loading")
class OnboardingLoading extends LitElement {
  protected render(): TemplateResult {
    return html`
      <div class="loader"></div>
    `;
  }

  static get styles(): CSSResult {
    return css`
      /* MIT License (MIT). Copyright (c) 2014 Luke Haas */
      .loader,
      .loader:after {
        border-radius: 50%;
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
        -webkit-transform: translateZ(0);
        -ms-transform: translateZ(0);
        transform: translateZ(0);
        -webkit-animation: load8 1.4s infinite linear;
        animation: load8 1.4s infinite linear;
      }
      @-webkit-keyframes load8 {
        0% {
          -webkit-transform: rotate(0deg);
          transform: rotate(0deg);
        }
        100% {
          -webkit-transform: rotate(360deg);
          transform: rotate(360deg);
        }
      }
      @keyframes load8 {
        0% {
          -webkit-transform: rotate(0deg);
          transform: rotate(0deg);
        }
        100% {
          -webkit-transform: rotate(360deg);
          transform: rotate(360deg);
        }
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "onboarding-loading": OnboardingLoading;
  }
}
