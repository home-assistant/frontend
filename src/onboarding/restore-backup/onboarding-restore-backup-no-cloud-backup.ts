import { LitElement, css, html, type CSSResultGroup } from "lit";
import { customElement, state } from "lit/decorators";
import { consumeLocalize } from "../../common/decorators/consume-context-entry";
import { fireEvent } from "../../common/dom/fire_event";
import { navigate } from "../../common/navigate";
import type { LocalizeFunc } from "../../common/translations/localize";
import { removeSearchParam } from "../../common/url/search-params";
import "../../components/ha-button";
import "../../components/ha-icon-button-arrow-prev";
import { onBoardingStyles } from "../styles";

@customElement("onboarding-restore-backup-no-cloud-backup")
class OnboardingRestoreBackupNoCloudBackup extends LitElement {
  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  render() {
    return html`
      <ha-icon-button-arrow-prev
        .label=${this._localize("ui.panel.page-onboarding.restore.back")}
        @click=${this._back}
      ></ha-icon-button-arrow-prev>
      <h1>
        ${this._localize(
          "ui.panel.page-onboarding.restore.ha-cloud.no_cloud_backup"
        )}
      </h1>
      <div class="description">
        ${this._localize(
          "ui.panel.page-onboarding.restore.ha-cloud.no_cloud_backup_description"
        )}
      </div>
      <div class="actions">
        <ha-button @click=${this._signOut}>
          ${this._localize("ui.panel.page-onboarding.restore.ha-cloud.sign_out")}
        </ha-button>
        <ha-button
          href="https://www.nabucasa.com/config/backups/"
          target="_blank"
          rel="noreferrer noopener"
          appearance="plain"
        >
          ${this._localize(
            "ui.panel.page-onboarding.restore.ha-cloud.learn_more"
          )}
        </ha-button>
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
        h1,
        p {
          text-align: left;
        }
        .description {
          font-size: 1rem;
          line-height: var(--ha-line-height-normal);
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
    "onboarding-restore-backup-no-cloud-backup": OnboardingRestoreBackupNoCloudBackup;
  }
  interface HASSDomEvents {
    "sign-out": undefined;
  }
}
