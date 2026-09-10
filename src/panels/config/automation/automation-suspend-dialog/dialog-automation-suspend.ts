import { addDays, addHours, addWeeks } from "date-fns";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { formatDateNumeric } from "../../../../common/datetime/format_date";
import { formatTime24h } from "../../../../common/datetime/format_time";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/chips/ha-assist-chip";
import "../../../../components/chips/ha-chip-set";
import "../../../../components/ha-button";
import "../../../../components/ha-date-input";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-time-input";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type { AutomationSuspendDialogParams } from "./show-dialog-automation-suspend";

@customElement("ha-dialog-automation-suspend")
class DialogAutomationSuspend extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _open = false;

  @state() private _params?: AutomationSuspendDialogParams;

  @state() private _date = "";

  @state() private _time = "";

  @state() private _saving = false;

  public showDialog(params: AutomationSuspendDialogParams): void {
    this._params = params;
    this._open = true;
    this._saving = false;

    let initialDate = new Date();
    if (params.suspendedUntil) {
      const parsed = new Date(params.suspendedUntil);
      if (!isNaN(parsed.getTime())) {
        initialDate = parsed;
      }
    } else {
      // Default to +1 hour
      initialDate = addHours(initialDate, 1);
    }

    this._setDateAndTime(initialDate);
  }

  public closeDialog(): boolean {
    this._open = false;
    return true;
  }

  private _dialogClosed(): void {
    this._open = false;
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _setDateAndTime(dateObj: Date): void {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    this._date = `${year}-${month}-${day}`;

    const hours = String(dateObj.getHours()).padStart(2, "0");
    const minutes = String(dateObj.getMinutes()).padStart(2, "0");
    const seconds = String(dateObj.getSeconds()).padStart(2, "0");
    this._time = `${hours}:${minutes}:${seconds}`;
  }

  private _applyPreset(amount: "1h" | "1d" | "1w"): void {
    const now = new Date();
    let target: Date;
    switch (amount) {
      case "1h":
        target = addHours(now, 1);
        break;
      case "1d":
        target = addDays(now, 1);
        break;
      case "1w":
        target = addWeeks(now, 1);
        break;
    }
    this._setDateAndTime(target);
  }

  private _dateChanged(ev: CustomEvent): void {
    this._date = ev.detail.value;
  }

  private _timeChanged(ev: CustomEvent): void {
    this._time = ev.detail.value;
  }

  private async _save(): Promise<void> {
    if (!this._params || !this._date || !this._time) {
      return;
    }

    this._saving = true;
    try {
      const untilDate = new Date(`${this._date}T${this._time}`);
      await this.hass.callService("automation", "suspend", {
        entity_id: this._params.entityId,
        until: untilDate.toISOString(),
      });
      this.closeDialog();
    } catch (err: any) {
      this._saving = false;
    }
  }

  private async _removeSuspend(): Promise<void> {
    if (!this._params) {
      return;
    }

    this._saving = true;
    try {
      await this.hass.callService("automation", "suspend", {
        entity_id: this._params.entityId,
      });
      this.closeDialog();
    } catch (err: any) {
      this._saving = false;
    }
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const isCurrentlySuspended = Boolean(this._params.suspendedUntil);

    return html`
      <ha-dialog
        .open=${this._open}
        @closed=${this._dialogClosed}
        .headerTitle=${this.hass.localize(
          "ui.panel.config.automation.editor.suspend_dialog.title"
        )}
      >
        <div class="content">
          <p class="description">
            ${this.hass.localize(
              "ui.panel.config.automation.editor.suspend_dialog.description",
              { name: this._params.name || this._params.entityId }
            )}
          </p>

          <ha-chip-set>
            <ha-assist-chip
              .label="+1 hour"
              @click=${() => this._applyPreset("1h")}
            >
              ${this.hass.localize(
                "ui.panel.config.automation.editor.suspend_dialog.presets.one_hour"
              )}
            </ha-assist-chip>
            <ha-assist-chip
              .label="+1 day"
              @click=${() => this._applyPreset("1d")}
            >
              ${this.hass.localize(
                "ui.panel.config.automation.editor.suspend_dialog.presets.one_day"
              )}
            </ha-assist-chip>
            <ha-assist-chip
              .label="+1 week"
              @click=${() => this._applyPreset("1w")}
            >
              ${this.hass.localize(
                "ui.panel.config.automation.editor.suspend_dialog.presets.one_week"
              )}
            </ha-assist-chip>
          </ha-chip-set>

          <div class="date-time-container">
            <ha-date-input
              .label=${this.hass.localize(
                "ui.panel.config.automation.editor.suspend_dialog.end_date"
              )}
              .locale=${this.hass.locale}
              .value=${this._date}
              @value-changed=${this._dateChanged}
            ></ha-date-input>
            <ha-time-input
              .label=${this.hass.localize(
                "ui.panel.config.automation.editor.suspend_dialog.end_time"
              )}
              .locale=${this.hass.locale}
              .value=${this._time}
              @value-changed=${this._timeChanged}
            ></ha-time-input>
          </div>
        </div>

        <ha-dialog-footer slot="footer">
          ${isCurrentlySuspended
            ? html`
                <ha-button
                  slot="secondaryAction"
                  variant="danger"
                  .disabled=${this._saving}
                  @click=${this._removeSuspend}
                >
                  ${this.hass.localize(
                    "ui.panel.config.automation.editor.suspend_dialog.remove_suspend"
                  )}
                </ha-button>
              `
            : html`
                <ha-button
                  slot="secondaryAction"
                  appearance="plain"
                  @click=${this.closeDialog}
                >
                  ${this.hass.localize("ui.common.cancel")}
                </ha-button>
              `}
          <ha-button
            slot="primaryAction"
            .loading=${this._saving}
            .disabled=${this._saving || !this._date || !this._time}
            @click=${this._save}
          >
            ${this.hass.localize("ui.common.save")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        .content {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .description {
          margin: 0;
          color: var(--secondary-text-color);
        }
        .date-time-container {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }
        ha-date-input,
        ha-time-input {
          flex: 1;
          min-width: 150px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-automation-suspend": DialogAutomationSuspend;
  }
}
