import "@material/mwc-button/mwc-button";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { showBackupUploadDialog } from "../../hassio/src/dialogs/backup/show-dialog-backup-upload";
import { showHassioBackupDialog } from "../../hassio/src/dialogs/backup/show-dialog-hassio-backup";
import type { LocalizeFunc } from "../common/translations/localize";
import "../components/ha-ansi-to-html";
import "../components/ha-card";
import { fetchInstallationType } from "../data/onboarding";
import "./onboarding-loading";
import { onBoardingStyles } from "./styles";

@customElement("onboarding-restore-backup")
class OnboardingRestoreBackup extends LitElement {
  @property() public localize!: LocalizeFunc;

  @property() public language!: string;

  @state() public _restoring = false;

  protected render(): TemplateResult {
    return this._restoring
      ? html`<h1>
            ${this.localize("ui.panel.page-onboarding.restore.in_progress")}
          </h1>
          <onboarding-loading></onboarding-loading>`
      : html`
          <h1>${this.localize("ui.panel.page-onboarding.restore.header")}</h1>
          <ha-button unelevated @click=${this._uploadBackup}>
            ${this.localize("ui.panel.page-onboarding.restore.upload_backup")}
          </ha-button>
        `;
  }

  private _uploadBackup(): void {
    showBackupUploadDialog(this, {
      showBackup: (slug: string) => this._showBackupDialog(slug),
      onboarding: true,
    });
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    setInterval(() => this._checkRestoreStatus(), 1000);
  }

  private async _checkRestoreStatus(): Promise<void> {
    if (this._restoring) {
      try {
        await fetchInstallationType();
      } catch (err: any) {
        if ((err as Error).message === "unauthorized") {
          window.location.replace("/");
        }
      }
    }
  }

  private _showBackupDialog(slug: string): void {
    showHassioBackupDialog(this, {
      slug,
      onboarding: true,
      localize: this.localize,
      onRestoring: () => {
        this._restoring = true;
      },
    });
  }

  static get styles(): CSSResultGroup {
    return [
      onBoardingStyles,
      css`
        :host {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "onboarding-restore-backup": OnboardingRestoreBackup;
  }
}
