import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { formatDateTimeWithSeconds } from "../../common/datetime/format_date_time";
import {
  AutomationTraceExtended,
  ChooseActionTraceStep,
  getDataFromPath,
  TriggerTraceStep,
  isTriggerPath,
} from "../../data/trace";
import { HomeAssistant } from "../../types";
import "./ha-timeline";
import type { HaTimeline } from "./ha-timeline";
import {
  mdiCircle,
  mdiCircleOutline,
  mdiPauseCircleOutline,
  mdiRecordCircleOutline,
} from "@mdi/js";
import { LogbookEntry } from "../../data/logbook";
import {
  ChooseAction,
  ChooseActionChoice,
  getActionType,
} from "../../data/script";
import relativeTime from "../../common/datetime/relative_time";
import { fireEvent } from "../../common/dom/fire_event";

const LOGBOOK_ENTRIES_BEFORE_FOLD = 2;

/* eslint max-classes-per-file: "off" */

// Report time entry when more than this time has passed
const SIGNIFICANT_TIME_CHANGE = 1000; // 1 seconds

const isSignificantTimeChange = (a: Date, b: Date) =>
  Math.abs(b.getTime() - a.getTime()) > SIGNIFICANT_TIME_CHANGE;

class RenderedTimeTracker {
  private lastReportedTime: Date;

  constructor(
    private hass: HomeAssistant,
    private entries: TemplateResult[],
    trace: AutomationTraceExtended
  ) {
    this.lastReportedTime = new Date(trace.timestamp.start);
  }

  setLastReportedTime(date: Date) {
    this.lastReportedTime = date;
  }

  renderTime(from: Date, to: Date): void {
    this.entries.push(html`
      <ha-timeline label>
        ${relativeTime(from, this.hass.localize, {
          compareTime: to,
          includeTense: false,
        })}
        later
      </ha-timeline>
    `);
    this.lastReportedTime = to;
  }

  maybeRenderTime(timestamp: Date): boolean {
    if (!isSignificantTimeChange(timestamp, this.lastReportedTime)) {
      this.lastReportedTime = timestamp;
      return false;
    }

    this.renderTime(this.lastReportedTime, timestamp);
    return true;
  }
}

class LogbookRenderer {
  private curIndex: number;

  private pendingItems: Array<[Date, LogbookEntry]> = [];

  constructor(
    private entries: TemplateResult[],
    private timeTracker: RenderedTimeTracker,
    private logbookEntries: LogbookEntry[]
  ) {
    // Skip the "automation got triggered item"
    this.curIndex =
      logbookEntries.length > 0 && logbookEntries[0].domain === "automation"
        ? 1
        : 0;
  }

  get curItem() {
    return this.logbookEntries[this.curIndex];
  }

  get hasNext() {
    return this.curIndex !== this.logbookEntries.length;
  }

  maybeRenderItem() {
    const logbookEntry = this.curItem;
    this.curIndex++;
    const entryDate = new Date(logbookEntry.when);

    if (this.pendingItems.length === 0) {
      this.pendingItems.push([entryDate, logbookEntry]);
      return;
    }

    const previousEntryDate = this.pendingItems[
      this.pendingItems.length - 1
    ][0];

    // If logbook entry is too long after the last one,
    // add a time passed label
    if (isSignificantTimeChange(previousEntryDate, entryDate)) {
      this._renderLogbookEntries();
      this.timeTracker.renderTime(previousEntryDate, entryDate);
    }

    this.pendingItems.push([entryDate, logbookEntry]);
  }

  flush() {
    if (this.pendingItems.length > 0) {
      this._renderLogbookEntries();
    }
  }

  private _renderLogbookEntries() {
    this.timeTracker.maybeRenderTime(this.pendingItems[0][0]);

    const parts: TemplateResult[] = [];

    let i;

    for (
      i = 0;
      i < Math.min(this.pendingItems.length, LOGBOOK_ENTRIES_BEFORE_FOLD);
      i++
    ) {
      parts.push(this._renderLogbookEntryHelper(this.pendingItems[i][1]));
    }

    let moreItems: TemplateResult[] | undefined;

    // If we didn't render all items, push rest into `moreItems`
    if (i < this.pendingItems.length) {
      moreItems = [];
      for (; i < this.pendingItems.length; i++) {
        moreItems.push(this._renderLogbookEntryHelper(this.pendingItems[i][1]));
      }
    }

    this.entries.push(html`
      <ha-timeline .icon=${mdiCircleOutline} .moreItems=${moreItems}>
        ${parts}
      </ha-timeline>
    `);

    // Clear rendered items.
    this.timeTracker.setLastReportedTime(
      this.pendingItems[this.pendingItems.length - 1][0]
    );
    this.pendingItems = [];
  }

  private _renderLogbookEntryHelper(entry: LogbookEntry) {
    return html`${entry.name} (${entry.entity_id})
      ${entry.message || `turned ${entry.state}`}<br />`;
  }
}

class ActionRenderer {
  private curIndex = 0;

  private keys: string[];

  constructor(
    private hass: HomeAssistant,
    private entries: TemplateResult[],
    private trace: AutomationTraceExtended,
    private logbookRenderer: LogbookRenderer,
    private timeTracker: RenderedTimeTracker
  ) {
    this.keys = Object.keys(trace.trace);
  }

  get curItem() {
    return this._getItem(this.curIndex);
  }

  get hasNext() {
    return this.curIndex !== this.keys.length;
  }

  renderItem() {
    this.curIndex = this._renderItem(this.curIndex);
  }

  private _getItem(index: number) {
    return this.trace.trace[this.keys[index]];
  }

  private _renderItem(
    index: number,
    actionType?: ReturnType<typeof getActionType>
  ): number {
    const value = this._getItem(index);

    if (isTriggerPath(value[0].path)) {
      return this._handleTrigger(index, value[0] as TriggerTraceStep);
    }

    const timestamp = new Date(value[0].timestamp);

    // Render all logbook items that are in front of this item.
    while (
      this.logbookRenderer.hasNext &&
      new Date(this.logbookRenderer.curItem.when) < timestamp
    ) {
      this.logbookRenderer.maybeRenderItem();
    }

    this.logbookRenderer.flush();
    this.timeTracker.maybeRenderTime(timestamp);

    const path = value[0].path;
    let data;
    try {
      data = getDataFromPath(this.trace.config, path);
    } catch (err) {
      this.entries.push(
        html`Unable to extract path ${path}. Download trace and report as bug`
      );
      return index + 1;
    }

    const isTopLevel = path.split("/").length === 2;

    if (!isTopLevel && !actionType) {
      this._renderEntry(path, path.replace(/\//g, " "));
      return index + 1;
    }

    if (!actionType) {
      actionType = getActionType(data);
    }

    if (actionType === "choose") {
      return this._handleChoose(index);
    }

    this._renderEntry(path, data.alias || actionType);
    return index + 1;
  }

  private _handleTrigger(index: number, triggerStep: TriggerTraceStep): number {
    this._renderEntry(
      triggerStep.path,
      `Triggered ${
        triggerStep.path === "trigger"
          ? "manually"
          : `by the ${triggerStep.changed_variables.trigger.description}`
      } at
    ${formatDateTimeWithSeconds(
      new Date(triggerStep.timestamp),
      this.hass.locale
    )}`,
      mdiCircle
    );
    return index + 1;
  }

  private _handleChoose(index: number): number {
    // startLevel: choose root config

    // +1: 'default
    // +2: executed sequence

    // +1: 'choose'
    // +2: current choice

    // +3: 'conditions'
    // +4: evaluated condition

    // +3: 'sequence'
    // +4: executed sequence

    const choosePath = this.keys[index];
    const startLevel = choosePath.split("/").length - 1;

    const chooseTrace = this._getItem(index)[0] as ChooseActionTraceStep;
    const defaultExecuted = chooseTrace.result.choice === "default";
    const chooseConfig = this._getDataFromPath(
      this.keys[index]
    ) as ChooseAction;
    const name = chooseConfig.alias || "Choose";

    if (defaultExecuted) {
      this._renderEntry(choosePath, `${name}: Default action executed`);
    } else {
      const choiceConfig = this._getDataFromPath(
        `${this.keys[index]}/choose/${chooseTrace.result.choice}`
      ) as ChooseActionChoice;
      const choiceName =
        choiceConfig.alias || `Choice ${chooseTrace.result.choice}`;
      this._renderEntry(choosePath, `${name}: ${choiceName} executed`);
    }

    let i;

    // Skip over conditions
    for (i = index + 1; i < this.keys.length; i++) {
      const parts = this.keys[i].split("/");

      // We're done if no more sequence in current level
      if (parts.length <= startLevel) {
        return i;
      }

      // We're going to skip all conditions
      if (parts[startLevel + 3] === "sequence") {
        break;
      }
    }

    // Render choice
    while (i < this.keys.length) {
      const path = this.keys[i];
      const parts = path.split("/");

      // We're done if no more sequence in current level
      if (parts.length <= startLevel) {
        return i;
      }

      // We know it's an action sequence, so force the type like that
      // for rendering.
      i = this._renderItem(i, getActionType(this._getDataFromPath(path)));
    }

    return i;
  }

  private _renderEntry(
    path: string,
    description: string,
    icon = mdiRecordCircleOutline
  ) {
    this.entries.push(html`
      <ha-timeline .icon=${icon} data-path=${path}>
        ${description}
      </ha-timeline>
    `);
  }

  private _getDataFromPath(path: string) {
    return getDataFromPath(this.trace.config, path);
  }
}

@customElement("hat-trace-timeline")
export class HaAutomationTracer extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trace?: AutomationTraceExtended;

  @property({ attribute: false }) public logbookEntries?: LogbookEntry[];

  @property({ attribute: false }) public selectedPath?: string;

  @property({ type: Boolean }) public allowPick = false;

  protected render(): TemplateResult {
    if (!this.trace) {
      return html``;
    }

    const entries: TemplateResult[] = [];

    const timeTracker = new RenderedTimeTracker(this.hass, entries, this.trace);
    const logbookRenderer = new LogbookRenderer(
      entries,
      timeTracker,
      this.logbookEntries || []
    );
    const actionRenderer = new ActionRenderer(
      this.hass,
      entries,
      this.trace,
      logbookRenderer,
      timeTracker
    );

    while (actionRenderer.hasNext) {
      actionRenderer.renderItem();
    }

    while (logbookRenderer.hasNext) {
      logbookRenderer.maybeRenderItem();
    }

    logbookRenderer.flush();

    // null means it was stopped by a condition
    if (this.trace.last_action !== null) {
      entries.push(html`
        <ha-timeline
          lastItem
          .icon=${this.trace.timestamp.finish
            ? mdiCircle
            : mdiPauseCircleOutline}
        >
          ${this.trace.timestamp.finish
            ? html`Finished at
              ${formatDateTimeWithSeconds(
                new Date(this.trace.timestamp.finish),
                this.hass.locale
              )}
              (runtime:
              ${(
                (new Date(this.trace.timestamp.finish!).getTime() -
                  new Date(this.trace.timestamp.start).getTime()) /
                1000
              ).toFixed(2)}
              seconds)`
            : "Still running"}
        </ha-timeline>
      `);
    }

    return html`${entries}`;
  }

  protected updated(props: PropertyValues) {
    super.updated(props);

    // Pick first path when we load a new trace.
    if (
      this.allowPick &&
      props.has("trace") &&
      this.trace &&
      this.selectedPath &&
      !(this.selectedPath in this.trace.trace)
    ) {
      const element = this.shadowRoot!.querySelector<HaTimeline>(
        "ha-timeline[data-path]"
      );
      if (element) {
        fireEvent(this, "value-changed", { value: element.dataset.path });
        this.selectedPath = element.dataset.path;
      }
    }

    if (props.has("trace") || props.has("selectedPath")) {
      this.shadowRoot!.querySelectorAll<HaTimeline>(
        "ha-timeline[data-path]"
      ).forEach((el) => {
        el.style.setProperty(
          "--timeline-ball-color",
          this.selectedPath === el.dataset.path ? "var(--primary-color)" : null
        );
        if (!this.allowPick || el.dataset.upgraded) {
          return;
        }
        el.dataset.upgraded = "1";
        el.addEventListener("click", () => {
          this.selectedPath = el.dataset.path;
          fireEvent(this, "value-changed", { value: el.dataset.path });
        });
        el.addEventListener("mouseover", () => {
          el.raised = true;
        });
        el.addEventListener("mouseout", () => {
          el.raised = false;
        });
      });
    }
  }

  static get styles(): CSSResult[] {
    return [
      css`
        ha-timeline[lastItem].condition {
          --timeline-ball-color: var(--error-color);
        }
        ha-timeline[data-path] {
          cursor: pointer;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hat-trace-timeline": HaAutomationTracer;
  }
}
