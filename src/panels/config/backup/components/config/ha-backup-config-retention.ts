import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { clamp } from "../../../../../common/number/clamp";
import "../../../../../components/ha-expansion-panel";
import "../../../../../components/ha-md-list-item";
import "../../../../../components/ha-md-select";
import type { HaMdSelect } from "../../../../../components/ha-md-select";
import "../../../../../components/ha-md-select-option";
import "../../../../../components/ha-md-textfield";
import type { BackupConfig } from "../../../../../data/backup";
import type { HomeAssistant } from "../../../../../types";
import { fireEvent } from "../../../../../common/dom/fire_event";

export type BackupConfigSchedule = Pick<BackupConfig, "schedule" | "retention">;

const MIN_VALUE = 1;
const MAX_VALUE = 50;

export enum RetentionPreset {
  SHARED = "shared",
  COPIES_3 = "copies_3",
  FOREVER = "forever",
  CUSTOM = "custom",
}

export interface RetentionData {
  type: "copies" | "days" | "forever";
  value: number;
}

@customElement("ha-backup-config-retention")
class HaBackupConfigRetention extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public value!: number;

  @property({ attribute: false }) public type!: "copies" | "days" | "forever";

  @property({ attribute: false }) public presetOptions!: RetentionPreset[];

  @property({ attribute: false }) public preset?: RetentionPreset;

  @property() public headline?: string;

  protected render() {
    return html`
      <ha-md-list-item>
        <span slot="headline">
          ${this.headline ??
          this.hass.localize(`ui.panel.config.backup.schedule.retention`)}
        </span>
        <span slot="supporting-text">
          ${this.hass.localize(
            `ui.panel.config.backup.schedule.retention_description`
          )}
        </span>
        <ha-md-select
          slot="end"
          @change=${this._retentionPresetChanged}
          .value=${this.preset ?? ""}
        >
          ${this.presetOptions.map(
            (option) => html`
              <ha-md-select-option .value=${option}>
                <div slot="headline">
                  ${this.hass.localize(
                    `ui.panel.config.backup.schedule.retention_presets.${option}`
                  )}
                </div>
              </ha-md-select-option>
            `
          )}
        </ha-md-select>
      </ha-md-list-item>

      ${this.preset === RetentionPreset.CUSTOM
        ? html`<ha-expansion-panel
            expanded
            .header=${this.hass.localize(
              "ui.panel.config.backup.schedule.custom_retention"
            )}
            outlined
          >
            <ha-md-list-item>
              <span slot="headline">
                ${this.hass.localize(
                  "ui.panel.config.backup.schedule.custom_retention_label"
                )}
              </span>
              <ha-md-textfield
                slot="end"
                @change=${this._retentionValueChanged}
                .value=${this.value.toString()}
                id="value"
                type="number"
                .min=${MIN_VALUE.toString()}
                .max=${MAX_VALUE.toString()}
                step="1"
              >
              </ha-md-textfield>
              <ha-md-select
                slot="end"
                @change=${this._retentionTypeChanged}
                .value=${this.type}
                id="type"
              >
                <ha-md-select-option value="days">
                  <div slot="headline">
                    ${this.hass.localize(
                      "ui.panel.config.backup.schedule.retention_units.days"
                    )}
                  </div>
                </ha-md-select-option>
                <ha-md-select-option value="copies">
                  ${this.hass.localize(
                    "ui.panel.config.backup.schedule.retention_units.copies"
                  )}
                </ha-md-select-option>
              </ha-md-select>
            </ha-md-list-item></ha-expansion-panel
          > `
        : nothing}
    `;
  }

  private _retentionPresetChanged(ev) {
    ev.stopPropagation();
    const target = ev.currentTarget as HaMdSelect;
    const value = target.value as RetentionPreset;

    fireEvent(this, "backup-retention-preset-changed", {
      value,
    });
  }

  private _retentionValueChanged(ev) {
    ev.stopPropagation();
    const target = ev.currentTarget as HaMdSelect;
    const value = parseInt(target.value);
    const clamped = clamp(value, MIN_VALUE, MAX_VALUE);
    target.value = clamped.toString();

    fireEvent(this, "value-changed", {
      value: clamped,
    });
  }

  private _retentionTypeChanged(ev) {
    ev.stopPropagation();
    const target = ev.currentTarget as HaMdSelect;
    const value = target.value as "copies" | "days";

    fireEvent(this, "backup-retention-type-changed", {
      value,
    });
  }

  static styles = css`
    ha-md-list-item {
      --md-item-overflow: visible;
      --md-list-item-leading-space: 0;
      --md-list-item-trailing-space: 0;
    }
    @media all and (max-width: 450px) {
      ha-md-select {
        min-width: 160px;
        width: 160px;
        --md-filled-field-content-space: 0;
      }
    }
    ha-md-textfield#value {
      min-width: 70px;
    }
    ha-md-select#type {
      min-width: 100px;
    }
    @media all and (max-width: 450px) {
      ha-md-textfield#value {
        min-width: 60px;
        margin: 0 -8px;
      }
      ha-md-select#type {
        min-width: 120px;
        width: 120px;
      }
    }
    ha-expansion-panel {
      --expansion-panel-summary-padding: 0 16px;
      --expansion-panel-content-padding: 0 16px;
      margin-bottom: 16px;
    }
    ha-md-list-item.days {
      --md-item-align-items: flex-start;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-backup-config-retention": HaBackupConfigRetention;
  }

  interface HASSDomEvents {
    "backup-retention-preset-changed": {
      value: RetentionPreset;
    };
    "backup-retention-type-changed": {
      value: "copies" | "days" | "forever";
    };
  }
}
