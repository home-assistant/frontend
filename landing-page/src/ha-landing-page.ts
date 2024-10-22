import "@material/mwc-linear-progress";
import { type PropertyValues, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../src/components/ha-alert";
import { haStyle } from "../../src/resources/styles";
import "../../src/onboarding/onboarding-welcome-links";
import "./components/landing-page-network";
import "./components/landing-page-logs";
import { extractSearchParam } from "../../src/common/url/search-params";
import { onBoardingStyles } from "../../src/onboarding/styles";
import { makeDialogManager } from "../../src/dialogs/make-dialog-manager";
import { LandingPageBaseElement } from "./landing-page-base-element";

const SCHEDULE_CORE_CHECK_SECONDS = 5;

@customElement("ha-landing-page")
class HaLandingPage extends LandingPageBaseElement {
  @property({ attribute: false }) public translationFragment = "landing-page";

  @state() private _networkIssue = false;

  @state() private _supervisorError = false;

  @state() private _logDetails = false;

  private _mobileApp =
    extractSearchParam("redirect_uri") === "homeassistant://auth-callback";

  render() {
    return html`
      <ha-card>
        <div class="card-content">
          <h1>${this.localize("header")}</h1>
          ${!this._networkIssue && !this._supervisorError
            ? html`
                <p>${this.localize("subheader")}</p>
                <mwc-linear-progress indeterminate></mwc-linear-progress>
              `
            : nothing}
          <landing-page-network
            @value-changed=${this._networkInfoChanged}
            .localize=${this.localize}
          ></landing-page-network>

          ${this._supervisorError
            ? html`
                <ha-alert
                  alert-type="error"
                  .title=${this.localize("error_title")}
                >
                  ${this.localize("error_description")}
                </ha-alert>
              `
            : nothing}
          <landing-page-logs
            .localize=${this.localize}
            @landing-page-error=${this._showError}
          ></landing-page-logs>
        </div>
      </ha-card>
      <onboarding-welcome-links
        .localize=${this.localize}
        .mobileApp=${this._mobileApp}
      ></onboarding-welcome-links>
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
      </div>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);

    makeDialogManager(this, this.shadowRoot!);

    if (window.innerWidth > 450) {
      import("../../src/resources/particles");
    }
    import("../../src/components/ha-language-picker");

    this._scheduleCoreCheck();
  }

  private _scheduleCoreCheck() {
    setTimeout(
      () => this._checkCoreAvailability(),
      SCHEDULE_CORE_CHECK_SECONDS * 1000
    );
  }

  private async _checkCoreAvailability() {
    try {
      const response = await fetch("/manifest.json");
      if (response.ok) {
        location.reload();
      }
    } finally {
      this._scheduleCoreCheck();
    }
  }

  private _showError() {
    this._supervisorError = true;
  }

  private _networkInfoChanged(ev: CustomEvent) {
    this._networkIssue = ev.detail.value;
  }

  private _toggleLogDetails() {
    this._logDetails = !this._logDetails;
  }

  private _languageChanged(ev: CustomEvent) {
    const language = ev.detail.value;
    if (language !== this.language && language) {
      this.language = language;
      try {
        localStorage.setItem("selectedLanguage", JSON.stringify(language));
      } catch (err: any) {
        // Ignore
      }
    }
  }

  static styles = [
    haStyle,
    onBoardingStyles,
    css`
      .footer {
        padding-top: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      ha-card .card-content {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      ha-alert p {
        text-align: unset;
      }
      ha-language-picker {
        display: block;
        width: 200px;
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
        margin-inline-end: 16px;
        margin-inline-start: initial;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-landing-page": HaLandingPage;
  }
}
