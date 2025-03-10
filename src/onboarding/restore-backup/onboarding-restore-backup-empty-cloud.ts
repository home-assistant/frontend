import { LitElement, html, css, type CSSResultGroup } from "lit";
import { customElement, property } from "lit/decorators";
import type { LocalizeFunc } from "../../common/translations/localize";
import "../../components/ha-button";
import "../../components/ha-icon-button-arrow-prev";
import { fireEvent } from "../../common/dom/fire_event";
import { navigate } from "../../common/navigate";
import { removeSearchParam } from "../../common/url/search-params";
import { onBoardingStyles } from "../styles";

@customElement("onboarding-restore-backup-empty-cloud")
class OnboardingRestoreBackupEmptyCloud extends LitElement {
  @property({ attribute: false }) public localize!: LocalizeFunc;

  render() {
    return html`
      <ha-icon-button-arrow-prev
        .label=${this.localize("ui.panel.page-onboarding.restore.back")}
        @click=${this._back}
      ></ha-icon-button-arrow-prev>
      <h1>
        ${this.localize(
          "ui.panel.page-onboarding.restore.ha-cloud.no_cloud_backup"
        )}
      </h1>
      <div class="description">
        ${this.localize(
          "ui.panel.page-onboarding.restore.ha-cloud.no_cloud_backup_description"
        )}
      </div>
      <div class="actions">
        <ha-button @click=${this._signOut}>
          ${this.localize("ui.panel.page-onboarding.restore.ha-cloud.sign_out")}
        </ha-button>
        <a
          href="https://www.nabucasa.com/config/backups/"
          target="_blank"
          rel="noreferrer noopener"
        >
          <ha-button @click=${this._signOut}>
            ${this.localize(
              "ui.panel.page-onboarding.restore.ha-cloud.learn_more"
            )}
          </ha-button>
        </a>
      </div>
    `;
  }

  private _back() {
    navigate(`${location.pathname}?${removeSearchParam("page")}`);
  }

  private _signOut() {
    fireEvent(this, "sign-out");
  }

  static get styles(): CSSResultGroup {
    return [
      onBoardingStyles,
      css`
        .description {
          font-size: 1rem;
          line-height: 1.5rem;
          margin-top: 24px;
          margin-bottom: 32px;
        }
        .actions {
          display: flex;
          justify-content: space-between;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "onboarding-restore-backup-empty-cloud": OnboardingRestoreBackupEmptyCloud;
  }
  interface HASSDomEvents {
    "sign-out": undefined;
  }
}
