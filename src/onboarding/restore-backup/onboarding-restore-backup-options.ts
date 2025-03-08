import { mdiUpload } from "@mdi/js";
import { css, html, LitElement, type CSSResultGroup } from "lit";
import { customElement, property } from "lit/decorators";
import "../../components/ha-card";
import "../../components/ha-md-list";
import "../../components/ha-md-list-item";
import "../../components/ha-svg-icon";
import "../../components/ha-icon-button-next";
import "../../panels/config/backup/components/ha-backup-details-summary";
import { haStyle } from "../../resources/styles";
import type { LocalizeFunc } from "../../common/translations/localize";
import type { BackupContentExtended } from "../../data/backup";
import { brandsUrl } from "../../util/brands-url";
import { fireEvent } from "../../common/dom/fire_event";

@customElement("onboarding-restore-backup-options")
class OnboardingRestoreBackupOptions extends LitElement {
  @property({ attribute: false }) public localize!: LocalizeFunc;

  @property({ attribute: false }) public backup!: BackupContentExtended;

  render() {
    return html`
      <h2>
        ${this.localize("ui.panel.page-onboarding.restore.options.title")}
      </h2>
      <ha-md-list>
        <ha-md-list-item type="button" @click=${this._openUpload}>
          <div slot="start" class="icon svg">
            <ha-svg-icon .path=${mdiUpload}></ha-svg-icon>
          </div>
          <div slot="headline">
            ${this.localize("ui.panel.page-onboarding.restore.upload_backup")}
          </div>
          <div slot="supporting-text">
            ${this.localize(
              "ui.panel.page-onboarding.restore.options.upload_description"
            )}
          </div>
          <ha-icon-button-next slot="end"></ha-icon-button-next>
        </ha-md-list-item>
        <ha-md-list-item type="button" @click=${this._openCloud}>
          <div slot="start" class="icon">
            <img
              .src=${brandsUrl({
                domain: "cloud",
                type: "icon",
                useFallback: true,
                darkOptimized: matchMedia("(prefers-color-scheme: dark)")
                  .matches,
              })}
              crossorigin="anonymous"
              referrerpolicy="no-referrer"
              alt="Nabu Casa logo"
              slot="start"
            />
          </div>
          <div slot="headline">
            ${this.localize("ui.panel.page-onboarding.restore.ha-cloud.title")}
          </div>
          <div slot="supporting-text">
            ${this.localize(
              "ui.panel.page-onboarding.restore.ha-cloud.description"
            )}
          </div>
          <ha-icon-button-next slot="end"></ha-icon-button-next>
        </ha-md-list-item>
      </ha-md-list>
    `;
  }

  private _openUpload() {
    fireEvent(this, "upload-option-selected", "upload");
  }

  private _openCloud() {
    fireEvent(this, "upload-option-selected", "cloud");
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          padding: 0 20px 16px;
        }
        h2 {
          font-size: 24px;
        }
        ha-md-list {
          gap: 16px;
        }
        ha-md-list-item {
          border: 1px solid var(--divider-color);
          border-radius: 4px;
        }
        ha-md-list-item:hover {
          border: 1px solid var(--primary-text-color);
        }
        .icon {
          width: 48px;
          height: 48px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .icon.svg {
          background-color: var(--primary-color);
          color: var(--text-primary-color);
          border-radius: 50%;
        }
        .icon img {
          width: 48px;
        }
        ha-icon-button-next {
          color: var(--divider-color);
        }
        ha-md-list-item:hover ha-icon-button-next {
          color: var(--primary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "onboarding-restore-backup-options": OnboardingRestoreBackupOptions;
  }

  interface HASSDomEvents {
    "upload-option-selected": "upload" | "cloud";
  }
}
