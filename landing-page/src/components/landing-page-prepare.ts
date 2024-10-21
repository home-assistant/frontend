import "@material/mwc-linear-progress/mwc-linear-progress";
import { CSSResultGroup, LitElement, TemplateResult, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { LocalizeFunc } from "../../../src/common/translations/localize";
import type { HomeAssistant } from "../../../src/types";
import { onBoardingStyles } from "../../../src/onboarding/styles";
import "../../../src/components/ha-button";

@customElement("landing-page-prepare")
class LandingPagePrepare extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public localize!: LocalizeFunc;

  @state() private _showDetails = false;

  protected render(): TemplateResult {
    return html`
      <h1>${this.localize("ui.panel.page-onboarding.prepare.header")}</h1>
      <p>${this.localize("ui.panel.page-onboarding.prepare.subheader")}</p>
      <mwc-linear-progress indeterminate></mwc-linear-progress>

      <ha-button @click=${this._toggleDetails}>
        ${this.localize(
          this._showDetails
            ? "ui.panel.page-onboarding.prepare.hide_details"
            : "ui.panel.page-onboarding.prepare.show_details"
        )}
      </ha-button>
    `;
  }

  private _toggleDetails(): void {
    this._showDetails = !this._showDetails;
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
        mwc-linear-progress {
          width: 100%;
          margin: 32px 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "landing-page-prepare": LandingPagePrepare;
  }
}
