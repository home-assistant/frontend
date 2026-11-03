import type { ContextType } from "@lit/context";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consume } from "../../../../common/decorators/consume";
import { fireEvent } from "../../../../common/dom/fire_event";
import { formatListWithAnds } from "../../../../common/string/format-list";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import "../../../../components/ha-expansion-panel";
import "../../../../components/ha-time-input";
import "../../../../components/ha-yaml-editor";
import { internationalizationContext } from "../../../../data/context";
import type {
  ScheduleBlock,
  ScheduleBlockData,
  ScheduleBlockPreview,
  ScheduleBlockRef,
  ScheduleWeek,
  ScheduleWeekday,
} from "../../../../data/schedule";
import {
  formatScheduleWeekday,
  getConflictingDays,
  isScheduleBlockData,
  normalizeScheduleBlock,
  normalizeScheduleTime,
  timeToMinutes,
} from "../../../../data/schedule";
import type { ValueChangedEvent } from "../../../../types";
import "./ha-schedule-weekday-picker";

/**
 * Inline editor for one time block: start, end, the days it applies to, and
 * optional additional data.
 *
 * @fires schedule-block-preview - The draft changed. `detail.preview` is
 * not set while the times or days are incomplete or the end is before the
 * start.
 * @fires schedule-block-apply - Apply the block to the selected days.
 * @fires schedule-block-delete - Delete the block being edited.
 * @fires schedule-block-close - Close the editor without changes.
 */
@customElement("ha-schedule-block-editor")
export class HaScheduleBlockEditor extends LitElement {
  @property({ attribute: false }) public week!: ScheduleWeek;

  @property({ attribute: false }) public block!: ScheduleBlock;

  /** The block being edited. Not set when creating a new block. */
  @property({ attribute: false }) public source?: ScheduleBlockRef;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state() private _from = "";

  @state() private _to = "";

  @state() private _days: ScheduleWeekday[] = [];

  @state() private _data?: ScheduleBlockData;

  @state() private _dataValid = true;

  protected willUpdate(changedProps: PropertyValues<this>): void {
    super.willUpdate(changedProps);
    if (changedProps.has("block") || changedProps.has("source")) {
      this._from = this.block.from;
      // The time input cannot show 24:00, midnight means the end of the day.
      this._to = this.block.to === "24:00" ? "00:00" : this.block.to;
      this._days = this.source ? [this.source.day] : [];
      this._data = this.block.data;
      this._dataValid = true;
    }
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (
      ["block", "source", "_from", "_to", "_days", "_data"].some((prop) =>
        changedProps.has(prop)
      )
    ) {
      fireEvent(this, "schedule-block-preview", { preview: this._preview() });
    }
  }

  protected render() {
    if (!this._i18n || !this.block) {
      return nothing;
    }
    const { localize, locale } = this._i18n;
    const draft = this._draft();
    const error = this._error(draft);
    const editing = !!this.source;

    return html`
      <div class="times">
        <ha-time-input
          .locale=${locale}
          .label=${localize("ui.dialogs.helper_settings.schedule.start")}
          .value=${this._from}
          @value-changed=${this._fromChanged}
        ></ha-time-input>
        <ha-time-input
          .locale=${locale}
          .label=${localize("ui.dialogs.helper_settings.schedule.end")}
          .value=${this._to}
          @value-changed=${this._toChanged}
        ></ha-time-input>
      </div>
      <ha-schedule-weekday-picker
        .label=${localize("ui.dialogs.helper_settings.schedule.days")}
        .value=${this._days}
        @value-changed=${this._daysChanged}
      ></ha-schedule-weekday-picker>
      ${
        error
          ? html`<ha-alert alert-type=${error.type}>${error.message}</ha-alert>`
          : nothing
      }
      <ha-expansion-panel
        outlined
        .header=${localize("ui.dialogs.helper_settings.schedule.data")}
        .secondary=${localize(
          "ui.dialogs.helper_settings.schedule.data_description"
        )}
        .expanded=${!!this.block.data}
      >
        <ha-yaml-editor
          auto-update
          in-dialog
          .value=${this.block.data}
          @value-changed=${this._dataChanged}
        ></ha-yaml-editor>
        ${
          this._dataValid
            ? nothing
            : html`<ha-alert alert-type="error">
                ${localize("ui.dialogs.helper_settings.schedule.error_data")}
              </ha-alert>`
        }
      </ha-expansion-panel>
      <div class="actions">
        ${
          editing
            ? html`<ha-button
                appearance="plain"
                variant="danger"
                @click=${this._delete}
              >
                ${localize("ui.common.delete")}
              </ha-button>`
            : nothing
        }
        <span class="spacer"></span>
        <ha-button appearance="plain" @click=${this._close}>
          ${localize("ui.common.cancel")}
        </ha-button>
        <ha-button
          .disabled=${!!error || !this._dataValid}
          @click=${this._apply}
        >
          ${localize(editing ? "ui.common.apply" : "ui.common.create")}
        </ha-button>
      </div>
    `;
  }

  private _draft(): ScheduleBlock {
    const block: ScheduleBlock = normalizeScheduleBlock({
      from: this._from || "00:00",
      to: this._to || "00:00",
    });
    if (this._data && Object.keys(this._data).length) {
      block.data = this._data;
    }
    return block;
  }

  private _preview(): ScheduleBlockPreview | undefined {
    const block = this._draft();
    if (
      !this._from ||
      !this._to ||
      !this._days.length ||
      timeToMinutes(block.to) <= timeToMinutes(block.from)
    ) {
      return undefined;
    }
    return { block, days: this._days, source: this.source };
  }

  private _error(
    draft: ScheduleBlock
  ): { type: "error" | "info"; message: string } | undefined {
    const { localize, locale } = this._i18n;
    if (!this._from || !this._to) {
      return undefined;
    }
    if (timeToMinutes(draft.to) <= timeToMinutes(draft.from)) {
      return {
        type: "error",
        message: localize(
          "ui.dialogs.helper_settings.schedule.error_end_before_start"
        ),
      };
    }
    if (!this._days.length) {
      return {
        type: "info",
        message: localize("ui.dialogs.helper_settings.schedule.error_no_days"),
      };
    }
    const conflicts = getConflictingDays(
      this.week,
      draft,
      this._days,
      this.source
    );
    if (conflicts.length) {
      return {
        type: "error",
        message: localize("ui.dialogs.helper_settings.schedule.error_overlap", {
          days: formatListWithAnds(
            locale,
            conflicts.map((day) => formatScheduleWeekday(day, locale))
          ),
        }),
      };
    }
    return undefined;
  }

  private _fromChanged(ev: ValueChangedEvent<string | undefined>) {
    ev.stopPropagation();
    this._from = this._inputTime(ev.detail.value);
  }

  private _toChanged(ev: ValueChangedEvent<string | undefined>) {
    ev.stopPropagation();
    this._to = this._inputTime(ev.detail.value);
  }

  /** Drop the seconds the time input adds. */
  private _inputTime(value?: string): string {
    return value ? normalizeScheduleTime(value) : "";
  }

  private _daysChanged(ev: ValueChangedEvent<ScheduleWeekday[]>) {
    ev.stopPropagation();
    this._days = ev.detail.value;
  }

  private _dataChanged(ev: CustomEvent<{ value: unknown; isValid: boolean }>) {
    ev.stopPropagation();
    const { value, isValid } = ev.detail;
    if (!isValid || (value != null && !isScheduleBlockData(value))) {
      this._dataValid = false;
      return;
    }
    this._dataValid = true;
    this._data = value ?? undefined;
  }

  private _apply() {
    fireEvent(this, "schedule-block-apply", {
      block: this._draft(),
      days: this._days,
    });
  }

  private _delete() {
    fireEvent(this, "schedule-block-delete");
  }

  private _close() {
    fireEvent(this, "schedule-block-close");
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-4);
    }

    .times {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ha-space-4);
    }

    .times ha-time-input {
      flex: 1;
      min-width: 140px;
    }

    ha-alert {
      display: block;
    }

    ha-yaml-editor {
      display: block;
      padding: var(--ha-space-2) 0;
    }

    .actions {
      display: flex;
      align-items: center;
      gap: var(--ha-space-2);
    }

    .spacer {
      flex: 1;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-schedule-block-editor": HaScheduleBlockEditor;
  }

  interface HASSDomEvents {
    "schedule-block-preview": { preview?: ScheduleBlockPreview };
    "schedule-block-apply": {
      block: ScheduleBlock;
      days: ScheduleWeekday[];
    };
    "schedule-block-delete": undefined;
    "schedule-block-close": undefined;
  }
}
