import { css, html, LitElement, nothing } from "lit";
import type { PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { debounce } from "../../../common/util/debounce";
import "../../../components/ha-alert";
import "../../../components/ha-card";
import {
  getSupervisorUpdateConfig,
  updateSupervisorUpdateConfig,
  type SupervisorUpdateConfig,
} from "../../../data/supervisor/update";
import "../../../layouts/hass-subpage";
import type { HomeAssistant } from "../../../types";
import "./components/config/ha-backup-config-addon";

@customElement("ha-config-backup-app-update-backups")
class HaConfigBackupAppUpdateBackups extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @state() private _supervisorUpdateConfig?: SupervisorUpdateConfig;

  @state() private _error?: string;

  protected willUpdate(changedProps: PropertyValues<this>): void {
    super.willUpdate(changedProps);

    if (
      !this.hasUpdated &&
      this.hass &&
      isComponentLoaded(this.hass.config, "hassio")
    ) {
      this._getSupervisorUpdateConfig();
    }
  }

  protected render() {
    return html`
      <hass-subpage
        back-path="/config/backup/overview"
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize(
          "ui.panel.config.backup.app_update_backups.header"
        )}
      >
        <div class="content">
          <ha-card>
            <div class="card-content">
              <p>
                ${this.hass.localize(
                  "ui.panel.config.backup.settings.app_update_backup.description"
                )}
              </p>
              <p>
                ${this.hass.localize(
                  "ui.panel.config.backup.settings.app_update_backup.local_only"
                )}
              </p>
              ${this._error
                ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
                : nothing}
              <ha-backup-config-addon
                .hass=${this.hass}
                .supervisorUpdateConfig=${this._supervisorUpdateConfig}
                @update-config-changed=${this._supervisorUpdateConfigChanged}
              ></ha-backup-config-addon>
            </div>
          </ha-card>
        </div>
      </hass-subpage>
    `;
  }

  private async _getSupervisorUpdateConfig() {
    try {
      this._supervisorUpdateConfig = await getSupervisorUpdateConfig(this.hass);
      this._error = undefined;
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error(err);
      this._error = this.hass.localize(
        "ui.panel.config.backup.settings.app_update_backup.error_load",
        {
          error: err?.message || err,
        }
      );
    }
  }

  private async _supervisorUpdateConfigChanged(ev) {
    const config = ev.detail.value as SupervisorUpdateConfig;
    this._supervisorUpdateConfig = {
      ...this._supervisorUpdateConfig,
      ...config,
    } as SupervisorUpdateConfig;
    this._debounceSaveSupervisorUpdateConfig();
  }

  private _debounceSaveSupervisorUpdateConfig = debounce(
    () => this._saveSupervisorUpdateConfig(),
    500
  );

  private async _saveSupervisorUpdateConfig() {
    if (!this._supervisorUpdateConfig) {
      return;
    }
    try {
      await updateSupervisorUpdateConfig(
        this.hass,
        this._supervisorUpdateConfig
      );
      this._error = undefined;
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error(err);
      this._error = this.hass.localize(
        "ui.panel.config.backup.settings.app_update_backup.error_save",
        {
          error: err?.message || err?.toString(),
        }
      );
    }
  }

  static styles = css`
    p {
      color: var(--secondary-text-color);
    }

    .content {
      padding: 28px 20px 0;
      max-width: 690px;
      margin: 0 auto;
      gap: var(--ha-space-6);
      display: flex;
      flex-direction: column;
      margin-bottom: 24px;
    }

    .card-content {
      padding-bottom: 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-backup-app-update-backups": HaConfigBackupAppUpdateBackups;
  }
}
