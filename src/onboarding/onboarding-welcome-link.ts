import type { TemplateResult } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import "../components/ha-card";
import "../components/ha-ripple";
import "../components/ha-svg-icon";

@customElement("onboarding-welcome-link")
class OnboardingWelcomeLink extends LitElement {
  @property() public label!: string;

  @property({ attribute: false }) public iconPath!: string;

  @property({ type: Boolean }) public noninteractive = false;

  protected render(): TemplateResult {
    return html`
      <ha-card
        .tabIndex=${this.noninteractive ? "-1" : "0"}
        @keydown=${this._handleKeyDown}
      >
        <ha-svg-icon .path=${this.iconPath}></ha-svg-icon>
        ${this.label}
        <ha-ripple></ha-ripple>
      </ha-card>
    `;
  }

  private _handleKeyDown(ev: KeyboardEvent): void {
    if (ev.key === "Enter" || ev.key === " ") {
      (ev.target as HTMLElement).click();
    }
  }

  static styles = css`
    :host {
      cursor: pointer;
    }
    ha-card {
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      font-weight: var(--ha-font-weight-medium);
      padding: 32px 16px;
      height: 100%;
    }
    ha-svg-icon {
      color: var(--text-primary-color);
      background: var(--welcome-link-color, var(--primary-color));
      border-radius: var(--ha-border-radius-circle);
      padding: 8px;
      margin-bottom: 16px;
    }
    ha-card:focus-visible:before {
      position: absolute;
      display: block;
      content: "";
      inset: 0;
      background-color: var(--secondary-text-color);
      opacity: 0.08;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "onboarding-welcome-link": OnboardingWelcomeLink;
  }
}
