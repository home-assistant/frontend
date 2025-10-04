import "@material/mwc-linear-progress";
import { type PropertyValues, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../src/components/ha-alert";
import "../../src/components/ha-fade-in";
import "../../src/components/ha-spinner";
import { haStyle } from "../../src/resources/styles";
import "../../src/onboarding/onboarding-welcome-links";
import "./components/landing-page-network";
import "./components/landing-page-logs";
import { extractSearchParam } from "../../src/common/url/search-params";
import { onBoardingStyles } from "../../src/onboarding/styles";
import { makeDialogManager } from "../../src/dialogs/make-dialog-manager";
import { LandingPageBaseElement } from "./landing-page-base-element";
import {
  getSupervisorNetworkInfo,
  pingSupervisor,
  type NetworkInfo,
} from "./data/supervisor";

export const ASSUME_CORE_START_SECONDS = 60;
const SCHEDULE_CORE_CHECK_SECONDS = 1;
const SCHEDULE_FETCH_NETWORK_INFO_SECONDS = 5;

@customElement("ha-landing-page")
class HaLandingPage extends LandingPageBaseElement {
  @property({ attribute: false }) public translationFragment = "landing-page";

  @state() private _supervisorError = false;

  @state() private _networkInfo?: NetworkInfo;

  @state() private _coreStatusChecked = false;

  @state() private _networkInfoError = false;

  @state() private _coreCheckActive = false;

  private _mobileApp =
    extractSearchParam("redirect_uri") === "homeassistant://auth-callback";

  render() {
    const networkIssue = this._networkInfo && !this._networkInfo.host_internet;

    if (!this.localize) {
      return html`
        <ha-fade-in>
          <ha-spinner size="large"></ha-spinner>
        </ha-fade-in>
      `;
    }

    return html`
      <ha-card>
        <div class="card-content">
          <h1>${this.localize("header")}</h1>
          ${!networkIssue && !this._supervisorError
            ? html`
                <p>${this.localize("subheader")}</p>
                <mwc-linear-progress indeterminate></mwc-linear-progress>
              `
            : nothing}
          ${networkIssue || this._networkInfoError
            ? html`
                <landing-page-network
                  .localize=${this.localize}
                  .networkInfo=${this._networkInfo}
                  .error=${this._networkInfoError}
                  @dns-set=${this._fetchSupervisorInfo}
                ></landing-page-network>
              `
            : nothing}
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
          native-name
          @value-changed=${this._languageChanged}
          inline-arrow
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

    this._fetchSupervisorInfo(true);
  }

  private _scheduleFetchSupervisorInfo() {
    setTimeout(
      () => this._fetchSupervisorInfo(true),
      // on assumed core start check every second, otherwise every 5 seconds
      (this._coreCheckActive
        ? SCHEDULE_CORE_CHECK_SECONDS
        : SCHEDULE_FETCH_NETWORK_INFO_SECONDS) * 1000
    );
  }

  private _scheduleTurnOffCoreCheck() {
    setTimeout(() => {
      this._coreCheckActive = false;
    }, ASSUME_CORE_START_SECONDS * 1000);
  }

  private async _fetchSupervisorInfo(schedule = false) {
    try {
      const response = await pingSupervisor();
      if (!response.ok) {
        throw new Error("ping-failed");
      }

      this._networkInfo = await getSupervisorNetworkInfo();
      this._networkInfoError = false;
      this._coreStatusChecked = false;
    } catch (err: any) {
      if (!this._coreStatusChecked) {
        // wait before show errors, because we assume that core is starting
        this._coreCheckActive = true;
        this._scheduleTurnOffCoreCheck();
      }
      await this._checkCoreAvailability();

      // assume supervisor update if ping fails -> don't show an error
      if (!this._coreCheckActive && err.message !== "ping-failed") {
        // eslint-disable-next-line no-console
        console.error(err);
        this._networkInfoError = true;
      }
    }

    if (schedule) {
      this._scheduleFetchSupervisorInfo();
    }
  }

  private async _checkCoreAvailability() {
    try {
      const response = await fetch("/manifest.json");
      if (response.ok) {
        location.reload();
      } else {
        throw new Error("Failed to fetch manifest");
      }
    } catch (_err) {
      this._coreStatusChecked = true;
    }
  }

  private _showError() {
    this._supervisorError = true;
  }

  private _languageChanged(ev: CustomEvent) {
    const language = ev.detail.value;
    if (language !== this.language && language) {
      this.language = language;
      try {
        window.localStorage.setItem(
          "selectedLanguage",
          JSON.stringify(language)
        );
      } catch (_err: any) {
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
        gap: var(--ha-space-4);
      }
      ha-alert p {
        text-align: unset;
      }
      ha-language-picker {
        display: block;
        width: 200px;
        border-radius: var(--ha-border-radius-sm);
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
      ha-fade-in {
        min-height: calc(100vh - 64px - 88px);
        display: flex;
        justify-content: center;
        align-items: center;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-landing-page": HaLandingPage;
  }
}
