import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/buttons/ha-progress-button";
import "../../../../../components/entity/ha-entity-picker";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-button";
import "../../../../../components/ha-dialog";
import "../../../../../components/ha-dialog-footer";
import "../../../../../components/input/ha-input";
import {
  addZHAWeeklySchedule,
  updateZHAWeeklySchedule,
} from "../../../../../data/zha";
import type { HassDialog } from "../../../../../dialogs/make-dialog-manager";
import { showMoreInfoDialog } from "../../../../../dialogs/more-info/show-ha-more-info-dialog";
import type { HomeAssistant } from "../../../../../types";
import type { ZHAAddWeeklyScheduleDialogParams } from "./show-dialog-zha-add-weekly-schedule";

const SCHEDULE_DOMAINS = ["schedule"];

@customElement("dialog-zha-add-weekly-schedule")
class DialogZHAAddWeeklySchedule
  extends LitElement
  implements HassDialog<ZHAAddWeeklyScheduleDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: ZHAAddWeeklyScheduleDialogParams;

  @state() private _open = false;

  @state() private _thermostat?: string;

  @state() private _schedule?: string;

  @state() private _blockTemperature = "";

  @state() private _gapTemperature = "";

  @state() private _saving = false;

  @state() private _error?: string;

  public showDialog(params: ZHAAddWeeklyScheduleDialogParams): void {
    const link = params.link;
    const toText = (value: number | null | undefined) =>
      value === null || value === undefined ? "" : String(value);
    this._params = params;
    this._thermostat = link
      ? (link.thermostat_entity_id ?? undefined)
      : params.thermostats.length === 1
        ? params.thermostats[0]
        : undefined;
    this._schedule = link?.schedule_entity_id ?? undefined;
    this._blockTemperature = toText(link?.block_temperature);
    this._gapTemperature = toText(link?.gap_temperature);
    this._error = undefined;
    this._open = true;
  }

  public closeDialog(): boolean {
    if (this._saving) {
      return false;
    }
    this._open = false;
    return true;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this._params) {
      return nothing;
    }
    const prefix = "ui.panel.config.zha.weekly_schedules.add_dialog";
    const link = this._params.link;

    return html`
      <ha-dialog
        .open=${this._open}
        header-title=${this.hass.localize(
          link
            ? "ui.panel.config.zha.weekly_schedules.edit_dialog.title"
            : `${prefix}.title`
        )}
        ?prevent-scrim-close=${this._saving}
        @closed=${this._dialogClosed}
      >
        ${
          this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : nothing
        }
        <p>${this.hass.localize(`${prefix}.description`)}</p>
        <div class="form">
          <ha-entity-picker
            .hass=${this.hass}
            .label=${this.hass.localize(`${prefix}.thermostat`)}
            .value=${this._thermostat}
            .includeEntities=${
              link?.thermostat_entity_id
                ? [link.thermostat_entity_id]
                : this._params.thermostats
            }
            .disabled=${!!link}
            .required=${!link}
            @value-changed=${this._thermostatChanged}
          ></ha-entity-picker>
          <ha-entity-picker
            .hass=${this.hass}
            .label=${this.hass.localize(`${prefix}.schedule`)}
            .value=${this._schedule}
            .includeDomains=${SCHEDULE_DOMAINS}
            .createDomains=${SCHEDULE_DOMAINS}
            required
            @value-changed=${this._scheduleChanged}
          ></ha-entity-picker>
          <div class="schedule-hint">
            ${this.hass.localize(`${prefix}.schedule_helper`)}
            ${
              this._schedule
                ? html`<button class="link" @click=${this._editSchedule}>
                    ${this.hass.localize(`${prefix}.edit_schedule`)}
                  </button>`
                : nothing
            }
          </div>
          <ha-input
            type="number"
            step="0.01"
            .label=${this.hass.localize(`${prefix}.block_temperature`)}
            .hint=${this.hass.localize(`${prefix}.block_temperature_helper`)}
            .value=${this._blockTemperature}
            @input=${this._blockTemperatureChanged}
          ></ha-input>
          <ha-input
            type="number"
            step="0.01"
            .label=${this.hass.localize(`${prefix}.gap_temperature`)}
            .hint=${this.hass.localize(`${prefix}.gap_temperature_helper`)}
            .value=${this._gapTemperature}
            @input=${this._gapTemperatureChanged}
          ></ha-input>
        </div>
        <ha-alert alert-type="info">
          ${this.hass.localize(`${prefix}.overwrite_warning`)}
        </ha-alert>

        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this.closeDialog}
            .disabled=${this._saving}
          >
            ${this.hass.localize("ui.common.cancel")}
          </ha-button>
          <ha-progress-button
            slot="primaryAction"
            .progress=${this._saving}
            .disabled=${
              this._saving || (!link && !this._thermostat) || !this._schedule
            }
            @click=${this._save}
          >
            ${this.hass.localize(link ? "ui.common.save" : `${prefix}.link`)}
          </ha-progress-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _thermostatChanged(ev: CustomEvent<{ value?: string }>): void {
    this._thermostat = ev.detail.value || undefined;
  }

  private _scheduleChanged(ev: CustomEvent<{ value?: string }>): void {
    this._schedule = ev.detail.value || undefined;
  }

  private _editSchedule(): void {
    if (this._schedule) {
      showMoreInfoDialog(this, { entityId: this._schedule, view: "settings" });
    }
  }

  private _blockTemperatureChanged(ev: InputEvent): void {
    this._blockTemperature = (ev.target as HTMLInputElement).value ?? "";
  }

  private _gapTemperatureChanged(ev: InputEvent): void {
    this._gapTemperature = (ev.target as HTMLInputElement).value ?? "";
  }

  private async _save(): Promise<void> {
    const link = this._params?.link;
    if ((!link && !this._thermostat) || !this._schedule) {
      return;
    }
    const toNumber = (value: string) =>
      value.trim() === "" ? null : Number(value);
    this._saving = true;
    this._error = undefined;
    try {
      const temperatures = {
        block_temperature: toNumber(this._blockTemperature),
        gap_temperature: toNumber(this._gapTemperature),
      };
      if (link) {
        await updateZHAWeeklySchedule(this.hass, {
          link_id: link.link_id,
          schedule_entity_id: this._schedule,
          ...temperatures,
        });
      } else {
        await addZHAWeeklySchedule(this.hass, {
          thermostat_entity_id: this._thermostat!,
          schedule_entity_id: this._schedule,
          ...temperatures,
        });
      }
    } catch (err: any) {
      this._error = err.message || String(err);
      return;
    } finally {
      this._saving = false;
    }
    this.closeDialog();
  }

  static styles = css`
    .form {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-4);
      margin-bottom: var(--ha-space-4);
    }
    .schedule-hint {
      margin-top: calc(-1 * var(--ha-space-3));
      padding: 0 var(--ha-space-4);
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s);
      line-height: var(--ha-line-height-normal);
    }
    .link {
      padding: 0;
      border: none;
      background: none;
      font: inherit;
      color: var(--primary-color);
      text-decoration: underline;
      cursor: pointer;
    }
    ha-alert {
      display: block;
      margin-bottom: var(--ha-space-4);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-zha-add-weekly-schedule": DialogZHAAddWeeklySchedule;
  }
}
