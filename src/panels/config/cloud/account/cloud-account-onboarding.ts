import {
  mdiBackupRestore,
  mdiCheckCircle,
  mdiEarth,
  mdiMicrophoneMessage,
  mdiVideo,
} from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import type { TemplateResult } from "lit";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-card";
import "../../../../components/ha-svg-icon";
import type { BackupConfig } from "../../../../data/backup";
import type {
  CloudOnboardingItem,
  CloudStatusLoggedIn,
} from "../../../../data/cloud";
import { postponeCloudOnboarding } from "../../../../data/cloud";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { showToast } from "../../../../util/toast";
import { onboardingPanelCompleted } from "./cloud-account-status";

@customElement("cloud-account-onboarding")
export class CloudAccountOnboarding extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public cloudStatus!: CloudStatusLoggedIn;

  @property({ attribute: false }) public backupConfig?: BackupConfig;

  protected render() {
    return html`
      <ha-card outlined>
        <div class="card-content ready-card">
          <div class="ready-left">
            <h2>
              ${this.hass.localize(
                "ui.panel.config.cloud.account.onboarding.ready_title"
              )}
            </h2>
            <p class="muted">
              ${this.hass.localize(
                "ui.panel.config.cloud.account.onboarding.ready_text"
              )}
            </p>
            <div class="ready-actions">
              <ha-button appearance="filled" @click=${this._startSetup}>
                ${this.hass.localize(
                  "ui.panel.config.cloud.account.onboarding.start_setup"
                )}
              </ha-button>
              <ha-button appearance="plain" @click=${this._onboardingPostpone}>
                ${this.hass.localize(
                  "ui.panel.config.cloud.account.onboarding.review_later"
                )}
              </ha-button>
            </div>
          </div>
          <div class="ready-grid">
            ${this._readyChip(
              mdiEarth,
              this.hass.localize(
                "ui.panel.config.cloud.account.onboarding.chip_remote"
              ),
              "remote"
            )}
            ${this._readyChip(
              mdiBackupRestore,
              this.hass.localize(
                "ui.panel.config.cloud.account.onboarding.chip_backups"
              ),
              "backup"
            )}
            ${this._readyChip(
              mdiMicrophoneMessage,
              this.hass.localize(
                "ui.panel.config.cloud.account.onboarding.chip_voice"
              ),
              "voice"
            )}
            ${this._readyChip(
              mdiVideo,
              this.hass.localize(
                "ui.panel.config.cloud.account.onboarding.chip_streaming"
              ),
              "streaming"
            )}
          </div>
        </div>
      </ha-card>
    `;
  }

  private _readyChip(
    icon: string,
    label: string,
    key: CloudOnboardingItem
  ): TemplateResult {
    return html`
      <div class="ready-chip ${key}">
        <div class="ready-chip-icon">
          <ha-svg-icon .path=${icon}></ha-svg-icon>
          ${
            this._panelCompleted(key)
              ? html`
                  <ha-svg-icon
                    class="chip-badge on"
                    .path=${mdiCheckCircle}
                  ></ha-svg-icon>
                `
              : nothing
          }
        </div>
        <span>${label}</span>
      </div>
    `;
  }

  private _panelCompleted(key: CloudOnboardingItem): boolean {
    return onboardingPanelCompleted(key, this.cloudStatus, this.backupConfig);
  }

  // Delegate opening to the parent (cloud-account), which stays mounted while
  // the dialog is open — so completing the last step can't tear the dialog down
  // and the dialog can refresh the page through a stable element.
  private _startSetup() {
    fireEvent(this, "cloud-open-onboarding");
  }

  private async _onboardingPostpone() {
    try {
      await postponeCloudOnboarding(this.hass);
      fireEvent(this, "ha-refresh-cloud-status");
    } catch (err: any) {
      showToast(this, { message: err.message });
    }
  }

  static get styles() {
    return [
      haStyle,
      css`
        ha-card {
          display: block;
          width: 100%;
          max-width: 600px;
          margin-inline: auto;
          container-type: inline-size;
        }
        .ready-card {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-6);
        }
        .ready-left {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .ready-left h2 {
          font-size: var(--ha-font-size-2xl);
          font-weight: var(--ha-font-weight-normal);
          margin: 0 0 var(--ha-space-2);
          white-space: normal;
          overflow: visible;
          text-overflow: clip;
        }
        .ready-actions {
          display: flex;
          align-items: center;
          gap: var(--ha-space-2);
          margin-top: var(--ha-space-4);
        }
        .ready-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: var(--ha-space-4);
        }
        @container (max-width: 450px) {
          .ready-grid {
            grid-template-columns: 1fr;
          }
        }
        .ready-chip {
          display: flex;
          align-items: center;
          gap: var(--ha-space-3);
        }
        .ready-chip-icon {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .chip-badge {
          position: absolute;
          right: -2px;
          bottom: -2px;
          --mdc-icon-size: 16px;
          border-radius: 50%;
          background-color: var(--card-background-color);
        }
        .chip-badge.on {
          color: var(--success-color);
        }
        .ready-chip.remote .ready-chip-icon {
          color: var(--blue-color);
          background-color: color-mix(
            in srgb,
            var(--blue-color) 15%,
            transparent
          );
        }
        .ready-chip.backup .ready-chip-icon {
          color: var(--green-color);
          background-color: color-mix(
            in srgb,
            var(--green-color) 15%,
            transparent
          );
        }
        .ready-chip.voice .ready-chip-icon {
          color: var(--purple-color);
          background-color: color-mix(
            in srgb,
            var(--purple-color) 15%,
            transparent
          );
        }
        .ready-chip.streaming .ready-chip-icon {
          color: var(--cyan-color);
          background-color: color-mix(
            in srgb,
            var(--cyan-color) 15%,
            transparent
          );
        }
        .muted {
          color: var(--secondary-text-color);
        }
        p.muted {
          margin: var(--ha-space-2) 0 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-account-onboarding": CloudAccountOnboarding;
  }
  interface HASSDomEvents {
    "cloud-open-onboarding": undefined;
  }
}
