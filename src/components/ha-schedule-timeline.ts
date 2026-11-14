import type { ContextType } from "@lit/context";
import { mdiContentCopy, mdiDelete, mdiDotsVertical } from "@mdi/js";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { consume } from "../common/decorators/consume";
import type { HASSDomCurrentTargetEvent } from "../common/dom/fire_event";
import { fireEvent } from "../common/dom/fire_event";
import { clamp } from "../common/number/clamp";
import { internationalizationContext } from "../data/context";
import type {
  MinuteRange,
  ScheduleBlock,
  ScheduleBlockPreview,
  ScheduleBlockRef,
  ScheduleWeek,
  ScheduleWeekday,
} from "../data/schedule";
import {
  blockRange,
  findScheduleBlock,
  formatScheduleHour,
  formatScheduleTime,
  formatScheduleWeekday,
  getConflictingDays,
  getFreeRange,
  getNewBlockRange,
  isSameScheduleDay,
  localeWeekdays,
  MINUTES_PER_DAY,
  moveRange,
  rangeToBlock,
  removeScheduleBlock,
  resizeRange,
  SCHEDULE_SNAP_MINUTES,
  snapDownInRange,
  upsertScheduleBlock,
} from "../data/schedule";
import type { HaDropdownSelectEvent } from "./ha-dropdown";
import "./ha-dropdown";
import "./ha-dropdown-item";
import "./ha-icon-button";
import "./ha-svg-icon";
import "./ha-tooltip";

const AXIS_HOURS = [0, 6, 12, 18, 24];

const blockId = (day: ScheduleWeekday, index: number) =>
  `block-${day}-${index}`;

const hasBlockData = (block: ScheduleBlock) =>
  !!block.data && Object.keys(block.data).length > 0;

// Pointer movement in pixels before a press turns into a drag.
const DRAG_THRESHOLD = 4;

type DragMode = "create" | "move" | "resize-start" | "resize-end";

interface DragState {
  mode: DragMode;
  day: ScheduleWeekday;
  index?: number;
  pointerId: number;
  rect: DOMRect;
  rtl: boolean;
  originX: number;
  originMinute: number;
  /** The free range the block can use without overlapping others. */
  bounds: MinuteRange;
  /** The block's range when the drag started. */
  initial: MinuteRange;
  /** The range shown while dragging. */
  range: MinuteRange;
  moved: boolean;
}

/**
 * Weekly schedule shown as one horizontal 24-hour track per day.
 *
 * Users create time blocks by tapping or dragging on a track, move them by
 * dragging, and resize them by dragging their edges. Focused blocks can also
 * be moved and resized with the keyboard.
 *
 * @fires value-changed - The week changed. `detail.value` is a `ScheduleWeek`.
 * @fires schedule-block-selected - A block was selected or deselected.
 * @fires schedule-day-copy - The user wants to copy a day to other days.
 */
@customElement("ha-schedule-timeline")
export class HaScheduleTimeline extends LitElement {
  @property({ attribute: false }) public value?: ScheduleWeek;

  @property({ attribute: false }) public selected?: ScheduleBlockRef;

  /** A block being created or edited, drawn dashed until it is applied. */
  @property({ attribute: false }) public preview?: ScheduleBlockPreview;

  /**
   * Asked before the user's change is applied, like a block drawn on a track.
   * When it resolves to `false`, the change is dropped.
   */
  @property({ attribute: false })
  public confirmChange?: () => Promise<boolean>;

  @property({ type: Boolean, reflect: true }) public readonly = false;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state() private _drag?: DragState;

  /** The block whose times are shown below a read-only timeline. */
  @state() private _shownBlock?: ScheduleBlockRef;

  protected willUpdate(changedProps: PropertyValues<this>): void {
    super.willUpdate(changedProps);
    // A drag in progress refers to block indexes of its day. Only cancel it
    // when that day really changed, not when the parent passes an equal week.
    if (this._drag && changedProps.has("value")) {
      const day = this._drag.day;
      const oldBlocks = changedProps.get("value")?.[day];
      const newBlocks = this.value?.[day];
      if (
        !oldBlocks ||
        !newBlocks ||
        !isSameScheduleDay(oldBlocks, newBlocks)
      ) {
        this._drag = undefined;
      }
    }
  }

  protected render() {
    if (!this.value || !this._i18n) {
      return nothing;
    }
    const locale = this._i18n.locale;
    const days = localeWeekdays(locale);
    const preview = this._visiblePreview();
    const conflicts = preview
      ? getConflictingDays(
          this.value,
          preview.block,
          preview.days,
          preview.source
        )
      : [];

    return html`
      <div class="timeline">
        <div class="axis" aria-hidden="true">
          <div class="scale">
            ${AXIS_HOURS.map(
              (hour) =>
                html`<span class="tick"
                  ><span>${formatScheduleHour(hour, locale)}</span></span
                >`
            )}
          </div>
        </div>
        ${days.map((day) =>
          this._renderDay(day, preview, conflicts.includes(day))
        )}
      </div>
      ${this._renderTooltips(days)}
      ${
        this.readonly
          ? this._renderShownBlock()
          : html`<span id="keyboard-hint" hidden
              >${this._i18n.localize(
                "ui.dialogs.helper_settings.schedule.keyboard_hint"
              )}</span
            >`
      }
    `;
  }

  /**
   * Narrow blocks hide their times, and read-only blocks cannot be opened in
   * an editor, so the selected block's times are shown below the timeline.
   */
  private _renderShownBlock() {
    const ref = this._shownBlock;
    const block = ref && this.value![ref.day][ref.index];
    return html`<p class="shown-block">
      ${
        block
          ? this._blockLabel(ref.day, block, blockRange(block))
          : this._i18n.localize(
              "ui.dialogs.helper_settings.schedule.readonly_hint"
            )
      }
    </p>`;
  }

  /** Narrow blocks hide their times, so hovering or focusing shows them. */
  private _renderTooltips(days: ScheduleWeekday[]) {
    return days.map((day) =>
      this.value![day].map(
        (block, index) =>
          html`<ha-tooltip for=${blockId(day, index)} .disabled=${!!this._drag}>
            ${this._blockLabel(day, block, blockRange(block), false)}
          </ha-tooltip>`
      )
    );
  }

  private _blockLabel(
    day: ScheduleWeekday,
    block: ScheduleBlock,
    range: MinuteRange,
    mentionData = true
  ): string {
    const { locale, localize } = this._i18n;
    return localize(
      mentionData && hasBlockData(block)
        ? "ui.dialogs.helper_settings.schedule.block_label_with_data"
        : "ui.dialogs.helper_settings.schedule.block_label",
      {
        day: formatScheduleWeekday(day, locale),
        from: formatScheduleTime(range.start, locale),
        to: formatScheduleTime(range.end, locale),
      }
    );
  }

  /** The preview, unless the user is dragging the block it replaces. */
  private _visiblePreview(): ScheduleBlockPreview | undefined {
    const source = this.preview?.source;
    const drag = this._drag;
    if (
      source &&
      drag?.moved &&
      drag.day === source.day &&
      drag.index === source.index
    ) {
      return undefined;
    }
    return this.preview;
  }

  private _renderDay(
    day: ScheduleWeekday,
    preview: ScheduleBlockPreview | undefined,
    conflict: boolean
  ): TemplateResult {
    const { locale, localize } = this._i18n;
    const blocks = this.value![day];
    const drag = this._drag?.day === day ? this._drag : undefined;
    const dayName = formatScheduleWeekday(day, locale);
    // The block being edited is its own preview until its times change, and
    // fades once the preview moves it or removes it from this day.
    const previewBlock = preview?.days.includes(day)
      ? preview.block
      : undefined;
    const sourceIndex =
      preview?.source?.day === day ? preview.source.index : undefined;
    const source = sourceIndex === undefined ? undefined : blocks[sourceIndex];
    const unchanged =
      !!source &&
      source.from === previewBlock?.from &&
      source.to === previewBlock.to;
    const ghost = unchanged ? undefined : previewBlock;
    const replacedIndex = unchanged ? undefined : sourceIndex;

    return html`
      <div class="row">
        <div class="day" title=${dayName}>
          ${formatScheduleWeekday(day, locale, "short")}
        </div>
        <div
          class="track"
          role="group"
          aria-label=${dayName}
          data-day=${day}
          @pointerdown=${this._pointerDown}
          @pointermove=${this._pointerMove}
          @pointerup=${this._pointerUp}
          @pointercancel=${this._pointerCancel}
        >
          ${blocks.map((block, index) => {
            const range =
              drag && drag.mode !== "create" && drag.index === index
                ? drag.range
                : undefined;
            return this._renderBlock(
              day,
              block,
              index,
              range,
              replacedIndex === index
            );
          })}
          ${ghost ? this._renderPreview(ghost, conflict) : nothing}
          ${
            drag?.mode === "create" && drag.moved
              ? html`<div
                  class="block ghost"
                  style=${styleMap(this._rangeStyle(drag.range))}
                ></div>`
              : nothing
          }
        </div>
        ${
          this.readonly
            ? nothing
            : html`
                <ha-dropdown
                  data-day=${day}
                  placement="bottom-end"
                  @wa-select=${this._dayAction}
                >
                  <ha-icon-button
                    slot="trigger"
                    .label=${localize(
                      "ui.dialogs.helper_settings.schedule.day_options",
                      { day: dayName }
                    )}
                    .path=${mdiDotsVertical}
                  ></ha-icon-button>
                  <ha-dropdown-item value="copy">
                    <ha-svg-icon
                      slot="icon"
                      .path=${mdiContentCopy}
                    ></ha-svg-icon>
                    ${localize("ui.dialogs.helper_settings.schedule.copy_day")}
                  </ha-dropdown-item>
                  <ha-dropdown-item
                    value="clear"
                    variant="danger"
                    .disabled=${!blocks.length}
                  >
                    <ha-svg-icon slot="icon" .path=${mdiDelete}></ha-svg-icon>
                    ${localize("ui.dialogs.helper_settings.schedule.clear_day")}
                  </ha-dropdown-item>
                </ha-dropdown>
              `
        }
      </div>
    `;
  }

  private _renderBlock(
    day: ScheduleWeekday,
    block: ScheduleBlock,
    index: number,
    dragRange: MinuteRange | undefined,
    replaced: boolean
  ): TemplateResult {
    const locale = this._i18n.locale;
    const range = dragRange ?? blockRange(block);
    const from = formatScheduleTime(range.start, locale);
    const to = formatScheduleTime(range.end, locale);
    const selectedRef = this.readonly ? this._shownBlock : this.selected;
    const selected = selectedRef?.day === day && selectedRef.index === index;
    const label = this._blockLabel(day, block, range);

    return html`
      <div
        class=${classMap({
          block: true,
          selected,
          dragging: !!dragRange,
          replaced,
        })}
        style=${styleMap(this._rangeStyle(range))}
        id=${blockId(day, index)}
        data-index=${index}
        role="button"
        tabindex="0"
        aria-label=${label}
        aria-pressed=${selected ? "true" : "false"}
        aria-describedby=${this.readonly ? nothing : "keyboard-hint"}
        @click=${this._blockClick}
        @keydown=${this._blockKeyDown}
      >
        <span class="hit-area"></span>
        ${
          this.readonly
            ? nothing
            : html`<span class="handle" data-edge="start"></span>`
        }
        <span class="label">${from} – ${to}</span>
        ${
          this.readonly
            ? nothing
            : html`<span class="handle end" data-edge="end"></span>`
        }
      </div>
    `;
  }

  private _renderPreview(block: ScheduleBlock, conflict: boolean) {
    const locale = this._i18n.locale;
    const range = blockRange(block);
    const from = formatScheduleTime(range.start, locale);
    const to = formatScheduleTime(range.end, locale);
    // The block editor describes the draft and its errors to screen readers.
    return html`
      <div
        class=${classMap({ block: true, ghost: true, conflict })}
        style=${styleMap(this._rangeStyle(range))}
        aria-hidden="true"
      >
        <span class="label">${from} – ${to}</span>
      </div>
    `;
  }

  // Logical properties are only converted for older browsers in the
  // stylesheet, so the inline style only sets custom properties.
  private _rangeStyle(range: MinuteRange) {
    return {
      "--block-start": `${(range.start / MINUTES_PER_DAY) * 100}%`,
      "--block-width": `${((range.end - range.start) / MINUTES_PER_DAY) * 100}%`,
    };
  }

  private _minuteAt(clientX: number, rect: DOMRect, rtl: boolean): number {
    const x = rtl ? rect.right - clientX : clientX - rect.left;
    return clamp((x / rect.width) * MINUTES_PER_DAY, 0, MINUTES_PER_DAY);
  }

  private _pointerDown(
    ev: PointerEvent & HASSDomCurrentTargetEvent<HTMLElement>
  ): void {
    if (this.readonly || ev.button !== 0 || !this.value) {
      return;
    }
    const track = ev.currentTarget;
    const day = track.dataset.day as ScheduleWeekday;
    const blocks = this.value[day];
    const rect = track.getBoundingClientRect();
    const rtl = getComputedStyle(track).direction === "rtl";
    const minute = this._minuteAt(ev.clientX, rect, rtl);
    const target = ev.target as HTMLElement;
    const edge = target.dataset.edge as "start" | "end" | undefined;
    const blockEl = target.closest<HTMLElement>(".block:not(.ghost)");

    let mode: DragMode;
    let index: number | undefined;
    let bounds: MinuteRange | undefined;
    let initial: MinuteRange;

    if (blockEl) {
      mode = edge ? `resize-${edge}` : "move";
      index = Number(blockEl.dataset.index);
      initial = blockRange(blocks[index]);
      bounds = getFreeRange(blocks, initial.start, index);
    } else {
      mode = "create";
      bounds = getFreeRange(blocks, minute);
      if (!bounds) {
        return;
      }
      const anchor = snapDownInRange(minute, bounds);
      initial = { start: anchor, end: anchor };
    }

    track.setPointerCapture(ev.pointerId);
    this._drag = {
      mode,
      day,
      index,
      pointerId: ev.pointerId,
      rect,
      rtl,
      originX: ev.clientX,
      originMinute: minute,
      bounds: bounds!,
      initial,
      range: initial,
      moved: false,
    };
  }

  private _pointerMove(ev: PointerEvent): void {
    const drag = this._drag;
    if (!drag || ev.pointerId !== drag.pointerId) {
      return;
    }
    if (!drag.moved && Math.abs(ev.clientX - drag.originX) < DRAG_THRESHOLD) {
      return;
    }
    const minute = this._minuteAt(ev.clientX, drag.rect, drag.rtl);
    // Move and resize follow the pointer's movement, so grabbing a block or
    // handle away from its edge does not make the edge jump.
    const delta = minute - drag.originMinute;
    let range: MinuteRange;

    if (drag.mode === "create") {
      const edge = minute < drag.initial.start ? "start" : "end";
      range = resizeRange(drag.initial, edge, minute, drag.bounds);
    } else if (drag.mode === "move") {
      range = moveRange(drag.initial, drag.initial.start + delta, drag.bounds);
    } else {
      const edge = drag.mode === "resize-start" ? "start" : "end";
      range = resizeRange(
        drag.initial,
        edge,
        drag.initial[edge] + delta,
        drag.bounds
      );
    }

    // Ranges snap, so most pointer moves land on the same range.
    if (
      drag.moved &&
      range.start === drag.range.start &&
      range.end === drag.range.end
    ) {
      return;
    }
    this._drag = { ...drag, range, moved: true };
  }

  private _pointerUp(ev: PointerEvent): void {
    const drag = this._drag;
    if (!drag || ev.pointerId !== drag.pointerId || !this.value) {
      return;
    }
    this._drag = undefined;
    const blocks = this.value[drag.day];

    if (drag.mode === "create") {
      const range =
        drag.moved && drag.range.end > drag.range.start
          ? drag.range
          : getNewBlockRange(blocks, drag.originMinute);
      if (!range) {
        return;
      }
      const block = rangeToBlock(range);
      const value = upsertScheduleBlock(this.value, drag.day, block);
      this._commit(value, findScheduleBlock(value, drag.day, block.from));
      return;
    }

    const index = drag.index!;
    if (!drag.moved) {
      this._select({ day: drag.day, index });
      return;
    }
    const value = upsertScheduleBlock(
      this.value,
      drag.day,
      rangeToBlock(drag.range, blocks[index]),
      index
    );
    // Blocks cannot pass their neighbors, so the index stays the same.
    this._commit(value, { day: drag.day, index });
  }

  private _pointerCancel(): void {
    this._drag = undefined;
  }

  private _blockRef(blockEl: HTMLElement): ScheduleBlockRef {
    return {
      day: blockEl.closest<HTMLElement>(".track")!.dataset
        .day as ScheduleWeekday,
      index: Number(blockEl.dataset.index),
    };
  }

  /**
   * Screen readers activate a button with a click that has no pointer or key
   * events, and `detail` 0. Pointer clicks are already handled on release.
   */
  private _blockClick(
    ev: MouseEvent & HASSDomCurrentTargetEvent<HTMLElement>
  ): void {
    if (this.readonly) {
      this._toggleShownBlock(this._blockRef(ev.currentTarget));
    } else if (ev.detail === 0) {
      this._select(this._blockRef(ev.currentTarget));
    }
  }

  private _toggleShownBlock(ref: ScheduleBlockRef): void {
    const shown = this._shownBlock;
    this._shownBlock =
      shown?.day === ref.day && shown.index === ref.index ? undefined : ref;
  }

  private _blockKeyDown(
    ev: KeyboardEvent & HASSDomCurrentTargetEvent<HTMLElement>
  ): void {
    if (this.readonly) {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        this._toggleShownBlock(this._blockRef(ev.currentTarget));
      }
      return;
    }
    if (!this.value) {
      return;
    }
    const blockEl = ev.currentTarget;
    const track = blockEl.closest<HTMLElement>(".track")!;
    const ref = this._blockRef(blockEl);
    const blocks = this.value[ref.day];
    const block = blocks[ref.index];

    switch (ev.key) {
      case "Enter":
      case " ":
        ev.preventDefault();
        this._select(ref);
        return;
      case "Delete":
      case "Backspace":
        ev.preventDefault();
        this._commit(removeScheduleBlock(this.value, ref), undefined);
        return;
      case "ArrowLeft":
      case "ArrowRight": {
        ev.preventDefault();
        const rtl = getComputedStyle(track).direction === "rtl";
        const forward = (ev.key === "ArrowRight") !== rtl;
        const step = forward ? SCHEDULE_SNAP_MINUTES : -SCHEDULE_SNAP_MINUTES;
        const range = blockRange(block);
        const bounds = getFreeRange(blocks, range.start, ref.index)!;
        const newRange = ev.shiftKey
          ? resizeRange(range, "end", range.end + step, bounds)
          : moveRange(range, range.start + step, bounds);
        if (newRange.start === range.start && newRange.end === range.end) {
          return;
        }
        this._commit(
          upsertScheduleBlock(
            this.value,
            ref.day,
            rangeToBlock(newRange, block),
            ref.index
          ),
          this.selected ? ref : undefined
        );
      }
    }
  }

  private _dayAction(
    ev: HaDropdownSelectEvent<"copy" | "clear"> &
      HASSDomCurrentTargetEvent<HTMLElement>
  ): void {
    const day = ev.currentTarget.dataset.day as ScheduleWeekday;
    if (ev.detail.item.value === "copy") {
      fireEvent(this, "schedule-day-copy", { day });
      return;
    }
    if (this.value) {
      this._commit(
        { ...this.value, [day]: [] },
        this.selected?.day === day ? undefined : this.selected
      );
    }
  }

  private async _commit(
    value: ScheduleWeek,
    selected?: ScheduleBlockRef
  ): Promise<void> {
    if (this.confirmChange && !(await this.confirmChange())) {
      return;
    }
    fireEvent(this, "value-changed", { value });
    this._select(selected);
  }

  private _select(block?: ScheduleBlockRef): void {
    fireEvent(this, "schedule-block-selected", { block });
  }

  static styles = css`
    :host {
      display: block;
      --schedule-track-height: var(--ha-space-10);
      --schedule-day-width: var(--ha-space-12);
      --schedule-menu-width: var(--ha-space-12);
    }

    :host([readonly]) {
      --schedule-menu-width: 0px;
    }

    .timeline {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-1);
      user-select: none;
      -webkit-user-select: none;
    }

    .axis {
      padding-inline-start: var(--schedule-day-width);
      padding-inline-end: var(--schedule-menu-width);
    }

    .scale {
      display: flex;
      justify-content: space-between;
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-xs);
      line-height: var(--ha-line-height-condensed);
    }

    /* Zero width anchors keep each label centered on its hour. */
    .tick {
      display: flex;
      justify-content: center;
      width: 0;
      white-space: nowrap;
    }

    .row {
      display: flex;
      align-items: center;
    }

    .day {
      flex: none;
      width: var(--schedule-day-width);
      color: var(--primary-text-color);
      font-size: var(--ha-font-size-s);
      font-weight: var(--ha-font-weight-medium);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .track {
      position: relative;
      flex: 1;
      min-width: 0;
      height: var(--schedule-track-height);
      border-radius: var(--ha-border-radius-md);
      background-color: var(--ha-color-fill-neutral-quiet-resting);
      background-image:
        linear-gradient(
          to right,
          var(--ha-color-border-neutral-normal) 1px,
          transparent 1px
        ),
        linear-gradient(
          to right,
          var(--ha-color-border-neutral-quiet) 1px,
          transparent 1px
        );
      background-size:
        25% 100%,
        calc(100% / 24) 100%;
      /* Vertical swipes scroll the page, horizontal drags edit blocks. */
      touch-action: pan-y;
      cursor: crosshair;
    }

    :host([readonly]) .track {
      cursor: default;
    }

    .block {
      position: absolute;
      top: var(--ha-space-1);
      bottom: var(--ha-space-1);
      inset-inline-start: var(--block-start);
      width: var(--block-width);
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--ha-space-1);
      min-width: var(--ha-space-1);
      border-radius: var(--ha-border-radius-sm);
      background-color: var(--ha-color-fill-primary-loud-resting);
      color: var(--ha-color-on-primary-loud);
      font-size: var(--ha-font-size-xs);
      font-weight: var(--ha-font-weight-medium);
      container-type: inline-size;
      cursor: grab;
      transition: box-shadow var(--ha-animation-duration-fast, 150ms)
        ease-in-out;
    }

    :host([readonly]) .block {
      cursor: pointer;
    }

    .block:hover {
      background-color: var(--ha-color-fill-primary-loud-hover);
    }

    .block.dragging {
      cursor: grabbing;
      background-color: var(--ha-color-fill-primary-loud-active);
    }

    .block.selected {
      box-shadow:
        0 0 0 2px var(--card-background-color, white),
        0 0 0 4px var(--ha-color-fill-primary-loud-resting);
    }

    .block:focus-visible {
      outline: 2px solid var(--ha-color-focus);
      outline-offset: 2px;
    }

    /* The block being edited gives way to its preview. */
    .block.replaced {
      opacity: 0.4;
    }

    /* A block that is not placed yet: drawn on a track or in the editor. */
    .block.ghost {
      background-color: var(--ha-color-fill-primary-quiet-resting);
      border: 2px dashed var(--ha-color-fill-primary-loud-resting);
      color: var(--ha-color-on-primary-quiet);
      pointer-events: none;
    }

    /* See-through, so the overlapped blocks stay visible. */
    .block.ghost.conflict {
      background-color: color-mix(
        in srgb,
        var(--ha-color-fill-danger-quiet-resting) 60%,
        transparent
      );
      border-color: var(--ha-color-border-danger-loud);
    }

    .block.ghost.conflict .label {
      display: none;
    }

    .label {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      pointer-events: none;
    }

    @container (max-width: 88px) {
      .label {
        display: none;
      }
    }

    .handle {
      position: absolute;
      top: 0;
      bottom: 0;
      inset-inline-start: 0;
      /* Narrow blocks keep half their width to move them. */
      width: min(var(--ha-space-2), 25%);
      cursor: ew-resize;
    }

    .handle.end {
      inset-inline-start: auto;
      inset-inline-end: 0;
    }

    .hit-area {
      display: none;
    }

    /* A 15-minute block is a few pixels wide on a phone. On touch screens,
       blocks get a tap area of at least 24px, and narrow ones drop their
       handles so dragging always moves them. Their times are changed in the
       editor. */
    @media (pointer: coarse) {
      .hit-area {
        display: block;
        position: absolute;
        top: 0;
        bottom: 0;
        inset-inline: min(0px, (100% - 24px) / 2);
      }

      @container (max-width: 47px) {
        .handle {
          display: none;
        }
      }
    }

    .shown-block {
      margin: var(--ha-space-2) 0 0;
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s);
    }

    ha-dropdown {
      flex: none;
      width: var(--schedule-menu-width);
      display: flex;
      justify-content: flex-end;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-schedule-timeline": HaScheduleTimeline;
  }

  interface HASSDomEvents {
    "schedule-block-selected": { block?: ScheduleBlockRef };
    "schedule-day-copy": { day: ScheduleWeekday };
  }
}
