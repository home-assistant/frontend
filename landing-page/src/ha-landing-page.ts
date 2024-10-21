import "@material/mwc-linear-progress/mwc-linear-progress";
import "@material/mwc-top-app-bar-fixed";
import { PropertyValues, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import "../../src/components/ha-icon-button";
import "../../src/managers/notification-manager";
import { haStyle } from "../../src/resources/styles";
import "../../src/onboarding/onboarding-welcome";
import "../../src/onboarding/onboarding-welcome-links";
import { litLocalizeLiteMixin } from "../../src/mixins/lit-localize-lite-mixin";
import { HassElement } from "../../src/state/hass-element";
import { extractSearchParam } from "../../src/common/url/search-params";
import { storeState } from "../../src/util/ha-pref-storage";

@customElement("ha-landing-page")
class HaLandingPage extends litLocalizeLiteMixin(HassElement) {
  @property() public translationFragment = "page-onboarding";

  private _mobileApp =
    extractSearchParam("redirect_uri") === "homeassistant://auth-callback";

  render() {
    return html`<mwc-linear-progress indeterminate></mwc-linear-progress>
      <ha-card>
        <div class="card-content">
          <onboarding-welcome
            .localize=${this.localize}
            .language=${this.language}
            supervisor
          ></onboarding-welcome>
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
      </div> `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    if (window.innerWidth > 450) {
      import("../../src/resources/particles");
    }
    import("../../src/components/ha-language-picker");
  }

  private _languageChanged(ev: CustomEvent) {
    const language = ev.detail.value;
    this.language = language;
    if (this.hass) {
      this._updateHass({
        locale: { ...this.hass!.locale, language },
        language,
        selectedLanguage: language,
      });
      storeState(this.hass!);
    } else {
      try {
        localStorage.setItem("selectedLanguage", JSON.stringify(language));
      } catch (err: any) {
        // Ignore
      }
    }
  }

  static styles = [
    haStyle,
    css`
      mwc-linear-progress {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        z-index: 10;
      }
      .footer {
        padding-top: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
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
