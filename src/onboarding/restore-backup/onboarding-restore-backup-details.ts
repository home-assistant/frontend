import { css, html, LitElement, type CSSResultGroup } from "lit";
import { customElement, property } from "lit/decorators";
import "../../components/ha-card";
import "../../components/ha-circular-progress";
import "../../panels/config/backup/components/ha-backup-details";
import { haStyle } from "../../resources/styles";
import type { LocalizeFunc } from "../../common/translations/localize";
import type { BackupContentExtended } from "../../data/backup";

@customElement("onboarding-restore-backup-details")
class OnboardingRestoreBackupDetails extends LitElement {
  @property({ attribute: false }) public localize!: LocalizeFunc;

  @property({ type: Object }) public backup!: BackupContentExtended;

  render() {
    return html`
      <ha-backup-details
        .backup=${this.backup}
        .localize=${this.localize}
      ></ha-backup-details>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          width: 100%;
        }
        .card-header {
          padding-bottom: 8px;
        }
        .card-content {
        }
        .card-actions {
          display: flex;
          justify-content: flex-end;
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
