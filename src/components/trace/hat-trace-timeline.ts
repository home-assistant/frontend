import {
  mdiAlertCircle,
  mdiCircle,
  mdiCircleOutline,
  mdiProgressClock,
  mdiProgressWrench,
  mdiRecordCircleOutline,
} from "@mdi/js";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { formatDateTimeWithSeconds } from "../../common/datetime/format_date_time";
import { relativeTime } from "../../common/datetime/relative_time";
import { fireEvent } from "../../common/dom/fire_event";
import { toggleAttribute } from "../../common/dom/toggle_attribute";
import {
  EntityRegistryEntry,
  subscribeEntityRegistry,
} from "../../data/entity_registry";
import { LogbookEntry } from "../../data/logbook";
import {
  ChooseAction,
  ChooseActionChoice,
  getActionType,
  IfAction,
  ParallelAction,
  RepeatAction,
} from "../../data/script";
import { describeAction } from "../../data/script_i18n";
import {
  ActionTraceStep,
  AutomationTraceExtended,
  ChooseActionTraceStep,
  getDataFromPath,
  IfActionTraceStep,
  isTriggerPath,
  TriggerTraceStep,
} from "../../data/trace";
import { HomeAssistant } from "../../types";
import "./ha-timeline";
import type { HaTimeline } from "./ha-timeline";

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
        ${relativeTime(from, this.hass.locale, to, false)} later
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
    return this.curIndex < this.logbookEntries.length;
  }

  maybeRenderItem() {
    const logbookEntry = this.curItem;
    this.curIndex++;
    const entryDate = new Date(logbookEntry.when * 1000);

    if (this.pendingItems.length === 0) {
      this.pendingItems.push([entryDate, logbookEntry]);
      return;
    }

    const previousEntryDate =
      this.pendingItems[this.pendingItems.length - 1][0];

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
    private entityReg: EntityRegistryEntry[],
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
    return this.curIndex < this.keys.length;
  }

  renderItem() {
    this.curIndex = this._renderItem(this.curIndex);
  }

  private _getItem(index: number) {
    return this.trace.trace[this.keys[index]];
  }

  private _renderItem(
    index: number,
    actionType?: ReturnType<typeof getActionType>,
    renderAllIterations?: boolean
  ): number {
    const value = this._getItem(index);

    if (renderAllIterations) {
      let i;
      value.forEach((item) => {
        i = this._renderIteration(index, item, actionType);
      });
      return i;
    }
    return this._renderIteration(index, value[0], actionType);
  }

  private _renderIteration(
    index: number,
    value: ActionTraceStep,
    actionType?: ReturnType<typeof getActionType>
  ) {
    if (isTriggerPath(value.path)) {
      return this._handleTrigger(index, value as TriggerTraceStep);
    }

    const timestamp = new Date(value.timestamp);

    // Render all logbook items that are in front of this item.
    while (
      this.logbookRenderer.hasNext &&
      new Date(this.logbookRenderer.curItem.when * 1000) < timestamp
    ) {
      this.logbookRenderer.maybeRenderItem();
    }

    this.logbookRenderer.flush();
    this.timeTracker.maybeRenderTime(timestamp);

    const path = value.path;
    let data;
    try {
      data = getDataFromPath(this.trace.config, path);
    } catch (err: any) {
      this._renderEntry(
        path,
        `Unable to extract path ${path}. Download trace and report as bug`
      );
      return index + 1;
    }

    const parts = path.split("/");
    const isTopLevel = parts.length === 2;

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

    if (actionType === "repeat") {
      return this._handleRepeat(index);
    }

    if (actionType === "if") {
      return this._handleIf(index);
    }

    if (actionType === "parallel") {
      return this._handleParallel(index);
    }

    this._renderEntry(
      path,
      describeAction(this.hass, this.entityReg, data, actionType),
      undefined,
      data.enabled === false
    );

    let i = index + 1;

    for (; i < this.keys.length; i++) {
      if (this.keys[i].split("/").length === parts.length) {
        break;
      }
    }

    return i;
  }

  private _handleTrigger(index: number, triggerStep: TriggerTraceStep): number {
    this._renderEntry(
      triggerStep.path,
      `${
        triggerStep.changed_variables.trigger.alias
          ? `${triggerStep.changed_variables.trigger.alias} triggered`
          : "Triggered"
      } ${
        triggerStep.path === "trigger"
          ? "manually"
          : `by the ${this.trace.trigger}`
      } at
    ${formatDateTimeWithSeconds(
      new Date(triggerStep.timestamp),
      this.hass.locale,
      this.hass.config
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
    const startLevel = choosePath.split("/").length;

    const chooseTrace = this._getItem(index)[0] as ChooseActionTraceStep;
    const defaultExecuted = chooseTrace.result?.choice === "default";
    const chooseConfig = this._getDataFromPath(
      this.keys[index]
    ) as ChooseAction;
    const disabled = chooseConfig.enabled === false;
    const name = chooseConfig.alias || "Choose";

    if (defaultExecuted) {
      this._renderEntry(
        choosePath,
        `${name}: Default action executed`,
        undefined,
        disabled
      );
    } else if (chooseTrace.result) {
      const choiceNumeric =
        chooseTrace.result.choice !== "default"
          ? chooseTrace.result.choice + 1
          : undefined;
      const choiceConfig = this._getDataFromPath(
        `${this.keys[index]}/choose/${chooseTrace.result.choice}`
      ) as ChooseActionChoice | undefined;
      const choiceName = choiceConfig
        ? `${choiceConfig.alias || `Option ${choiceNumeric}`} executed`
        : `Error: ${chooseTrace.error}`;
      this._renderEntry(
        choosePath,
        `${name}: ${choiceName}`,
        undefined,
        disabled
      );
    } else {
      this._renderEntry(
        choosePath,
        `${name}: No action taken`,
        undefined,
        disabled
      );
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
      if (
        (defaultExecuted && parts[startLevel + 1] === "default") ||
        (!defaultExecuted && parts[startLevel + 3] === "sequence")
      ) {
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

  private _handleRepeat(index: number): number {
    const repeatPath = this.keys[index];
    const startLevel = repeatPath.split("/").length;

    const repeatConfig = this._getDataFromPath(
      this.keys[index]
    ) as RepeatAction;
    const disabled = repeatConfig.enabled === false;

    const name =
      repeatConfig.alias ||
      describeAction(this.hass, this.entityReg, repeatConfig);

    this._renderEntry(repeatPath, name, undefined, disabled);

    let i;

    for (i = index + 1; i < this.keys.length; i++) {
      const path = this.keys[i];
      const parts = path.split("/");

      // We're done if no more sequence in current level
      if (parts.length <= startLevel) {
        return i;
      }

      i = this._renderItem(i, getActionType(this._getDataFromPath(path)), true);
    }

    return i;
  }

  private _handleIf(index: number): number {
    const ifPath = this.keys[index];
    const startLevel = ifPath.split("/").length;

    const ifTrace = this._getItem(index)[0] as IfActionTraceStep;
    const ifConfig = this._getDataFromPath(this.keys[index]) as IfAction;
    const disabled = ifConfig.enabled === false;
    const name = ifConfig.alias || "If";

    if (ifTrace.result?.choice) {
      const choiceConfig = this._getDataFromPath(
        `${this.keys[index]}/${ifTrace.result.choice}/`
      ) as any;
      const choiceName = choiceConfig
        ? `${choiceConfig.alias || `${ifTrace.result.choice} action executed`}`
        : `Error: ${ifTrace.error}`;
      this._renderEntry(ifPath, `${name}: ${choiceName}`, undefined, disabled);
    } else {
      this._renderEntry(
        ifPath,
        `${name}: No action taken`,
        undefined,
        disabled
      );
    }

    let i;

    // Skip over conditions
    for (i = index + 1; i < this.keys.length; i++) {
      const path = this.keys[i];
      const parts = this.keys[i].split("/");

      // We're done if no more sequence in current level
      if (parts.length <= startLevel) {
        return i;
      }

      // We're going to skip all conditions
      if (
        parts[startLevel + 1] === "condition" ||
        parts.length < startLevel + 2
      ) {
        continue;
      }

      i = this._renderItem(i, getActionType(this._getDataFromPath(path)));
    }

    return i;
  }

  private _handleParallel(index: number): number {
    const parallelPath = this.keys[index];
    const startLevel = parallelPath.split("/").length;

    const parallelConfig = this._getDataFromPath(
      this.keys[index]
    ) as ParallelAction;

    const disabled = parallelConfig.enabled === false;

    const name = parallelConfig.alias || "Execute in parallel";

    this._renderEntry(parallelPath, name, undefined, disabled);

    let i;

    for (i = index + 1; i < this.keys.length; i++) {
      const path = this.keys[i];
      const parts = path.split("/");

      // We're done if no more sequence in current level
      if (parts.length <= startLevel) {
        return i;
      }

      i = this._renderItem(i, getActionType(this._getDataFromPath(path)));
    }

    return i;
  }

  private _renderEntry(
    path: string,
    description: string,
    icon = mdiRecordCircleOutline,
    disabled = false
  ) {
    this.entries.push(html`
      <ha-timeline .icon=${icon} data-path=${path} .notEnabled=${disabled}>
        ${description}${disabled
          ? html`<span class="disabled"> (disabled)</span>`
          : ""}
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

  @state() private _entityReg: EntityRegistryEntry[] = [];

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeEntityRegistry(this.hass.connection!, (entities) => {
        this._entityReg = entities;
      }),
    ];
  }

  protected render() {
    if (!this.trace) {
      return nothing;
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
      this._entityReg,
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

    // Render footer
    const renderFinishedAt = () =>
      formatDateTimeWithSeconds(
        new Date(this.trace!.timestamp.finish!),
        this.hass.locale,
        this.hass.config
      );
    const renderRuntime = () => `(runtime:
      ${(
        (new Date(this.trace!.timestamp.finish!).getTime() -
          new Date(this.trace!.timestamp.start).getTime()) /
        1000
      ).toFixed(2)}
      seconds)`;

    let entry: {
      description: TemplateResult | string;
      icon: string;
      className?: string;
    };

    if (this.trace.state === "running") {
      entry = {
        description: "Still running",
        icon: mdiProgressClock,
      };
    } else if (this.trace.state === "debugged") {
      entry = {
        description: "Debugged",
        icon: mdiProgressWrench,
      };
    } else if (this.trace.script_execution === "finished") {
      entry = {
        description: `Finished at ${renderFinishedAt()} ${renderRuntime()}`,
        icon: mdiCircle,
      };
    } else if (this.trace.script_execution === "aborted") {
      entry = {
        description: `Aborted at ${renderFinishedAt()} ${renderRuntime()}`,
        icon: mdiAlertCircle,
      };
    } else if (this.trace.script_execution === "cancelled") {
      entry = {
        description: `Cancelled at ${renderFinishedAt()} ${renderRuntime()}`,
        icon: mdiAlertCircle,
      };
    } else {
      let reason: string;
      let isError = false;
      let extra: TemplateResult | undefined;

      switch (this.trace.script_execution) {
        case "failed_conditions":
          reason = "a condition failed";
          break;
        case "failed_single":
          reason = "only a single execution is allowed";
          break;
        case "failed_max_runs":
          reason = "maximum number of parallel runs reached";
          break;
        case "error":
          reason = "an error was encountered";
          isError = true;
          extra = html`<br /><br />${this.trace.error!}`;
          break;
        default:
          reason = `of unknown reason "${this.trace.script_execution}"`;
          isError = true;
      }

      entry = {
        description: html`Stopped because ${reason} at ${renderFinishedAt()}
        ${renderRuntime()}${extra || ""}`,
        icon: mdiAlertCircle,
        className: isError ? "error" : undefined,
      };
    }

    entries.push(html`
      <ha-timeline
        lastItem
        .icon=${entry.icon}
        class=${ifDefined(entry.className)}
      >
        ${entry.description}
      </ha-timeline>
    `);

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
        toggleAttribute(el, "selected", this.selectedPath === el.dataset.path);
        if (!this.allowPick || el.tabIndex === 0) {
          return;
        }
        el.tabIndex = 0;
        const selectEl = () => {
          this.selectedPath = el.dataset.path;
          fireEvent(this, "value-changed", { value: el.dataset.path });
        };
        el.addEventListener("click", selectEl);
        el.addEventListener("keydown", (ev: KeyboardEvent) => {
          if (ev.key === "Enter" || ev.key === " ") {
            selectEl();
          }
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

  static get styles(): CSSResultGroup {
    return [
      css`
        ha-timeline[lastItem].condition {
          --timeline-ball-color: var(--error-color);
        }
        ha-timeline[data-path] {
          cursor: pointer;
        }
        ha-timeline[selected] {
          --timeline-ball-color: var(--primary-color);
        }
        ha-timeline:focus {
          outline: none;
          --timeline-ball-color: var(--accent-color);
        }
        .error {
          --timeline-ball-color: var(--error-color);
          color: var(--error-color);
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
