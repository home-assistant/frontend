import { css, html, LitElement, type CSSResultGroup } from "lit";
import { customElement, property } from "lit/decorators";
import "../../components/ha-card";
import "../../components/ha-alert";
import "../../components/ha-button";
import "../../panels/config/backup/components/ha-backup-details-restore";
import "../../panels/config/backup/components/ha-backup-details-summary";
import { haStyle } from "../../resources/styles";
import type { LocalizeFunc } from "../../common/translations/localize";
import type { BackupContentExtended } from "../../data/backup";

@customElement("onboarding-restore-backup-details")
class OnboardingRestoreBackupDetails extends LitElement {
  @property({ attribute: false }) public localize!: LocalizeFunc;

  @property({ attribute: false }) public backup!: BackupContentExtended;

  render() {
    return html`
      ${this.backup.homeassistant_included
        ? html`<ha-backup-details-restore
            .backup=${this.backup}
            .localize=${this.localize}
            translation-key-panel="page-onboarding.restore"
            ha-required
          ></ha-backup-details-restore>`
        : html`
            <ha-alert alert-type="error">
              ${this.localize(
                "ui.panel.page-onboarding.restore.details.home_assistant_missing"
              )}
            </ha-alert>
          `}
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          padding: 28px 20px 0;
        }
        ha-backup-details-restore {
          display: block;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "onboarding-restore-backup-details": OnboardingRestoreBackupDetails;
  }
}
