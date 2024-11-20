import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-card";
import "../../../components/ha-settings-row";
import "../../../components/ha-switch";
import "../../../components/ha-select";
import "../../../components/ha-button";
import "../../../components/ha-list-item";
import "../../../layouts/hass-subpage";
import type { HomeAssistant } from "../../../types";

@customElement("ha-config-backup-default-config")
class HaConfigBackupDefaultConfig extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  protected render(): TemplateResult {
    return html`
      <hass-subpage
        back-path="/config/backup"
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${"Default backup"}
      >
        <div class="content">
          <ha-card>
            <div class="card-header">Automation</div>
            <div class="card-content">
              <ha-settings-row>
                <span slot="heading">Schedule</span>
                <span slot="description">
                  How often you want to create a backup.
                </span>
                <ha-select naturalMenuWidth>
                  <ha-list-item>Daily at 02:00</ha-list-item>
                </ha-select>
              </ha-settings-row>
              <ha-settings-row>
                <span slot="heading">Maximum copies</span>
                <span slot="description">
                  The number of backups that are saved
                </span>
                <ha-select naturalMenuWidth>
                  <ha-list-item>Latest 3 copies</ha-list-item>
                </ha-select>
              </ha-settings-row>
              <ha-settings-row>
                <span slot="heading">Default locations</span>
                <span slot="description">
                  What locations you want to automatically backup to.
                </span>
                <ha-button>Configure</ha-button>
              </ha-settings-row>
              <ha-settings-row>
                <span slot="heading">Password</span>
                <span slot="description">
                  Automatic backups are protected with this password
                </span>
                <ha-switch></ha-switch>
              </ha-settings-row>
              <ha-settings-row>
                <span slot="heading">Custom backup name</span>
                <span slot="description">
                  By default it will use the date and description (2024-07-05
                  Automatic backup).
                </span>
                <ha-switch></ha-switch>
              </ha-settings-row>
            </div>
          </ha-card>
          <ha-card>
            <div class="card-header">Backup data</div>
            <div class="card-content">
              <ha-settings-row>
                <span slot="heading">
                  Home Assistant settings is always included
                </span>
                <span slot="description">
                  With these settings you are able to restore your system.
                </span>
                <ha-button>Learn more</ha-button>
              </ha-settings-row>
              <ha-settings-row>
                <span slot="heading">History</span>
                <span slot="description">
                  For example of your energy dashboard.
                </span>
                <ha-switch></ha-switch>
              </ha-settings-row>
              <ha-settings-row>
                <span slot="heading">Media</span>
                <span slot="description">For example camera recordings.</span>
                <ha-switch></ha-switch>
              </ha-settings-row>
              <ha-settings-row>
                <span slot="heading">Add-ons</span>
                <span slot="description">
                  Select what add-ons you want to backup.
                </span>
                <ha-select naturalMenuWidth>
                  <ha-list-item>All, including new (4)</ha-list-item>
                </ha-select>
              </ha-settings-row>
            </div>
          </ha-card>
        </div>
      </hass-subpage>
    `;
  }

  static styles = css`
    .content {
      padding: 28px 20px 0;
      max-width: 690px;
      margin: 0 auto;
      gap: 24px;
      display: flex;
      flex-direction: column;
    }
    .card-content {
      padding: 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-backup-default-config": HaConfigBackupDefaultConfig;
  }
}
