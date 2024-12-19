import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { showHassioBackupDialog } from "../../hassio/src/dialogs/backup/show-dialog-hassio-backup";
import "../../hassio/src/components/hassio-upload-backup";
import type { LocalizeFunc } from "../common/translations/localize";
import "../components/ha-ansi-to-html";
import "../components/ha-card";
import "../components/ha-alert";
import "../components/ha-button";
import { fetchInstallationType } from "../data/onboarding";
import type { HomeAssistant } from "../types";
import "./onboarding-loading";
import { onBoardingStyles } from "./styles";
import { removeSearchParam } from "../common/url/search-params";
import { navigate } from "../common/navigate";

@customElement("onboarding-restore-backup")
class OnboardingRestoreBackup extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public localize!: LocalizeFunc;

  @property() public language!: string;

  @state() private _restoring = false;

  @state() private _error?: string;

  @state() private _backupSlug?: string;

  protected render(): TemplateResult {
    return html`
      ${this._error
        ? html`<h1>
              ${this.localize("ui.panel.page-onboarding.restore.failed")}
            </h1>
            <p>${this._error}</p>`
        : this._restoring
          ? html`<h1>
                ${this.localize("ui.panel.page-onboarding.restore.in_progress")}
              </h1>
              <ha-alert alert-type="info">
                ${this.localize("ui.panel.page-onboarding.restore.in_progress")}
              </ha-alert>
              <onboarding-loading></onboarding-loading>`
          : html` <h1>
                ${this.localize("ui.panel.page-onboarding.restore.header")}
              </h1>
              <hassio-upload-backup
                @backup-uploaded=${this._backupUploaded}
                @backup-cleared=${this._backupCleared}
                .hass=${this.hass}
                .localize=${this.localize}
              ></hassio-upload-backup>`}
      <div class="footer">
        <ha-button @click=${this._back} .disabled=${!!this._restoring}>
          ${this.localize("ui.panel.page-onboarding.back")}
        </ha-button>
        ${!this._error && this._backupSlug
          ? html`<ha-button @click=${this._showBackupDialog}>
              ${this.localize("ui.panel.page-onboarding.restore.restore")}
            </ha-button>`
          : nothing}
        ${this._error
          ? html`<ha-button @click=${this._retry}>
              ${this.localize("ui.panel.page-onboarding.restore.retry")}
            </ha-button>`
          : nothing}
      </div>
    `;
  }

  private _back(): void {
    navigate(`${location.pathname}?${removeSearchParam("page")}`);
  }

  private _retry(): void {
    this._error = undefined;
    this._restoring = false;
    this._backupSlug = undefined;
  }

  private _backupUploaded(ev) {
    const backup = ev.detail.backup;
    this._backupSlug = backup.slug;
    this._showBackupDialog();
  }

  private _backupCleared() {
    this._backupSlug = undefined;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
  }

  private async _checkRestoreStatus(): Promise<void> {
    if (this._restoring) {
      try {
        await fetchInstallationType();
      } catch (err: any) {
        if (
          (err as Error).message === "unauthorized" ||
          (err as Error).message === "not_found"
        ) {
          window.location.replace("/");
        }
      }
    }
  }

  private _scheduleCheckRestoreStatus(): void {
    setTimeout(() => this._checkRestoreStatus(), 1000);
  }

  private _showBackupDialog(): void {
    showHassioBackupDialog(this, {
      slug: this._backupSlug!,
      onboarding: true,
      localize: this.localize,
      onRestoring: () => {
        this._scheduleCheckRestoreStatus();
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
        hassio-upload-backup {
          width: 100%;
        }
        .footer {
          display: flex;
          justify-content: space-between;
          width: 100%;
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
