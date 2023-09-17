import "@material/mwc-button/mwc-button";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { showHassioBackupDialog } from "../../hassio/src/dialogs/backup/show-dialog-hassio-backup";
import "../../hassio/src/components/hassio-upload-backup";
import type { LocalizeFunc } from "../common/translations/localize";
import "../components/ha-ansi-to-html";
import "../components/ha-card";
import { fetchInstallationType } from "../data/onboarding";
import { HomeAssistant } from "../types";
import "./onboarding-loading";
import { onBoardingStyles } from "./styles";
import { removeSearchParam } from "../common/url/search-params";
import { navigate } from "../common/navigate";

@customElement("onboarding-restore-backup")
class OnboardingRestoreBackup extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public localize!: LocalizeFunc;

  @property() public language!: string;

  @state() public _restoring = false;

  protected render(): TemplateResult {
    return html`${this._restoring
        ? html`<h1>
              ${this.localize("ui.panel.page-onboarding.restore.in_progress")}
            </h1>
            <onboarding-loading></onboarding-loading>`
        : html` <h1>
              ${this.localize("ui.panel.page-onboarding.restore.header")}
            </h1>
            <hassio-upload-backup
              @backup-uploaded=${this._backupUploaded}
              .hass=${this.hass}
            ></hassio-upload-backup>`}
      <div class="footer">
        <mwc-button @click=${this._back} .disabled=${this._restoring}>
          ${this.localize("ui.panel.page-onboarding.back")}
        </mwc-button>
      </div> `;
  }

  private _back(): void {
    navigate(`${location.pathname}?${removeSearchParam("page")}`);
  }

  private _backupUploaded(ev) {
    const backup = ev.detail.backup;
    this._showBackupDialog(backup.slug);
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
        hassio-upload-backup {
          width: 100%;
        }
        .footer {
          width: 100%;
          text-align: left;
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
