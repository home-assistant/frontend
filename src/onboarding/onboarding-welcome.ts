import {
  CSSResultGroup,
  LitElement,
  TemplateResult,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property } from "lit/decorators";
import type { LocalizeFunc } from "../common/translations/localize";
import type { HomeAssistant } from "../types";
import { onBoardingStyles } from "./styles";
import { fireEvent } from "../common/dom/fire_event";
import "../components/ha-button";

@customElement("onboarding-welcome")
class OnboardingWelcome extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public localize!: LocalizeFunc;

  @property({ type: Boolean }) public supervisor?: boolean;

  protected render(): TemplateResult {
    return html`
      <h1>${this.localize("ui.panel.page-onboarding.welcome.header")}</h1>
      <p>${this.localize("ui.panel.page-onboarding.intro")}</p>

      <ha-button unelevated @click=${this._start} class="start">
        ${this.localize("ui.panel.page-onboarding.welcome.start")}
      </ha-button>

      ${this.supervisor
        ? html`<ha-button @click=${this._restoreBackup}>
            ${this.localize("ui.panel.page-onboarding.welcome.restore_backup")}
          </ha-button>`
        : nothing}
    `;
  }

  private _start(): void {
    fireEvent(this, "onboarding-step", {
      type: "init",
      result: { restore: false },
    });
  }

  private _restoreBackup(): void {
    fireEvent(this, "onboarding-step", {
      type: "init",
      result: { restore: true },
    });
  }

  static get styles(): CSSResultGroup {
    return [
      onBoardingStyles,
      css`
        :host {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .start {
          --button-height: 48px;
          --mdc-typography-button-font-size: 1rem;
          --mdc-button-horizontal-padding: 24px;
          margin: 16px 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "onboarding-welcome": OnboardingWelcome;
  }
}
