import { css, html, LitElement, nothing, type CSSResultGroup } from "lit";
import { customElement, property, state, query } from "lit/decorators";
import "../../components/ha-button";
import "../../components/ha-card";
import "../../components/ha-alert";
import "../../components/buttons/ha-progress-button";
import "../../components/ha-icon-button-arrow-prev";
import "../../components/ha-password-field";
import "../../panels/config/backup/components/ha-backup-details-summary";
import "../../panels/config/backup/components/ha-backup-data-picker";
import type { LocalizeFunc } from "../../common/translations/localize";
import type { BackupContentExtended, BackupData } from "../../data/backup";
import { restoreOnboardingBackup } from "../../data/backup_onboarding";
import type { HaProgressButton } from "../../components/buttons/ha-progress-button";
import { fireEvent } from "../../common/dom/fire_event";
import { onBoardingStyles } from "../styles";

@customElement("onboarding-restore-backup-restore")
class OnboardingRestoreBackupRestore extends LitElement {
  @property({ attribute: false }) public localize!: LocalizeFunc;

  @property({ attribute: false }) public backup!: BackupContentExtended;

  @property({ type: Boolean }) public supervisor = false;

  @property() public error?: string;

  @property() public mode!: "upload" | "cloud";

  @state() private _encryptionKey = "";

  @state() private _encryptionKeyWrong = false;

  @state() private _error?: string;

  @state() private _loading = false;

  @state() private _selectedData?: BackupData;

  @query("ha-progress-button")
  private _progressButtonElement!: HaProgressButton;

  render() {
    const agentId = Object.keys(this.backup.agents)[0];
    const backupProtected = this.backup.agents[agentId].protected;

    return html`
      <ha-icon-button-arrow-prev
        .label=${this.localize("ui.panel.page-onboarding.restore.back")}
        @click=${this._back}
      ></ha-icon-button-arrow-prev>
      <h1>
        ${this.localize(
          "ui.panel.page-onboarding.restore.details.restore.title"
        )}
      </h1>

      ${this.backup.homeassistant_included
        ? html`<div class="description">
            ${this.localize(
              "ui.panel.page-onboarding.restore.confirm_restore_full_backup_text"
            )}
          </div>`
        : html`
            <ha-alert alert-type="error">
              ${this.localize(
                "ui.panel.page-onboarding.restore.details.home_assistant_missing"
              )}
            </ha-alert>
          `}
      ${this.error
        ? html`<ha-alert
            alert-type="error"
            .title=${this.localize("ui.panel.page-onboarding.restore.failed")}
          >
            ${this.error}
          </ha-alert>`
        : nothing}

      <ha-backup-details-summary
        card-less
        translation-key-panel="page-onboarding.restore"
        .backup=${this.backup}
        .localize=${this.localize}
        .isHassio=${this.supervisor}
      ></ha-backup-details-summary>

      <h2>${this.localize("ui.panel.page-onboarding.restore.select_type")}</h2>

      ${this.backup.homeassistant_included &&
      !this.supervisor &&
      (this.backup.addons.length > 0 || this.backup.folders.length > 0)
        ? html`<ha-alert class="supervisor-warning">
            ${this.localize(
              "ui.panel.page-onboarding.restore.details.addons_unsupported"
            )}
            <a
              slot="action"
              href="https://www.home-assistant.io/installation/#advanced-installation-methods"
              target="_blank"
              rel="noreferrer noopener"
            >
              <ha-button
                >${this.localize(
                  "ui.panel.page-onboarding.restore.ha-cloud.learn_more"
                )}</ha-button
              >
            </a>
          </ha-alert>`
        : nothing}

      <ha-backup-data-picker
        translation-key-panel="page-onboarding.restore"
        .localize=${this.localize}
        .data=${this.backup}
        .value=${this._selectedData}
        @value-changed=${this._selectedBackupChanged}
        .requiredItems=${["config"]}
        .addonsDisabled=${!this.supervisor}
      ></ha-backup-data-picker>

      ${this._error
        ? html`<ha-alert alert-type="error">${this._error}</ha-alert> `
        : nothing}
      ${backupProtected
        ? html`<div class="encryption">
            <h2>
              ${this.localize(
                "ui.panel.page-onboarding.restore.details.restore.encryption.label"
              )}
            </h2>
            <span>
              ${this.localize(
                `ui.panel.page-onboarding.restore.details.restore.encryption.description${this.mode === "cloud" ? "_cloud" : ""}`
              )}
            </span>
            <ha-password-field
              .disabled=${this._loading}
              @input=${this._encryptionKeyChanged}
              .label=${this.localize(
                "ui.panel.page-onboarding.restore.details.restore.encryption.input_label"
              )}
              .value=${this._encryptionKey}
              @keydown=${this._keyDown}
              .errorMessage=${this._encryptionKeyWrong
                ? this.localize(
                    "ui.panel.page-onboarding.restore.details.restore.encryption.incorrect_key"
                  )
                : ""}
              .invalid=${this._encryptionKeyWrong}
            ></ha-password-field>
          </div>`
        : nothing}

      <div class=${`actions${this.mode === "cloud" ? " cloud" : ""}`}>
        ${this.mode === "cloud"
          ? html`<ha-button @click=${this._signOut}>
              ${this.localize(
                "ui.panel.page-onboarding.restore.ha-cloud.sign_out"
              )}
            </ha-button>`
          : nothing}
        <ha-progress-button
          unelevated
          .progress=${this._loading}
          .disabled=${this._loading ||
          (backupProtected && this._encryptionKey === "") ||
          !this.backup.homeassistant_included}
          @click=${this._startRestore}
        >
          ${this.localize(
            "ui.panel.page-onboarding.restore.details.restore.action"
          )}
        </ha-progress-button>
      </div>
    `;
  }

  protected willUpdate() {
    if (!this.hasUpdated) {
      this._selectedData = {
        homeassistant_included: true,
        folders: [],
        addons: [],
        homeassistant_version: this.backup.homeassistant_version,
        database_included: this.backup.database_included,
      };
    }
  }

  private _keyDown(ev: KeyboardEvent) {
    if (ev.key === "Enter" && this._encryptionKey !== "") {
      this._progressButtonElement.click();
    }
  }

  private _signOut() {
    fireEvent(this, "sign-out");
  }

  private _selectedBackupChanged(ev: CustomEvent) {
    ev.stopPropagation();
    this._selectedData = ev.detail.value;
  }

  private _encryptionKeyChanged(ev): void {
    this._encryptionKey = ev.target.value;
  }

  private async _startRestore(ev: CustomEvent): Promise<void> {
    const agentId = Object.keys(this.backup.agents)[0];
    const backupProtected = this.backup.agents[agentId].protected;

    if (
      !this._loading &&
      (!backupProtected || this._encryptionKey !== "") &&
      this.backup.homeassistant_included &&
      this._selectedData
    ) {
      this._loading = true;
      const button = ev.currentTarget as HaProgressButton;
      this._error = undefined;
      this._encryptionKeyWrong = false;

      const backupAgent = Object.keys(this.backup.agents)[0];

      try {
        await restoreOnboardingBackup({
          agent_id: backupAgent,
          backup_id: this.backup.backup_id,
          password: this._encryptionKey || undefined,
          restore_addons: this._selectedData.addons.map((addon) => addon.slug),
          restore_database: this._selectedData.database_included,
          restore_folders: this._selectedData.folders,
        });
        button.actionSuccess();
        fireEvent(this, "restore-started");
      } catch (err: any) {
        if (err.error === "Request error") {
          // core can shutdown before we get a response
          button.actionSuccess();
          fireEvent(this, "restore-started");
          return;
        }

        button.actionError();
        if (err.body?.code === "incorrect_password") {
          this._encryptionKeyWrong = true;
        } else {
          this._error =
            err.body?.message || err.message || "Unknown error occurred";
        }
        this._loading = false;
      }
    }
  }

  private _back() {
    fireEvent(this, "restore-backup-back");
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
          line-height: 1.5rem;
          margin-top: 24px;
          margin-bottom: 16px;
        }
        ha-alert {
          display: block;
          margin-top: 16px;
        }
        h2 {
          font-size: 22px;
          margin-top: 24px;
          margin-bottom: 8px;
          font-style: normal;
          font-weight: 400;
        }
        .supervisor-warning {
          display: block;
          margin-bottom: 16px;
        }
        ha-backup-data-picker {
          display: block;
          margin-bottom: 32px;
        }
        .encryption {
          margin-bottom: 32px;
        }
        .encryption ha-password-field {
          margin-top: 24px;
        }
        .actions {
          display: flex;
          justify-content: flex-end;
        }
        .actions.cloud {
          justify-content: space-between;
        }
        a ha-button {
          --mdc-theme-primary: var(--primary-color);
          white-space: nowrap;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "onboarding-restore-backup-restore": OnboardingRestoreBackupRestore;
  }
  interface HASSDomEvents {
    "restore-started";
    "restore-backup-back";
  }
}
