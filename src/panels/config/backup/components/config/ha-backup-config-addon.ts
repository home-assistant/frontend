import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-md-list-item";
import "../../../../../components/ha-md-select";
import type { HaMdSelect } from "../../../../../components/ha-md-select";
import "../../../../../components/ha-md-select-option";
import "../../../../../components/ha-md-textfield";
import type { HaMdTextfield } from "../../../../../components/ha-md-textfield";
import type { SupervisorUpdateConfig } from "../../../../../data/supervisor/update";
import type { HomeAssistant } from "../../../../../types";

const MIN_RETENTION_VALUE = 1;

@customElement("ha-backup-config-addon")
class HaBackupConfigAddon extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public supervisorUpdateConfig?: SupervisorUpdateConfig;

  protected render() {
    return html`
      <ha-md-list>
        <ha-md-list-item>
          <span slot="headline">
            ${this.hass.localize(
              `ui.panel.config.backup.schedule.update_preference.label`
            )}
          </span>
          <span slot="supporting-text">
            ${this.hass.localize(
              `ui.panel.config.backup.schedule.update_preference.supporting_text`
            )}
          </span>
          <ha-md-select
            slot="end"
            @change=${this._updatePreferenceChanged}
            .value=${this.supervisorUpdateConfig?.add_on_backup_before_update?.toString() ||
            "false"}
          >
            <ha-md-select-option value="false">
              <div slot="headline">
                ${this.hass.localize(
                  "ui.panel.config.backup.schedule.update_preference.skip_backups"
                )}
              </div>
            </ha-md-select-option>
            <ha-md-select-option value="true">
              <div slot="headline">
                ${this.hass.localize(
                  "ui.panel.config.backup.schedule.update_preference.backup_before_update"
                )}
              </div>
            </ha-md-select-option>
          </ha-md-select>
        </ha-md-list-item>
        <ha-md-list-item>
          <span slot="headline">
            ${this.hass.localize(`ui.panel.config.backup.schedule.retention`)}
          </span>
          <span slot="supporting-text">
            ${this.hass.localize(
              `ui.panel.config.backup.settings.addon_update_backup.retention_description`
            )}
          </span>
          <ha-md-textfield
            slot="end"
            @change=${this._backupRetentionChanged}
            .value=${this.supervisorUpdateConfig?.add_on_backup_retain_copies?.toString() ||
            "1"}
            type="number"
            min=${MIN_RETENTION_VALUE.toString()}
            step="1"
            .suffixText=${this.hass.localize(
              "ui.panel.config.backup.schedule.retention_units.copies"
            )}
          >
          </ha-md-textfield>
        </ha-md-list-item>
      </ha-md-list>
    `;
  }

  private _updatePreferenceChanged(ev) {
    ev.stopPropagation();
    const target = ev.currentTarget as HaMdSelect;
    const add_on_backup_before_update = target.value === "true";
    fireEvent(this, "update-config-changed", {
      value: {
        add_on_backup_before_update,
      },
    });
  }

  private _backupRetentionChanged(ev) {
    const target = ev.currentTarget as HaMdTextfield;
    const add_on_backup_retain_copies = Number(target.value);
    if (add_on_backup_retain_copies >= MIN_RETENTION_VALUE) {
      fireEvent(this, "update-config-changed", {
        value: {
          add_on_backup_retain_copies,
        },
      });
    }
  }

  static styles = css`
    ha-md-list {
      background: none;
      --md-list-item-leading-space: 0;
      --md-list-item-trailing-space: 0;
    }
    ha-md-list-item {
      --md-item-overflow: visible;
    }
    ha-md-select {
      min-width: 210px;
    }
    ha-md-textfield {
      width: 210px;
    }
    @media all and (max-width: 450px) {
      ha-md-select {
        min-width: 160px;
        width: 160px;
        --md-filled-field-content-space: 0;
      }
      ha-md-textfield {
        width: 160px;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-backup-config-addon": HaBackupConfigAddon;
  }
}
