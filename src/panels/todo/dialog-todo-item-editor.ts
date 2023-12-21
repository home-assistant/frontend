import "@material/mwc-button";
import { mdiClose } from "@mdi/js";
import { formatInTimeZone, toDate } from "date-fns-tz";
import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-date-input";
import "../../components/ha-textarea";
import "../../components/ha-time-input";
import {
  TodoItemStatus,
  createItem,
  deleteItems,
  updateItem,
} from "../../data/todo";
import { TimeZone } from "../../data/translation";
import { showConfirmationDialog } from "../../dialogs/generic/show-dialog-box";
import { haStyleDialog } from "../../resources/styles";
import { HomeAssistant } from "../../types";
import { TodoItemEditDialogParams } from "./show-dialog-todo-item-editor";

@customElement("dialog-todo-item-editor")
class DialogTodoItemEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _error?: string;

  @state() private _params?: TodoItemEditDialogParams;

  @state() private _summary = "";

  @state() private _description? = "";

  @state() private _due?: Date;

  @state() private _checked = false;

  @state() private _submitting = false;

  // Dates are manipulated and displayed in the browser timezone
  // which may be different from the Home Assistant timezone. When
  // events are persisted, they are relative to the Home Assistant
  // timezone, but floating without a timezone.
  private _timeZone?: string;

  public showDialog(params: TodoItemEditDialogParams): void {
    this._error = undefined;
    this._params = params;
    this._timeZone =
      this.hass.locale.time_zone === TimeZone.local
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : this.hass.config.time_zone;
    if (params.item) {
      const entry = params.item;
      this._checked = entry.status === TodoItemStatus.Completed;
      this._summary = entry.summary;
      this._description = entry.description || "";
      this._due = entry.due ? new Date(entry.due) : undefined;
    } else {
      this._checked = false;
      this._due = undefined;
    }
  }

  public closeDialog(): void {
    if (!this._params) {
      return;
    }
    this._error = undefined;
    this._params = undefined;
    this._due = undefined;
    this._summary = "";
    this._description = "";
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }
    const isCreate = this._params.item === undefined;

    const { dueDate, dueTime } = this._getLocaleStrings(this._due);

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        scrimClickAction
        escapeKeyAction
        .heading=${html`
          <div class="header_title">
            ${isCreate
              ? this.hass.localize("ui.components.todo.item.add")
              : this._summary}
          </div>
          <ha-icon-button
            .label=${this.hass.localize("ui.dialogs.generic.close")}
            .path=${mdiClose}
            dialogAction="close"
            class="header_button"
          ></ha-icon-button>
        `}
      >
        <div class="content">
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : ""}

          <div class="flex">
            <ha-checkbox
              .checked=${this._checked}
              @change=${this._checkedCanged}
              .disabled=${isCreate || !this._params.canUpdate}
            ></ha-checkbox>
            <ha-textfield
              class="summary"
              name="summary"
              .label=${this.hass.localize("ui.components.todo.item.summary")}
              .value=${this._summary}
              required
              @change=${this._handleSummaryChanged}
              .validationMessage=${this.hass.localize(
                "ui.common.error_required"
              )}
              dialogInitialFocus
              .disabled=${!this._params.canUpdate}
            ></ha-textfield>
          </div>
          <ha-textarea
            class="description"
            name="description"
            .label=${this.hass.localize("ui.components.todo.item.description")}
            .value=${this._description}
            @change=${this._handleDescriptionChanged}
            autogrow
            .disabled=${!this._params.canUpdate}
          ></ha-textarea>

          <div>
            <span class="label"
              >${this.hass.localize("ui.components.todo.item.due")}:</span
            >
            <div class="flex">
              <ha-date-input
                .value=${dueDate}
                .locale=${this.hass.locale}
                .disabled=${!this._params.canUpdate}
                @value-changed=${this._endDateChanged}
              ></ha-date-input>
              <ha-time-input
                .value=${dueTime}
                .locale=${this.hass.locale}
                .disabled=${!this._params.canUpdate}
                @value-changed=${this._endTimeChanged}
              ></ha-time-input>
            </div>
          </div>
        </div>
        ${isCreate
          ? html`
              <mwc-button
                slot="primaryAction"
                @click=${this._createItem}
                .disabled=${this._submitting}
              >
                ${this.hass.localize("ui.components.todo.item.add")}
              </mwc-button>
            `
          : html`
              <mwc-button
                slot="primaryAction"
                @click=${this._saveItem}
                .disabled=${!this._params.canUpdate || this._submitting}
              >
                ${this.hass.localize("ui.components.todo.item.save")}
              </mwc-button>
              ${this._params.canDelete
                ? html`
                    <mwc-button
                      slot="secondaryAction"
                      class="warning"
                      @click=${this._deleteItem}
                      .disabled=${this._submitting}
                    >
                      ${this.hass.localize("ui.components.todo.item.delete")}
                    </mwc-button>
                  `
                : ""}
            `}
      </ha-dialog>
    `;
  }

  private _getLocaleStrings = memoizeOne((due?: Date) => ({
    dueDate: due ? this._formatDate(due) : undefined,
    dueTime: due ? this._formatTime(due) : undefined,
  }));

  // Formats a date in specified timezone, or defaulting to browser display timezone
  private _formatDate(date: Date, timeZone: string = this._timeZone!): string {
    return formatInTimeZone(date, timeZone, "yyyy-MM-dd");
  }

  // Formats a time in specified timezone, or defaulting to browser display timezone
  private _formatTime(
    date: Date,
    timeZone: string = this._timeZone!
  ): string | undefined {
    return formatInTimeZone(date, timeZone, "HH:mm:ss"); // 24 hr
  }

  // Parse a date in the browser timezone
  private _parseDate(dateStr: string): Date {
    return toDate(dateStr, { timeZone: this._timeZone! });
  }

  private _checkedCanged(ev) {
    this._checked = ev.target.checked;
  }

  private _handleSummaryChanged(ev) {
    this._summary = ev.target.value;
  }

  private _handleDescriptionChanged(ev) {
    this._description = ev.target.value;
  }

  private _endDateChanged(ev: CustomEvent) {
    const time = this._due ? this._formatTime(this._due) : undefined;
    this._due = this._parseDate(`${ev.detail.value}${time ? `T${time}` : ""}`);
  }

  private _endTimeChanged(ev: CustomEvent) {
    this._due = this._parseDate(
      `${this._formatDate(this._due || new Date())}T${ev.detail.value}`
    );
  }

  private async _createItem() {
    if (!this._summary) {
      this._error = this.hass.localize(
        "ui.components.todo.item.not_all_required_fields"
      );
      return;
    }

    this._submitting = true;
    try {
      await createItem(this.hass!, this._params!.entity, {
        summary: this._summary,
        description: this._description,
        due: this._due?.toISOString(),
      });
    } catch (err: any) {
      this._error = err ? err.message : "Unknown error";
      return;
    } finally {
      this._submitting = false;
    }
    this.closeDialog();
  }

  private async _saveItem() {
    if (!this._summary) {
      this._error = this.hass.localize(
        "ui.components.todo.item.not_all_required_fields"
      );
      return;
    }

    this._submitting = true;
    const entry = this._params!.item!;

    try {
      await updateItem(this.hass!, this._params!.entity, {
        ...entry,
        summary: this._summary,
        description: this._description,
        due: this._due?.toISOString(),
        status: this._checked
          ? TodoItemStatus.Completed
          : TodoItemStatus.NeedsAction,
      });
    } catch (err: any) {
      this._error = err ? err.message : "Unknown error";
      return;
    } finally {
      this._submitting = false;
    }
    this.closeDialog();
  }

  private async _deleteItem() {
    this._submitting = true;
    const entry = this._params!.item!;
    const confirm = await showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.components.todo.item.confirm_delete.delete"
      ),
      text: this.hass.localize("ui.components.todo.item.confirm_delete.prompt"),
    });
    if (!confirm) {
      // Cancel
      this._submitting = false;
      return;
    }
    try {
      await deleteItems(this.hass!, this._params!.entity, [entry.uid]);
    } catch (err: any) {
      this._error = err ? err.message : "Unknown error";
      return;
    } finally {
      this._submitting = false;
    }
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --mdc-dialog-min-width: min(600px, 95vw);
          --mdc-dialog-max-width: min(600px, 95vw);
        }
        ha-alert {
          display: block;
          margin-bottom: 16px;
        }
        ha-textfield,
        ha-textarea {
          display: block;
          width: 100%;
        }
        ha-checkbox {
          margin-top: 4px;
        }
        ha-textarea {
          margin-bottom: 16px;
        }
        ha-date-input {
          flex-grow: 1;
        }
        ha-time-input {
          margin-left: 16px;
        }
        .flex {
          display: flex;
          justify-content: space-between;
        }
        .label {
          font-size: 12px;
          font-weight: 500;
          color: var(--input-label-ink-color);
        }
        .date-range-details-content {
          display: inline-block;
        }
        ha-svg-icon {
          width: 40px;
          margin-right: 8px;
          margin-inline-end: 16px;
          margin-inline-start: initial;
          direction: var(--direction);
          vertical-align: top;
        }
        .key {
          display: inline-block;
          vertical-align: top;
        }
        .value {
          display: inline-block;
          vertical-align: top;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-todo-item-editor": DialogTodoItemEditor;
  }
}
