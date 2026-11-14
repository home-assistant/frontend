import type { ContextType } from "@lit/context";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { keyed } from "lit/directives/keyed";
import { consume } from "../../../../common/decorators/consume";
import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import { fireEvent } from "../../../../common/dom/fire_event";
import { deepEqual } from "../../../../common/util/deep-equal";
import { formatListWithAnds } from "../../../../common/string/format-list";
import "../../../../components/ha-alert";
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

/** Cleared additional data is `{}`, which saves the same as no data. */
const withoutEmptyData = (data?: ScheduleBlockData) =>
  data && Object.keys(data).length ? data : undefined;

/** The time input passes on hours and minutes out of range, like `08:99`. */
const isValidTime = (time: string): boolean => {
  const [hours, minutes] = time.split(":").map(Number);
  return (
    Number.isInteger(hours) &&
    Number.isInteger(minutes) &&
    hours >= 0 &&
    hours < 24 &&
    minutes >= 0 &&
    minutes < 60
  );
};

/** Why a draft cannot be applied. */
type DraftProblem =
  | { type: "invalid_time" | "end_before_start" | "no_days" }
  | { type: "overlap"; days: ScheduleWeekday[] };

/**
 * Inline editor for one time block: start, end, the days it applies to, and
 * optional additional data.
 *
 * @fires schedule-block-draft-changed - The draft changed. `detail.preview`
 * is not set while the times or days are incomplete or invalid,
 * `detail.dirty` tells whether the draft differs from the block, and
 * `detail.valid` whether the preview can be applied. The host renders the
 * buttons and applies the preview.
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

  /**
   * Whether the additional data was opened. Its YAML editor is only created
   * then, as most blocks have no data.
   */
  @state() private _dataOpened = false;

  protected willUpdate(changedProps: PropertyValues<this>): void {
    super.willUpdate(changedProps);
    if (changedProps.has("block") || changedProps.has("source")) {
      this._from = this.block.from;
      // The time input cannot show 24:00, midnight means the end of the day.
      this._to = this.block.to === "24:00" ? "00:00" : this.block.to;
      this._days = this.source ? [this.source.day] : [];
      this._data = this.block.data;
      this._dataValid = true;
      this._dataOpened = !!this.block.data;
    }
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (
      [
        "week",
        "block",
        "source",
        "_from",
        "_to",
        "_days",
        "_data",
        "_dataValid",
      ].some((prop) => changedProps.has(prop))
    ) {
      const draft = this._draft();
      const problem = this._problem(draft);
      fireEvent(this, "schedule-block-draft-changed", {
        // An overlapping draft is still shown, so the conflict is visible.
        preview:
          !problem || problem.type === "overlap"
            ? { block: draft, days: this._days, source: this.source }
            : undefined,
        dirty: this._isDirty(),
        valid: !problem && this._dataValid,
      });
    }
  }

  protected render() {
    if (!this._i18n || !this.block) {
      return nothing;
    }
    const { localize, locale } = this._i18n;
    const problem = this._problem(this._draft());

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
        problem
          ? html`<ha-alert
              alert-type=${problem.type === "no_days" ? "info" : "error"}
            >
              ${this._problemMessage(problem)}
            </ha-alert>`
          : nothing
      }
      <ha-expansion-panel
        outlined
        .header=${localize("ui.dialogs.helper_settings.schedule.data")}
        .secondary=${localize(
          "ui.dialogs.helper_settings.schedule.data_description"
        )}
        .expanded=${!!this.block.data}
        @expanded-will-change=${this._expandedWillChange}
      >
        ${
          this._dataOpened
            ? keyed(
                // A new editor for each block, so no text of the previous
                // one stays.
                this.block,
                html`<ha-yaml-editor
                  in-dialog
                  .defaultValue=${this.block.data}
                  @value-changed=${this._dataChanged}
                ></ha-yaml-editor>`
              )
            : nothing
        }
        ${
          this._dataValid
            ? nothing
            : html`<ha-alert alert-type="error">
                ${localize("ui.dialogs.helper_settings.schedule.error_data")}
              </ha-alert>`
        }
      </ha-expansion-panel>
    `;
  }

  private _draft(): ScheduleBlock {
    const block: ScheduleBlock = normalizeScheduleBlock({
      from: this._from || "00:00",
      to: this._to || "00:00",
    });
    const data = withoutEmptyData(this._data);
    if (data) {
      block.data = data;
    }
    return block;
  }

  /** Whether the draft differs from the block, so closing loses changes. */
  private _isDirty(): boolean {
    const days = this.source ? [this.source.day] : [];
    return (
      this._from !== this.block.from ||
      this._to !== (this.block.to === "24:00" ? "00:00" : this.block.to) ||
      this._days.length !== days.length ||
      this._days.some((day) => !days.includes(day)) ||
      !this._dataValid ||
      !deepEqual(
        withoutEmptyData(this._data),
        withoutEmptyData(this.block.data)
      )
    );
  }

  private _problem(draft: ScheduleBlock): DraftProblem | undefined {
    // A cleared time input is empty, which is not midnight.
    if (!isValidTime(this._from) || !isValidTime(this._to)) {
      return { type: "invalid_time" };
    }
    if (timeToMinutes(draft.to) <= timeToMinutes(draft.from)) {
      return { type: "end_before_start" };
    }
    if (!this._days.length) {
      return { type: "no_days" };
    }
    const days = getConflictingDays(this.week, draft, this._days, this.source);
    return days.length ? { type: "overlap", days } : undefined;
  }

  private _problemMessage(problem: DraftProblem): string {
    const { localize, locale } = this._i18n;
    if (problem.type === "overlap") {
      return localize("ui.dialogs.helper_settings.schedule.error_overlap", {
        days: formatListWithAnds(
          locale,
          problem.days.map((day) => formatScheduleWeekday(day, locale))
        ),
      });
    }
    return localize(
      `ui.dialogs.helper_settings.schedule.error_${problem.type}`
    );
  }

  private _fromChanged(ev: ValueChangedEvent<string | undefined>) {
    ev.stopPropagation();
    this._from = this._inputTime(ev.detail.value);
  }

  private _toChanged(ev: ValueChangedEvent<string | undefined>) {
    ev.stopPropagation();
    this._to = this._inputTime(ev.detail.value);
  }

  /** Drop the seconds the time input adds, keeping invalid input to show. */
  private _inputTime(value?: string): string {
    if (!value) {
      return "";
    }
    return isValidTime(value) ? normalizeScheduleTime(value) : value;
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

  private _expandedWillChange(
    ev: HASSDomEvent<HASSDomEvents["expanded-will-change"]>
  ) {
    if (ev.detail.expanded) {
      this._dataOpened = true;
    }
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
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-schedule-block-editor": HaScheduleBlockEditor;
  }

  interface HASSDomEvents {
    "schedule-block-draft-changed": {
      preview?: ScheduleBlockPreview;
      dirty: boolean;
      valid: boolean;
    };
  }
}
