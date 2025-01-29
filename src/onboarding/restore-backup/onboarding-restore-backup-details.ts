import { css, html, LitElement, nothing, type CSSResultGroup } from "lit";
import { customElement, property } from "lit/decorators";
import "../../components/ha-card";
import "../../components/ha-circular-progress";
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

  @property({ type: Object }) public backup!: BackupContentExtended;

  @property({ type: Boolean }) public supervisor = false;

  render() {
    return html`
      ${this.backup.homeassistant_included &&
      !this.supervisor &&
      this.backup.addons.length > 0
        ? html`
            <ha-alert alert-type="warning">
              ${this.localize(
                "ui.panel.page-onboarding.restore.details.addons_unsupported"
              )}
            </ha-alert>
          `
        : nothing}
      ${this.backup.homeassistant_included
        ? html`<ha-backup-details-restore
            .backup=${this.backup}
            .localize=${this.localize}
            translation-key-panel="page-onboarding.restore"
            ?restore-disabled=${!this.backup.homeassistant_included}
            ?addons-disabled=${!this.supervisor}
            ha-required
          ></ha-backup-details-restore>`
        : html`
            <ha-alert alert-type="warning">
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
        .card-header {
          padding-bottom: 8px;
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
