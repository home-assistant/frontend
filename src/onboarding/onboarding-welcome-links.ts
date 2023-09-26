import { mdiAccountGroup, mdiFileDocument, mdiTabletCellphone } from "@mdi/js";
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
import "../components/ha-card";
import type { HomeAssistant } from "../types";
import { showAppDialog } from "./dialogs/show-app-dialog";
import { showCommunityDialog } from "./dialogs/show-community-dialog";
import "./onboarding-welcome-link";

@customElement("onboarding-welcome-links")
class OnboardingWelcomeLinks extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public localize!: LocalizeFunc;

  @property({ type: Boolean }) public mobileApp!: boolean;

  protected render(): TemplateResult {
    return html`<a
        target="_blank"
        rel="noreferrer noopener"
        href="https://www.home-assistant.io/blog/2016/01/19/perfect-home-automation/"
      >
        <onboarding-welcome-link
          noninteractive
          .iconPath=${mdiFileDocument}
          .label=${this.localize("ui.panel.page-onboarding.welcome.vision")}
        >
        </onboarding-welcome-link>
      </a>
      <onboarding-welcome-link
        class="community"
        @click=${this._openCommunity}
        .iconPath=${mdiAccountGroup}
        .label=${this.localize("ui.panel.page-onboarding.welcome.community")}
      >
      </onboarding-welcome-link>
      ${this.mobileApp
        ? nothing
        : html`<onboarding-welcome-link
            class="app"
            @click=${this._openApp}
            .iconPath=${mdiTabletCellphone}
            .label=${this.localize(
              "ui.panel.page-onboarding.welcome.download_app"
            )}
          >
          </onboarding-welcome-link>`}`;
  }

  private _openCommunity(): void {
    showCommunityDialog(this, { localize: this.localize });
  }

  private _openApp(): void {
    showAppDialog(this, { localize: this.localize });
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        margin-top: 16px;
        column-gap: 16px;
        row-gap: 16px;
      }
      @media (max-width: 550px) {
        :host {
          grid-template-columns: 1fr;
        }
      }
      .community {
        --welcome-link-color: #008142;
      }
      .app {
        --welcome-link-color: #6e41ab;
      }
      a {
        text-decoration: none;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "onboarding-welcome-links": OnboardingWelcomeLinks;
  }
}
