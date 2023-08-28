import { mdiAccountGroup, mdiFileDocument, mdiTabletCellphone } from "@mdi/js";
import { CSSResultGroup, LitElement, TemplateResult, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import type { LocalizeFunc } from "../common/translations/localize";
import "../components/ha-card";
import type { HomeAssistant } from "../types";
import { showCommunityDialog } from "./dialogs/show-community-dialog";
import { showAppDialog } from "./dialogs/show-app-dialog";

@customElement("onboarding-welcome-links")
class OnboardingWelcomeLinks extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public localize!: LocalizeFunc;

  protected render(): TemplateResult {
    return html`<a
        target="_blank"
        rel="noreferrer noopener"
        href="https://www.home-assistant.io/blog/2016/01/19/perfect-home-automation/"
      >
        <ha-card>
          <div class="card-content">
            <ha-svg-icon .path=${mdiFileDocument}></ha-svg-icon>
            ${this.localize("ui.panel.page-onboarding.welcome.vision")}
          </div>
        </ha-card>
      </a>
      <ha-card class="community" @click=${this._openCommunity}>
        <div class="card-content">
          <ha-svg-icon .path=${mdiAccountGroup}></ha-svg-icon>
          ${this.localize("ui.panel.page-onboarding.welcome.community")}
        </div>
      </ha-card>
      <ha-card class="app" @click=${this._openApp}>
        <div class="card-content">
          <ha-svg-icon .path=${mdiTabletCellphone}></ha-svg-icon>
          ${this.localize("ui.panel.page-onboarding.welcome.download_app")}
        </div>
      </ha-card>`;
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
      ha-card {
        cursor: pointer;
      }
      .card-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        font-weight: 500;
        padding-bottom: 32px;
      }
      ha-svg-icon {
        color: var(--text-primary-color);
        background: var(--primary-color);
        border-radius: 50%;
        padding: 8px;
        margin: 16px 0;
      }
      .community ha-svg-icon {
        background: #008142;
      }
      .app ha-svg-icon {
        background: #6e41ab;
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
