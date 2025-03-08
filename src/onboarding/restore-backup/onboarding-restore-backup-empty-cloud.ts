import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators";
import type { LocalizeFunc } from "../../common/translations/localize";
import { brandsUrl } from "../../util/brands-url";
import "../../components/ha-button";
import "../../components/ha-alert";
import { fireEvent } from "../../common/dom/fire_event";

@customElement("onboarding-restore-backup-empty-cloud")
class OnboardingRestoreBackupEmptyCloud extends LitElement {
  @property({ attribute: false }) public localize!: LocalizeFunc;

  render() {
    return html`
      <h2>
        <img
          .src=${brandsUrl({
            domain: "cloud",
            type: "icon",
            useFallback: true,
            darkOptimized: matchMedia("(prefers-color-scheme: dark)").matches,
          })}
          crossorigin="anonymous"
          referrerpolicy="no-referrer"
          alt="Nabu Casa logo"
          slot="start"
        />
        ${this.localize("ui.panel.page-onboarding.restore.ha-cloud.title")}
      </h2>
      <ha-alert type="warning">
        ${this.localize(
          "ui.panel.page-onboarding.restore.ha-cloud.no_cloud_backup"
        )}
      </ha-alert>
      <div class="buttons">
        <ha-button @click=${this._handleUploadBackup}>
          ${this.localize("ui.panel.page-onboarding.restore.upload_backup")}
        </ha-button>
        <ha-button destructive @click=${this._signOut}>
          ${this.localize("ui.panel.page-onboarding.restore.ha-cloud.sign_out")}
        </ha-button>
      </div>
    `;
  }

  private _handleUploadBackup() {
    fireEvent(this, "upload-option-selected", "upload");
  }

  private _signOut() {
    fireEvent(this, "sign-out");
  }

  static styles = css`
    h2 {
      font-size: 24px;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    h2 img {
      width: 48px;
    }
    .buttons {
      margin-top: 16px;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "onboarding-restore-backup-empty-cloud": OnboardingRestoreBackupEmptyCloud;
  }
  interface HASSDomEvents {
    "sign-out": undefined;
  }
}
