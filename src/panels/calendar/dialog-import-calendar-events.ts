import "@material/mwc-button";
import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { property, state } from "lit/decorators";
import { mdiFileUpload } from "@mdi/js";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/entity/state-info";
import "../../components/ha-alert";
import "../../components/ha-date-input";
import { createCloseHeading } from "../../components/ha-dialog";
import "../../components/ha-time-input";
import { haStyleDialog } from "../../resources/styles";
import { showAlertDialog } from "../../dialogs/generic/show-dialog-box";
import { HomeAssistant } from "../../types";
import "../lovelace/components/hui-generic-entity-row";
import { stopPropagation } from "../../common/dom/stop_propagation";
import { ImportCalendarEventsDialogParams } from "./show-dialog-import-calendar-events";
import { uploadCalendarFile } from "../../data/calendar";

class DialogImportCalendarEvents extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: ImportCalendarEventsDialogParams;

  @state() private _calendarFile?: File;

  @state() private _selectedCalendarEntityId: string = "";

  @state() private _uploading = false;

  @state() private _error?: string;

  public async showDialog(
    params: ImportCalendarEventsDialogParams
  ): Promise<void> {
    this._params = params;
  }

  private closeDialog(): void {
    this._params = undefined;
    this._selectedCalendarEntityId = "";
    this._calendarFile = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }
    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        scrimClickAction
        escapeKeyAction
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize("ui.components.calendar.import_events.title")
        )}
      >
        <div class="content">
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : ""}
          <ha-select
            .label=${this.hass.localize(
              "ui.components.calendar.import_events.select_label"
            )}
            @selected=${this._setCalendar}
            @closed=${stopPropagation}
            fixedMenuPosition
            naturalMenuWidth
            .value=${this._selectedCalendarEntityId!}
          >
            ${this._params.calendars.map(
              (item) => html`
                <mwc-list-item .value=${item.entity_id || ""}>
                  ${item.name}
                </mwc-list-item>
              `
            )}
          </ha-select>
          <ha-file-upload
            .hass=${this.hass}
            .uploading=${this._uploading}
            .icon=${mdiFileUpload}
            .label=${this.hass.localize(
              "ui.components.calendar.import_events.label"
            )}
            .supports=${this.hass.localize(
              "ui.components.calendar.import_events.supported_formats"
            )}
            .value=${this._calendarFile}
            accept="text/calendar"
            @file-picked=${this._setCalendarFile}
            @change=${this._handleFileCleared}
          ></ha-file-upload>
        </div>
        <mwc-button
          slot="primaryAction"
          @click=${this._beginFileSubmit}
          .disabled=${this._calendarFile === undefined ||
          this._uploading ||
          !this._selectedCalendarEntityId}
        >
          ${this.hass.localize(
            "ui.components.calendar.import_events.upload_button"
          )}
        </mwc-button>
      </ha-dialog>
    `;
  }

  private _setCalendar(ev): void {
    const entityId = ev.target.value;
    this._selectedCalendarEntityId = entityId;
  }

  private async _setCalendarFile(ev) {
    this._calendarFile = ev.detail.files![0];
  }

  private async _beginFileSubmit() {
    this._uploading = true;

    try {
      const fileId = await uploadCalendarFile(
        this.hass,
        this._selectedCalendarEntityId,
        this._calendarFile!
      );
      fireEvent(this, "value-changed", { value: fileId });
    } catch (err: any) {
      showAlertDialog(this, {
        text: this.hass.localize(
          "ui.components.calendar.import_events.upload_failed",
          {
            reason: err.message || err,
          }
        ),
      });
    } finally {
      this._uploading = false;
      this._calendarFile = undefined;
      this.closeDialog();
    }
  }

  private _handleFileCleared() {
    this._calendarFile = undefined;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        state-info {
          line-height: 40px;
        }
        ha-svg-icon {
          width: 40px;
          margin-right: 8px;
          margin-inline-end: 8px;
          margin-inline-start: initial;
          direction: var(--direction);
          vertical-align: top;
        }
        ha-file-upload {
          margin-top: 16px;
        }
        .buttons {
          display: flex;
          justify-content: flex-end;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-import-calendar-events": DialogImportCalendarEvents;
  }
}

customElements.define(
  "dialog-import-calendar-events",
  DialogImportCalendarEvents
);
