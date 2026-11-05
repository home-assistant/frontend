import { mdiPlus } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { keyed } from "lit/directives/keyed";
import { consume } from "../../../../common/decorators/consume";
import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import { fireEvent } from "../../../../common/dom/fire_event";
import { deepEqual } from "../../../../common/util/deep-equal";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import "../../../../components/ha-icon-picker";
import "../../../../components/ha-schedule-timeline";
import "../../../../components/ha-svg-icon";
import "../../../../components/input/ha-input";
import type { HaInput } from "../../../../components/input/ha-input";
import type { DirtyStateContext } from "../../../../data/context/dirty-state";
import { dirtyStateContext } from "../../../../data/context/dirty-state";
import type { EntityRegistryEntry } from "../../../../data/entity/entity_registry";
import type {
  Schedule,
  ScheduleBlock,
  ScheduleBlockPreview,
  ScheduleBlockRef,
  ScheduleWeek,
  ScheduleWeekday,
} from "../../../../data/schedule";
import {
  applyScheduleBlock,
  copyScheduleDay,
  fetchScheduleEntityWeek,
  formatScheduleWeekday,
  getScheduleWeek,
  removeScheduleBlock,
} from "../../../../data/schedule";
import { showConfirmationDialog } from "../../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant, ValueChangedEvent } from "../../../../types";
import "./ha-schedule-block-editor";
import "./ha-schedule-weekday-picker";

type SchedulePanel =
  | {
      type: "block";
      source?: ScheduleBlockRef;
      /** The editor's draft, shown on the timeline until it is applied. */
      preview?: ScheduleBlockPreview;
      /** Whether the editor has changes that are not applied yet. */
      dirty?: boolean;
    }
  | { type: "copy"; day: ScheduleWeekday; targets: ScheduleWeekday[] };

const panelKind = (panel?: SchedulePanel) =>
  !panel
    ? undefined
    : panel.type === "copy"
      ? "copy"
      : panel.source
        ? "edit"
        : "new";

const NEW_BLOCK: ScheduleBlock = { from: "08:00", to: "17:00" };

const DRAFT_DIRTY_KEY = "schedule-block-draft";

@customElement("ha-schedule-form")
class HaScheduleForm extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  /** Without an `id` when creating or duplicating a schedule. */
  @property({ attribute: false }) public item?: Partial<Schedule>;

  /** Set when shown in the entity settings, used to show YAML schedules. */
  @property({ attribute: false }) public entry?: EntityRegistryEntry;

  @property({ type: Boolean }) public new = false;

  @property({ type: Boolean }) public disabled = false;

  @state() private _week: ScheduleWeek = getScheduleWeek({});

  @state() private _panel?: SchedulePanel;

  /** Read-only week of a schedule that cannot be edited in the UI. */
  @state() private _readonlyWeek?: ScheduleWeek;

  @state() private _readonlyError = false;

  // Hosts warn before closing with unsaved changes, including block drafts.
  @consume({ context: dirtyStateContext, subscribe: true })
  private _dirtyState?: DirtyStateContext<boolean, typeof DRAFT_DIRTY_KEY>;

  private _draftDirty = false;

  @query("[dialogInitialFocus]") private _focusElement?: HaInput;

  @query(".panel") private _panelElement?: HTMLElement;

  public focus() {
    this.updateComplete.then(() => this._focusElement?.focus());
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._reportDraftDirty(false);
  }

  protected willUpdate(changedProps: PropertyValues<this>): void {
    super.willUpdate(changedProps);
    if (changedProps.has("item")) {
      if (this.item?.id !== changedProps.get("item")?.id) {
        this._panel = undefined;
      }
      // Hosts pass back the emitted value, and the settings tab re-fetches
      // the item. Only an actual change replaces the week, which resets an
      // open block editor.
      const week = getScheduleWeek(this.item ?? {});
      if (!deepEqual(week, this._week)) {
        this._week = week;
        if (panelKind(this._panel) === "edit") {
          this._panel = undefined;
        }
      }
    }
    if (
      (changedProps.has("entry") ||
        changedProps.has("disabled") ||
        // Fetch once `hass` arrives, if it came after the entry.
        (changedProps.has("hass") && !changedProps.get("hass"))) &&
      this.disabled &&
      this.entry &&
      this.hass
    ) {
      this._fetchReadonlyWeek(this.entry.entity_id);
    }
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!changedProps.has("_panel")) {
      return;
    }
    this._reportDraftDirty(
      this._panel?.type === "block" && !!this._panel.dirty
    );
    const oldPanel = changedProps.get("_panel") as SchedulePanel | undefined;
    if (this._panel && panelKind(this._panel) !== panelKind(oldPanel)) {
      this._panelElement?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }

  private _reportDraftDirty(dirty: boolean) {
    if (dirty === this._draftDirty) {
      return;
    }
    this._draftDirty = dirty;
    // The first value of a slice is its baseline, so it has to be clean.
    this._dirtyState?.setState(false, DRAFT_DIRTY_KEY);
    if (dirty) {
      this._dirtyState?.setState(true, DRAFT_DIRTY_KEY);
    }
  }

  private async _fetchReadonlyWeek(entityId: string) {
    this._readonlyError = false;
    try {
      this._readonlyWeek = await fetchScheduleEntityWeek(this.hass, entityId);
    } catch (_err) {
      this._readonlyWeek = undefined;
      this._readonlyError = true;
    }
  }

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    return html`
      <div class="form">
        <ha-input
          .value=${this.item?.name || ""}
          .configValue=${"name"}
          @input=${this._valueChanged}
          .label=${this.hass.localize("ui.dialogs.helper_settings.generic.name")}
          auto-validate
          required
          .validationMessage=${this.hass.localize(
            "ui.dialogs.helper_settings.required_error_msg"
          )}
          dialogInitialFocus
          .disabled=${this.disabled}
        ></ha-input>
        <ha-icon-picker
          .value=${this.item?.icon || ""}
          .configValue=${"icon"}
          @value-changed=${this._valueChanged}
          .label=${this.hass.localize("ui.dialogs.helper_settings.generic.icon")}
          .disabled=${this.disabled}
        ></ha-icon-picker>
        ${this.disabled ? this._renderReadonly() : this._renderEditor()}
      </div>
    `;
  }

  private _renderReadonly() {
    if (this._readonlyError) {
      return html`<ha-alert alert-type="error">
        ${this.hass.localize("ui.dialogs.helper_settings.schedule.error_load")}
      </ha-alert>`;
    }
    if (!this._readonlyWeek) {
      return nothing;
    }
    return html`
      <ha-schedule-timeline
        readonly
        .value=${this._readonlyWeek}
      ></ha-schedule-timeline>
      <p class="readonly-note">
        ${this.hass.localize("ui.dialogs.helper_settings.schedule.readonly_yaml")}
      </p>
    `;
  }

  private _renderEditor() {
    const panel = this._panel;
    const kind = panelKind(panel);
    return html`
      <div class="schedule">
        <ha-schedule-timeline
          .value=${this._week}
          .selected=${panel?.type === "block" ? panel.source : undefined}
          .preview=${panel?.type === "block" ? panel.preview : undefined}
          .confirmChange=${this._confirmTimelineChange}
          @value-changed=${this._weekChanged}
          @schedule-block-selected=${this._blockSelected}
          @schedule-day-copy=${this._copyDay}
        ></ha-schedule-timeline>
        <div class="toolbar">
          <ha-button
            appearance="filled"
            size="s"
            @click=${this._newBlock}
            .disabled=${kind === "new"}
          >
            <ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon>
            ${this.hass.localize("ui.dialogs.helper_settings.schedule.new_block")}
          </ha-button>
          <span class="hint">
            ${this.hass.localize(
              "ui.dialogs.helper_settings.schedule.timeline_hint"
            )}
          </span>
        </div>
        ${
          panel
            ? keyed(
                // A new panel element for each kind of panel replays the
                // fade-in, while switching between blocks keeps it.
                kind,
                html`<div class="panel">
                  <h3 class="panel-title">${this._panelTitle(panel)}</h3>
                  ${
                    panel.type === "block"
                      ? html`<ha-schedule-block-editor
                          .week=${this._week}
                          .block=${
                            panel.source
                              ? this._week[panel.source.day][panel.source.index]
                              : NEW_BLOCK
                          }
                          .source=${panel.source}
                          @schedule-block-draft-changed=${this._draftChanged}
                          @schedule-block-apply=${this._applyBlock}
                          @schedule-block-delete=${this._deleteBlock}
                          @schedule-block-close=${this._closePanel}
                        ></ha-schedule-block-editor>`
                      : this._renderCopyPanel(panel)
                  }
                </div>`
              )
            : nothing
        }
      </div>
    `;
  }

  private _panelTitle(panel: SchedulePanel) {
    const localize = this.hass.localize;
    if (panel.type === "copy") {
      return localize("ui.dialogs.helper_settings.schedule.copy_day_title", {
        day: formatScheduleWeekday(panel.day, this.hass.locale),
      });
    }
    return localize(
      panel.source
        ? "ui.dialogs.helper_settings.schedule.edit_block"
        : "ui.dialogs.helper_settings.schedule.new_block"
    );
  }

  private _renderCopyPanel(panel: Extract<SchedulePanel, { type: "copy" }>) {
    const localize = this.hass.localize;
    return html`
      <ha-schedule-weekday-picker
        .label=${localize("ui.dialogs.helper_settings.schedule.copy_day_to")}
        .value=${panel.targets}
        .exclude=${panel.day}
        @value-changed=${this._copyTargetsChanged}
      ></ha-schedule-weekday-picker>
      <p class="panel-note">
        ${localize("ui.dialogs.helper_settings.schedule.copy_day_replace")}
      </p>
      <div class="panel-actions">
        <ha-button appearance="plain" @click=${this._closePanel}>
          ${localize("ui.common.cancel")}
        </ha-button>
        <ha-button .disabled=${!panel.targets.length} @click=${this._applyCopy}>
          ${localize("ui.common.copy")}
        </ha-button>
      </div>
    `;
  }

  private _weekChanged(ev: ValueChangedEvent<ScheduleWeek>) {
    ev.stopPropagation();
    this._setWeek(ev.detail.value);
  }

  private async _blockSelected(
    ev: HASSDomEvent<HASSDomEvents["schedule-block-selected"]>
  ) {
    ev.stopPropagation();
    const source = ev.detail.block;
    const current =
      this._panel?.type === "block" ? this._panel.source : undefined;
    // Selecting the block being edited again keeps its unsaved changes.
    const sameBlock =
      current?.day === source?.day && current?.index === source?.index;
    if ((!source && !current) || sameBlock || !(await this._confirmDiscard())) {
      return;
    }
    this._panel = source ? { type: "block", source } : undefined;
  }

  private _draftChanged(
    ev: HASSDomEvent<HASSDomEvents["schedule-block-draft-changed"]>
  ) {
    ev.stopPropagation();
    if (this._panel?.type === "block") {
      this._panel = { ...this._panel, ...ev.detail };
    }
  }

  /**
   * Changes on the timeline replace or reset the block editor, so ask first
   * and only make them once its unapplied changes are discarded.
   */
  private _confirmTimelineChange = async (): Promise<boolean> => {
    if (!(await this._confirmDiscard())) {
      return false;
    }
    if (this._panel?.type === "block" && this._panel.dirty) {
      this._panel = undefined;
    }
    return true;
  };

  /** Ask before replacing a block editor that has changes not applied. */
  private async _confirmDiscard(): Promise<boolean> {
    if (this._panel?.type !== "block" || !this._panel.dirty) {
      return true;
    }
    const localize = this.hass.localize;
    return showConfirmationDialog(this, {
      title: localize("ui.dialogs.helper_settings.schedule.discard_title"),
      text: localize("ui.dialogs.helper_settings.schedule.discard_text"),
      confirmText: localize("ui.dialogs.helper_settings.schedule.discard"),
      dismissText: localize("ui.dialogs.helper_settings.schedule.keep_editing"),
      destructive: true,
    });
  }

  private async _newBlock() {
    if (await this._confirmDiscard()) {
      this._panel = { type: "block" };
    }
  }

  private async _copyDay(ev: HASSDomEvent<HASSDomEvents["schedule-day-copy"]>) {
    ev.stopPropagation();
    const day = ev.detail.day;
    if (await this._confirmDiscard()) {
      this._panel = { type: "copy", day, targets: [] };
    }
  }

  private _copyTargetsChanged(ev: ValueChangedEvent<ScheduleWeekday[]>) {
    ev.stopPropagation();
    if (this._panel?.type === "copy") {
      this._panel = { ...this._panel, targets: ev.detail.value };
    }
  }

  private _applyCopy() {
    if (this._panel?.type !== "copy") {
      return;
    }
    this._setWeek(
      copyScheduleDay(this._week, this._panel.day, this._panel.targets)
    );
    this._panel = undefined;
  }

  private _applyBlock(ev: HASSDomEvent<HASSDomEvents["schedule-block-apply"]>) {
    ev.stopPropagation();
    if (this._panel?.type !== "block") {
      return;
    }
    this._setWeek(
      applyScheduleBlock(
        this._week,
        ev.detail.block,
        ev.detail.days,
        this._panel.source
      )
    );
    this._panel = undefined;
  }

  private _deleteBlock(ev: Event) {
    ev.stopPropagation();
    if (this._panel?.type !== "block" || !this._panel.source) {
      return;
    }
    this._setWeek(removeScheduleBlock(this._week, this._panel.source));
    this._panel = undefined;
  }

  private _closePanel(ev: Event) {
    ev.stopPropagation();
    this._panel = undefined;
  }

  private _setWeek(week: ScheduleWeek) {
    this._week = week;
    // Close the block editor if its block is gone.
    const source = this._panel?.type === "block" && this._panel.source;
    if (source && !week[source.day][source.index]) {
      this._panel = undefined;
    }
    this._fireChanged({ ...this.item, ...week });
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const target = ev.target as HTMLElement & {
      configValue: "name" | "icon";
      value?: string;
    };
    const configValue = target.configValue;
    const value = ev.detail?.value || target.value;
    if ((this.item?.[configValue] || "") === (value || "")) {
      return;
    }
    const newValue: Partial<Schedule> = { ...this.item, [configValue]: value };
    if (!value) {
      delete newValue[configValue];
    }
    this._fireChanged(newValue);
  }

  private _fireChanged(value: Partial<Schedule>) {
    if (!this.new && !this.item) {
      return;
    }
    fireEvent(this, "value-changed", { value });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .form {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-4);
          color: var(--primary-text-color);
        }

        ha-input {
          --ha-input-padding-bottom: 0;
        }

        .schedule {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-3);
        }

        .toolbar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: var(--ha-space-2) var(--ha-space-4);
        }

        .hint {
          flex: 1;
          min-width: 200px;
          color: var(--secondary-text-color);
          font-size: var(--ha-font-size-s);
        }

        .panel {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-4);
          padding: var(--ha-space-4);
          border: 1px solid var(--ha-color-border-neutral-quiet);
          border-radius: var(--ha-border-radius-lg);
          animation: panel-in var(--ha-animation-duration-normal, 250ms)
            ease-out;
        }

        @keyframes panel-in {
          from {
            opacity: 0;
            transform: translateY(calc(-1 * var(--ha-space-2)));
          }
        }

        .panel-title {
          margin: 0;
          font-size: var(--ha-font-size-l);
          font-weight: var(--ha-font-weight-medium);
          line-height: var(--ha-line-height-condensed);
        }

        .readonly-note {
          margin: 0;
          color: var(--secondary-text-color);
          font-size: var(--ha-font-size-s);
        }

        .panel-note {
          margin: 0;
          color: var(--secondary-text-color);
          font-size: var(--ha-font-size-s);
        }

        .panel-actions {
          display: flex;
          justify-content: flex-end;
          gap: var(--ha-space-2);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-schedule-form": HaScheduleForm;
  }
}
