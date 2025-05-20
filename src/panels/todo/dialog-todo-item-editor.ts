import "@material/mwc-button";
import { formatInTimeZone, toDate } from "date-fns-tz";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { resolveTimeZone } from "../../common/datetime/resolve-time-zone";
import { fireEvent } from "../../common/dom/fire_event";
import { supportsFeature } from "../../common/entity/supports-feature";
import "../../components/ha-alert";
import "../../components/ha-checkbox";
import "../../components/ha-date-input";
import { createCloseHeading } from "../../components/ha-dialog";
import "../../components/ha-textarea";
import "../../components/ha-textfield";
import "../../components/ha-time-input";
import {
  TodoItemStatus,
  TodoListEntityFeature,
  createItem,
  deleteItems,
  updateItem,
} from "../../data/todo";
import { showConfirmationDialog } from "../../dialogs/generic/show-dialog-box";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import type { TodoItemEditDialogParams } from "./show-dialog-todo-item-editor";
import { supportsMarkdownHelper } from "../../common/translations/markdown_support";

@customElement("dialog-todo-item-editor")
class DialogTodoItemEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _error?: string;

  @state() private _params?: TodoItemEditDialogParams;

  @state() private _summary = "";

  @state() private _description? = "";

  @state() private _due?: Date;

  @state() private _checked = false;

  @state() private _hasTime = false;

  @state() private _submitting = false;

  // Dates are manipulated and displayed in the browser timezone
  // which may be different from the Home Assistant timezone. When
  // events are persisted, they are relative to the Home Assistant
  // timezone, but floating without a timezone.
  private _timeZone?: string;

  public showDialog(params: TodoItemEditDialogParams): void {
    this._error = undefined;
    this._params = params;
    this._timeZone = resolveTimeZone(
      this.hass.locale.time_zone,
      this.hass.config.time_zone
    );
    if (params.item) {
      const entry = params.item;
      this._checked = entry.status === TodoItemStatus.Completed;
      this._summary = entry.summary;
      this._description = entry.description || "";
      this._hasTime = entry.due?.includes("T") || false;
      this._due = entry.due
        ? new Date(this._hasTime ? entry.due : `${entry.due}T00:00:00`)
        : undefined;
    } else {
      this._hasTime = false;
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
    this._hasTime = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }
    const isCreate = this._params.item === undefined;

    const { dueDate, dueTime } = this._getLocaleStrings(this._due);

    const canUpdate = this._todoListSupportsFeature(
      TodoListEntityFeature.UPDATE_TODO_ITEM
    );

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        scrimClickAction
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize(
            `ui.components.todo.item.${isCreate ? "add" : "edit"}`
          )
        )}
      >
        <div class="content">
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : ""}

          <div class="flex">
            <ha-checkbox
              .checked=${this._checked}
              @change=${this._checkedCanged}
              .disabled=${isCreate || !canUpdate}
            ></ha-checkbox>
            <ha-textfield
              class="summary"
              name="summary"
              .label=${this.hass.localize("ui.components.todo.item.summary")}
              .value=${this._summary}
              required
              @input=${this._handleSummaryChanged}
              .validationMessage=${this.hass.localize(
                "ui.common.error_required"
              )}
              dialogInitialFocus
              .disabled=${!canUpdate}
            ></ha-textfield>
          </div>
          ${this._todoListSupportsFeature(
            TodoListEntityFeature.SET_DESCRIPTION_ON_ITEM
          )
            ? html`<ha-textarea
                class="description"
                name="description"
                .label=${this.hass.localize(
                  "ui.components.todo.item.description"
                )}
                .helper=${supportsMarkdownHelper(this.hass.localize)}
                .value=${this._description}
                @input=${this._handleDescriptionChanged}
                autogrow
                .disabled=${!canUpdate}
              ></ha-textarea>`
            : nothing}
          ${this._todoListSupportsFeature(
            TodoListEntityFeature.SET_DUE_DATE_ON_ITEM
          ) ||
          this._todoListSupportsFeature(
            TodoListEntityFeature.SET_DUE_DATETIME_ON_ITEM
          )
            ? html`<div>
                <span class="label"
                  >${this.hass.localize("ui.components.todo.item.due")}:</span
                >
                <div class="flex">
                  <ha-date-input
                    .value=${dueDate}
                    .locale=${this.hass.locale}
                    .disabled=${!canUpdate}
                    @value-changed=${this._dueDateChanged}
                    can-clear
                  ></ha-date-input>
                  ${this._todoListSupportsFeature(
                    TodoListEntityFeature.SET_DUE_DATETIME_ON_ITEM
                  )
                    ? html`<ha-time-input
                        .value=${dueTime}
                        .locale=${this.hass.locale}
                        .disabled=${!canUpdate}
                        @value-changed=${this._dueTimeChanged}
                      ></ha-time-input>`
                    : nothing}
                </div>
              </div>`
            : nothing}
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
                .disabled=${!canUpdate || this._submitting}
              >
                ${this.hass.localize("ui.components.todo.item.save")}
              </mwc-button>
              ${this._todoListSupportsFeature(
                TodoListEntityFeature.DELETE_TODO_ITEM
              )
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

  private _todoListSupportsFeature(feature: number): boolean {
    if (!this._params?.entity) {
      return false;
    }
    const entityStateObj = this.hass!.states[this._params?.entity];
    return entityStateObj && supportsFeature(entityStateObj, feature);
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
    return this._hasTime
      ? formatInTimeZone(date, timeZone, "HH:mm:ss")
      : undefined; // 24 hr
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

  private _dueDateChanged(ev: CustomEvent) {
    if (!ev.detail.value) {
      this._due = undefined;
      return;
    }
    const time = this._due ? this._formatTime(this._due) : undefined;
    this._due = this._parseDate(`${ev.detail.value}${time ? `T${time}` : ""}`);
  }

  private _dueTimeChanged(ev: CustomEvent) {
    this._hasTime = true;
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
        due: this._due
          ? this._hasTime
            ? this._due.toISOString()
            : this._formatDate(this._due)
          : undefined,
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
        description:
          this._description ||
          (this._todoListSupportsFeature(
            TodoListEntityFeature.SET_DESCRIPTION_ON_ITEM
          )
            ? null
            : undefined),
        due: this._due
          ? this._hasTime
            ? this._due.toISOString()
            : this._formatDate(this._due)
          : this._todoListSupportsFeature(
                TodoListEntityFeature.SET_DUE_DATETIME_ON_ITEM
              ) ||
              this._todoListSupportsFeature(
                TodoListEntityFeature.SET_DUE_DATE_ON_ITEM
              )
            ? null
            : undefined,
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
      destructive: true,
      confirmText: this.hass.localize("ui.common.delete"),
      dismissText: this.hass.localize("ui.common.cancel"),
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
        @media all and (min-width: 450px) and (min-height: 500px) {
          ha-dialog {
            --mdc-dialog-min-width: min(600px, 95vw);
            --mdc-dialog-max-width: min(600px, 95vw);
          }
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
          margin-inline-start: 16px;
          margin-inline-end: initial;
        }
        .flex {
          display: flex;
          justify-content: space-between;
        }
        .label {
          font-size: var(--ha-font-size-s);
          font-weight: var(--ha-font-weight-medium);
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
