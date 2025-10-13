import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { clamp } from "../../../../../common/number/clamp";
import "../../../../../components/ha-expansion-panel";
import "../../../../../components/ha-md-list-item";
import "../../../../../components/ha-md-select";
import type { HaMdSelect } from "../../../../../components/ha-md-select";
import "../../../../../components/ha-md-select-option";
import "../../../../../components/ha-md-textfield";
import type { HaMdTextfield } from "../../../../../components/ha-md-textfield";
import type { BackupConfig, Retention } from "../../../../../data/backup";
import type { HomeAssistant } from "../../../../../types";

export type BackupConfigSchedule = Pick<BackupConfig, "schedule" | "retention">;

const MIN_VALUE = 1;
const MAX_VALUE = 9999; // because of input width

export enum RetentionPreset {
  GLOBAL = "global",
  COPIES_3 = "copies_3",
  FOREVER = "forever",
  CUSTOM = "custom",
}

const PRESET_MAP: Record<
  Exclude<RetentionPreset, RetentionPreset.CUSTOM>,
  Retention | null
> = {
  copies_3: { copies: 3, days: null },
  forever: { copies: null, days: null },
  global: null,
};

export interface RetentionData {
  type: "copies" | "days" | "forever";
  value: number;
}

@customElement("ha-backup-config-retention")
class HaBackupConfigRetention extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public retention?: Retention | null;

  @property() public headline?: string;

  @property({ type: Boolean, attribute: "location-specific" })
  public locationSpecific = false;

  @state() private _preset: RetentionPreset = RetentionPreset.COPIES_3;

  @state() private _type: "copies" | "days" = "copies";

  @state() private _value = 3;

  @query("#value") private _customValueField?: HaMdTextfield;

  @query("#type") private _customTypeField?: HaMdSelect;

  private _configLoaded = false;

  private presetOptions = [
    RetentionPreset.COPIES_3,
    RetentionPreset.FOREVER,
    RetentionPreset.CUSTOM,
  ];

  public willUpdate() {
    if (!this._configLoaded && this.retention !== undefined) {
      this._configLoaded = true;
      if (!this.retention) {
        this._preset = RetentionPreset.GLOBAL;
      } else if (
        this.retention?.days === null &&
        this.retention?.copies === null
      ) {
        this._preset = RetentionPreset.FOREVER;
      } else {
        this._value = this.retention.copies || this.retention.days || 3;
        if (
          this.retention.days ||
          this.locationSpecific ||
          this.retention.copies !== 3
        ) {
          this._preset = RetentionPreset.CUSTOM;
          this._type = this.retention?.copies ? "copies" : "days";
        }
      }

      if (this.locationSpecific) {
        this.presetOptions = [
          RetentionPreset.GLOBAL,
          RetentionPreset.FOREVER,
          RetentionPreset.CUSTOM,
        ];
      }
    }
  }

  protected render() {
    if (!this._configLoaded) {
      return nothing;
    }

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
          .value=${this._preset}
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

      ${this._preset === RetentionPreset.CUSTOM
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
                .value=${this._value.toString()}
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
                .value=${this._type}
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
    let value = target.value as RetentionPreset;

    if (
      value === RetentionPreset.CUSTOM &&
      (this.locationSpecific || this._preset === RetentionPreset.FOREVER)
    ) {
      this._preset = value;
      // custom needs to have a type of days or copies, set it to default copies 3
      value = RetentionPreset.COPIES_3;
    } else {
      this._preset = value;
    }

    if (this.locationSpecific || value !== RetentionPreset.CUSTOM) {
      const retention = PRESET_MAP[value];

      fireEvent(this, "value-changed", {
        value: retention,
      });
    }
  }

  private _retentionValueChanged(ev) {
    ev.stopPropagation();
    const target = ev.currentTarget as HaMdSelect;
    const value = parseInt(target.value);
    const clamped = clamp(value, MIN_VALUE, MAX_VALUE);
    target.value = clamped.toString();

    const type = this._customTypeField?.value;

    fireEvent(this, "value-changed", {
      value: {
        copies: type === "copies" ? clamped : null,
        days: type === "days" ? clamped : null,
      },
    });
  }

  private _retentionTypeChanged(ev) {
    ev.stopPropagation();
    const target = ev.currentTarget as HaMdSelect;
    const type = target.value as "copies" | "days";

    const value = this._customValueField?.value;

    fireEvent(this, "value-changed", {
      value: {
        copies: type === "copies" ? Number(value) : null,
        days: type === "days" ? Number(value) : null,
      },
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
}
