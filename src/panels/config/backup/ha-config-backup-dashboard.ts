import "@material/mwc-list/mwc-list";
import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-button";
import "../../../components/ha-card";
import "../../../components/ha-icon";
import "../../../components/ha-icon-next";
import "../../../components/ha-list-item";
import "../../../layouts/hass-subpage";

import { navigate } from "../../../common/navigate";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../types";

@customElement("ha-config-backup-dashboard")
class HaConfigBackupDashboard extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  protected render(): TemplateResult {
    return html`
      <hass-subpage
        back-path="/config/system"
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize("ui.panel.config.backup.caption")}
      >
        <div class="header">
          <ha-card outlined>
            <div class="summary">
              <div class="summary-icon success">
                <ha-icon icon="mdi:check"></ha-icon>
              </div>
              <div class="summary-content">
                <p class="summary-title">Automatically backed up</p>
                <p class="summary-description">
                  Your configuration has been backed up.
                </p>
              </div>
              <div class="summary-action">
                <ha-button @click=${this._configureAutomaticBackup}
                  >Configure</ha-button
                >
              </div>
            </div>
          </ha-card>
          <ha-card outlined>
            <div class="summary">
              <div class="summary-icon success">
                <ha-icon icon="mdi:check"></ha-icon>
              </div>
              <div class="summary-content">
                <p class="summary-title">3 automatic backup locations</p>
                <p class="summary-description">One is off-site</p>
              </div>
              <div class="summary-action">
                <ha-button @click=${this._configureBackupLocations}
                  >Configure</ha-button
                >
              </div>
            </div>
          </ha-card>
        </div>
      </hass-subpage>
    `;
  }

  private _configureAutomaticBackup() {
    navigate("/config/backup/automatic_config");
  }

  private _configureBackupLocations() {
    navigate("/config/backup/locations");
  }

  static styles = css`
    .header {
      padding: 24px 16px;
      display: flex;
      flex-direction: row;
      gap: 16px;
    }
    @media (max-width: 1000px) {
      .header {
        flex-direction: column;
      }
    }
    .header > * {
      flex: 1;
      min-width: 0;
    }
    .summary {
      display: flex;
      flex-direction: row;
      gap: 16px;
      align-items: center;
      padding: 20px;
      width: 100%;
      box-sizing: border-box;
    }
    .summary-icon {
      position: relative;
      border-radius: 20px;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .summary-icon.success {
      --icon-color: var(--success-color);
    }
    .summary-icon.warning {
      --icon-color: var(--warning-color);
    }
    .summary-icon.error {
      --icon-color: var(--error-color);
    }
    .summary-icon::before {
      display: block;
      content: "";
      position: absolute;
      inset: 0;
      background-color: var(--icon-color, var(--primary-color));
      opacity: 0.2;
    }
    .summary-icon ha-icon {
      color: var(--icon-color, var(--primary-color));
      width: 24px;
      height: 24px;
    }
    .summary-content {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
    }
    .summary-title {
      font-size: 22px;
      font-style: normal;
      font-weight: 400;
      line-height: 28px;
      color: var(--primary-text-color);
      margin: 0;
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
    }
    .summary-description {
      font-size: 14px;
      font-style: normal;
      font-weight: 400;
      line-height: 20px;
      letter-spacing: 0.25px;
      color: var(--secondary-text-color);
      margin: 0;
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-backup-dashboard": HaConfigBackupDashboard;
  }
}
