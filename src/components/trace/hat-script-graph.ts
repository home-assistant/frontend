import {
  mdiArrowDecision,
  mdiCallMissed,
  mdiCallReceived,
  mdiCallSplit,
  mdiCheckboxBlankOutline,
  mdiCheckboxMarkedOutline,
  mdiChevronDown,
  mdiChevronUp,
  mdiClose,
  mdiCodeBrackets,
  mdiFormatListNumbered,
  mdiRefresh,
  mdiRoomService,
  mdiShuffleDisabled,
} from "@mdi/js";
import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query } from "lit/decorators";
import { ensureArray } from "../../common/array/ensure-array";
import { fireEvent } from "../../common/dom/fire_event";
import type {
  Condition,
  PlatformTrigger,
  Trigger,
} from "../../data/automation";
import {
  expandConditionWithShorthand,
  flattenTriggers,
} from "../../data/automation";
import type {
  Action,
  ChooseAction,
  IfAction,
  ManualScriptConfig,
  ParallelAction,
  RepeatAction,
  SequenceAction,
  ServiceAction,
  WaitAction,
  WaitForTriggerAction,
} from "../../data/script";
import type {
  ChooseActionTraceStep,
  ConditionTraceStep,
  IfActionTraceStep,
  TraceExtended,
} from "../../data/trace";
import "../ha-icon-button";
import "../ha-condition-icon";
import "../ha-service-icon";
import "../ha-trigger-icon";
import "./hat-graph-branch";
import { BRANCH_HEIGHT, NODE_SIZE, SPACING } from "./hat-graph-const";
import "./hat-graph-node";
import "./hat-graph-spacer";
import { ACTION_ICONS, getAutomationActionType } from "../../data/action";
import { CONDITION_BUILDING_BLOCKS } from "../../data/condition";

type NodeType = "trigger" | "condition" | "action" | "chooseOption" | undefined;

export interface NodeInfo {
  path: string;
  config: any;
  type?: NodeType;
}

declare global {
  interface HASSDomEvents {
    "graph-node-selected": NodeInfo;
  }
}

@customElement("hat-script-graph")
export class HatScriptGraph extends LitElement {
  @property({ attribute: false }) public trace!: TraceExtended;

  @property({ attribute: false }) public selected?: string;

  @query("hat-graph-node[active], hat-graph-branch[active]")
  private _activeNode?: HTMLElement;

  public renderedNodes: Record<string, NodeInfo> = {};

  public trackedNodes: Record<string, NodeInfo> = {};

  private _hasError(path: string) {
    return !!this.trace?.trace[path]?.some((tr) => tr.error);
  }

  private _selectNode(config, path, type?) {
    return () => {
      fireEvent(this, "graph-node-selected", { config, path, type });
    };
  }

  private _renderTrigger(config: Trigger, i: number) {
    const path = `trigger/${i}`;
    const tracked = this.trace && path in this.trace.trace;
    // A not-triggered trace records the trigger that evaluated a change but
    // decided not to fire. It is still selectable (to view the reason), but
    // must not be shown as the path that ran.
    const notTriggered = !!(tracked && this.trace.not_triggered);
    const track = tracked && !notTriggered;
    this.renderedNodes[path] = { config, path, type: "trigger" };
    if (tracked) {
      this.trackedNodes[path] = this.renderedNodes[path];
    }
    return html`
      <hat-graph-node
        graph-start
        ?track=${track}
        ?not-triggered=${notTriggered}
        @focus=${this._selectNode(config, path, "trigger")}
        ?active=${this.selected === path}
        .notEnabled=${"enabled" in config && config.enabled === false}
        .error=${this._hasError(path)}
        tabindex=${tracked ? "0" : "-1"}
      >
        <ha-trigger-icon
          slot="icon"
          .trigger=${
            (config as PlatformTrigger).trigger ??
            (config as PlatformTrigger).platform
          }
        ></ha-trigger-icon>
      </hat-graph-node>
    `;
  }

  private _renderCondition(config: Condition, i: number) {
    const path = `condition/${i}`;
    this.renderedNodes[path] = { config, path, type: "condition" };
    if (this.trace && path in this.trace.trace) {
      this.trackedNodes[path] = this.renderedNodes[path];
    }
    return this._renderConditionNode(config, path);
  }

  private _typeRenderers = {
    condition: this._renderConditionActionNode,
    service: this._renderServiceNode,
    wait_template: this._renderWaitNode,
    wait_for_trigger: this._renderWaitNode,
    repeat: this._renderRepeatNode,
    choose: this._renderChooseNode,
    if: this._renderIfNode,
    sequence: this._renderSequenceNode,
    parallel: this._renderParallelNode,
    other: this._renderOtherNode,
  };

  private _renderActionNode(
    node: Action,
    path: string,
    graphStart = false,
    disabled = false
  ) {
    const type = getAutomationActionType(node) ?? "other";
    this.renderedNodes[path] = { config: node, path, type: "action" };
    if (this.trace && path in this.trace.trace) {
      this.trackedNodes[path] = this.renderedNodes[path];
    }
    return (this._typeRenderers[type] ?? this._renderOtherNode).bind(this)(
      node,
      path,
      graphStart,
      disabled
    );
  }

  // A branch can be missing the result that names it (parallel runs can drop
  // it), so fall back to whether any of its steps were traced.
  private _hasTracedSteps(pathPrefix: string) {
    return Object.keys(this.trace.trace).some((tracePath) =>
      tracePath.startsWith(pathPrefix)
    );
  }

  /**
   * A branch is only finished if its last configured step was reached. A run
   * that raised part way through leaves the later steps untraced, so the paths
   * leaving the branch must not be drawn as taken.
   */
  private _branchFinished(pathPrefix: string, steps: unknown[]) {
    return (
      steps.length === 0 ||
      `${pathPrefix}${steps.length - 1}` in this.trace.trace
    );
  }

  private _renderChooseNode(
    config: ChooseAction,
    path: string,
    graphStart = false,
    disabled = false
  ) {
    const trace = this.trace.trace[path] as ChooseActionTraceStep[] | undefined;
    const tracePath = trace
      ? trace.map((trc) =>
          trc.result === undefined || trc.result.choice === "default"
            ? "default"
            : trc.result.choice
        )
      : [];
    const trackDefault =
      tracePath.includes("default") || this._hasTracedSteps(`${path}/default/`);
    return html`
      <hat-graph-branch
        tabindex=${trace === undefined ? "-1" : "0"}
        @focus=${this._selectNode(config, path, "action")}
        ?track=${trace !== undefined}
        ?active=${this.selected === path}
        .notEnabled=${disabled || config.enabled === false}
      >
        <hat-graph-node
          .graphStart=${graphStart}
          .iconPath=${mdiArrowDecision}
          building-block
          ?track=${trace !== undefined}
          ?active=${this.selected === path}
          .notEnabled=${disabled || config.enabled === false}
          .error=${this._hasError(path)}
          slot="head"
          nofocus
        ></hat-graph-node>

        ${
          config.choose
            ? ensureArray(config.choose)?.map((branch, i) => {
                const branchPath = `${path}/choose/${i}`;
                const trackThis =
                  tracePath.includes(i) ||
                  this._hasTracedSteps(`${branchPath}/sequence/`);
                this.renderedNodes[branchPath] = {
                  config: branch,
                  path: branchPath,
                  type: "chooseOption",
                };
                if (trackThis) {
                  this.trackedNodes[branchPath] =
                    this.renderedNodes[branchPath];
                }
                const branchSteps = ensureArray<Action>(branch.sequence ?? []);
                return html`
                  <div
                    class="graph-container"
                    ?track=${trackThis}
                    ?unfinished=${
                      trackThis &&
                      !this._branchFinished(
                        `${branchPath}/sequence/`,
                        branchSteps
                      )
                    }
                  >
                    <hat-graph-node
                      .iconPath=${
                        !trace || trackThis
                          ? mdiCheckboxMarkedOutline
                          : mdiCheckboxBlankOutline
                      }
                      @focus=${this._selectNode(
                        branch,
                        branchPath,
                        "chooseOption"
                      )}
                      ?track=${trackThis}
                      ?active=${this.selected === branchPath}
                      .notEnabled=${disabled || config.enabled === false}
                    ></hat-graph-node>
                    ${
                      branch.sequence !== null
                        ? ensureArray<Action>(branch.sequence).map(
                            (action, j) =>
                              this._renderActionNode(
                                action,
                                `${branchPath}/sequence/${j}`,
                                false,
                                disabled || config.enabled === false
                              )
                          )
                        : ""
                    }
                  </div>
                `;
              })
            : ""
        }
        <div ?track=${trackDefault}>
          <hat-graph-spacer ?track=${trackDefault}></hat-graph-spacer>
          ${
            config.default !== null
              ? ensureArray<Action | undefined>(config.default)?.map(
                  (action, i) =>
                    this._renderActionNode(
                      action,
                      `${path}/default/${i}`,
                      false,
                      disabled || config.enabled === false
                    )
                )
              : ""
          }
        </div>
      </hat-graph-branch>
    `;
  }

  private _renderIfNode(
    config: IfAction,
    path: string,
    graphStart = false,
    disabled = false
  ) {
    const trace = this.trace.trace[path] as IfActionTraceStep[] | undefined;
    let trackThen = false;
    let trackElse = false;
    for (const trc of trace || []) {
      if (!trackThen && trc.result?.choice === "then") {
        trackThen = true;
      }
      if ((!trackElse && trc.result?.choice === "else") || !trc.result) {
        trackElse = true;
      }
      if (trackElse && trackThen) {
        break;
      }
    }
    trackThen = trackThen || this._hasTracedSteps(`${path}/then/`);
    trackElse = trackElse || this._hasTracedSteps(`${path}/else/`);
    return html`
      <hat-graph-branch
        tabindex=${trace === undefined ? "-1" : "0"}
        @focus=${this._selectNode(config, path, "action")}
        ?track=${trace !== undefined}
        ?active=${this.selected === path}
        .notEnabled=${disabled || config.enabled === false}
      >
        <hat-graph-node
          .graphStart=${graphStart}
          .iconPath=${mdiCallSplit}
          building-block
          ?track=${trace !== undefined}
          ?active=${this.selected === path}
          .notEnabled=${disabled || config.enabled === false}
          .error=${this._hasError(path)}
          slot="head"
          nofocus
        ></hat-graph-node>
        ${
          config.else
            ? html`<div
                class="graph-container"
                ?track=${trackElse}
                ?unfinished=${
                  trackElse &&
                  !this._branchFinished(
                    `${path}/else/`,
                    ensureArray<Action>(config.else ?? [])
                  )
                }
              >
                <hat-graph-node
                  .iconPath=${mdiCallMissed}
                  ?track=${trackElse}
                  ?active=${this.selected === path}
                  .notEnabled=${disabled || config.enabled === false}
                  nofocus
                ></hat-graph-node
                >${ensureArray<Action>(config.else).map((action, j) =>
                  this._renderActionNode(
                    action,
                    `${path}/else/${j}`,
                    false,
                    disabled || config.enabled === false
                  )
                )}
              </div>`
            : html`<hat-graph-spacer ?track=${trackElse}></hat-graph-spacer>`
        }
        <div
          class="graph-container"
          ?track=${trackThen}
          ?unfinished=${
            trackThen &&
            !this._branchFinished(
              `${path}/then/`,
              ensureArray<Action>(config.then ?? [])
            )
          }
        >
          <hat-graph-node
            .iconPath=${mdiCallReceived}
            ?track=${trackThen}
            ?active=${this.selected === path}
            .notEnabled=${disabled || config.enabled === false}
            nofocus
          ></hat-graph-node>
          ${ensureArray<Action>(config.then ?? []).map((action, j) =>
            this._renderActionNode(
              action,
              `${path}/then/${j}`,
              false,
              disabled || config.enabled === false
            )
          )}
        </div>
      </hat-graph-branch>
    `;
  }

  // A condition used as an action shows the generic condition icon, like the
  // action row in the editor does.
  private _renderConditionActionNode(
    node: Condition,
    path: string,
    graphStart = false,
    disabled = false
  ) {
    return this._renderConditionNode(
      node,
      path,
      graphStart,
      disabled,
      ACTION_ICONS.condition
    );
  }

  private _renderConditionNode(
    node: Condition,
    path: string,
    graphStart = false,
    disabled = false,
    iconPath?: string
  ) {
    const condition = expandConditionWithShorthand(node).condition;
    const trace = this.trace.trace[path] as ConditionTraceStep[] | undefined;
    let track = false;
    let trackPass = false;
    let trackFailed = false;
    if (trace) {
      for (const trc of trace) {
        if (trc.result) {
          track = true;
          if (trc.result.result) {
            trackPass = true;
          } else {
            trackFailed = true;
          }
        }
        if (trackPass && trackFailed) {
          break;
        }
      }
    }
    return html`
      <hat-graph-branch
        @focus=${this._selectNode(node, path, "condition")}
        ?track=${track}
        ?active=${this.selected === path}
        .notEnabled=${disabled || node.enabled === false}
        tabindex=${trace === undefined ? "-1" : "0"}
        short
      >
        <hat-graph-node
          .graphStart=${graphStart}
          slot="head"
          ?track=${track}
          ?active=${this.selected === path}
          .notEnabled=${disabled || node.enabled === false}
          .error=${this._hasError(path)}
          .iconPath=${iconPath}
          ?building-block=${
            !iconPath && CONDITION_BUILDING_BLOCKS.includes(condition)
          }
          nofocus
        >
          ${
            iconPath
              ? nothing
              : html`<ha-condition-icon
                  slot="icon"
                  .condition=${condition}
                ></ha-condition-icon>`
          }
        </hat-graph-node>
        <div
          style=${`width: ${NODE_SIZE + SPACING}px;`}
          graph-start
          graph-end
        ></div>
        <div ?track=${trackPass}></div>
        <hat-graph-node
          .iconPath=${mdiClose}
          nofocus
          ?track=${trackFailed}
          ?active=${this.selected === path}
          .notEnabled=${disabled || node.enabled === false}
        ></hat-graph-node>
      </hat-graph-branch>
    `;
  }

  private _renderRepeatNode(
    node: RepeatAction,
    path: string,
    graphStart = false,
    disabled = false
  ) {
    const trace: any = this.trace.trace[path];
    const repeats = this.trace?.trace[`${path}/repeat/sequence/0`]?.length;
    const sequencePath = `${path}/repeat/sequence/`;
    const trackSequence = this._hasTracedSteps(sequencePath);
    return html`
      <hat-graph-branch
        tabindex=${trace === undefined ? "-1" : "0"}
        @focus=${this._selectNode(node, path, "action")}
        ?track=${path in this.trace.trace}
        ?active=${this.selected === path}
        .notEnabled=${disabled || node.enabled === false}
      >
        <hat-graph-node
          .graphStart=${graphStart}
          .iconPath=${mdiRefresh}
          building-block
          ?track=${path in this.trace.trace}
          ?active=${this.selected === path}
          .notEnabled=${disabled || node.enabled === false}
          .error=${this._hasError(path)}
          .badge=${repeats > 1 ? repeats : undefined}
          slot="head"
          nofocus
        ></hat-graph-node>
        <div class="repeat-sequence" ?track=${trackSequence}>
          ${ensureArray<Action>(node.repeat.sequence).map((action, i) =>
            this._renderActionNode(
              action,
              `${path}/repeat/sequence/${i}`,
              false,
              disabled || node.enabled === false
            )
          )}
        </div>
      </hat-graph-branch>
    `;
  }

  private _renderServiceNode(
    node: ServiceAction,
    path: string,
    graphStart = false,
    disabled = false
  ) {
    return html`
      <hat-graph-node
        .graphStart=${graphStart}
        .iconPath=${node.action ? undefined : mdiRoomService}
        @focus=${this._selectNode(node, path, "action")}
        ?track=${path in this.trace.trace}
        ?active=${this.selected === path}
        .notEnabled=${disabled || node.enabled === false}
        .error=${this._hasError(path)}
        tabindex=${this.trace && path in this.trace.trace ? "0" : "-1"}
      >
        ${
          node.action
            ? html`<ha-service-icon
                slot="icon"
                .service=${node.action}
              ></ha-service-icon>`
            : nothing
        }
      </hat-graph-node>
    `;
  }

  private _renderWaitNode(
    node: WaitAction | WaitForTriggerAction,
    path: string,
    graphStart = false,
    disabled = false
  ) {
    return html`
      <hat-graph-node
        .graphStart=${graphStart}
        .iconPath=${
          ACTION_ICONS[
            "wait_for_trigger" in node ? "wait_for_trigger" : "wait_template"
          ]
        }
        ?building-block=${"wait_for_trigger" in node}
        @focus=${this._selectNode(node, path, "action")}
        ?track=${path in this.trace.trace}
        ?active=${this.selected === path}
        .notEnabled=${disabled || node.enabled === false}
        .error=${this._hasError(path)}
        tabindex=${this.trace && path in this.trace.trace ? "0" : "-1"}
      ></hat-graph-node>
    `;
  }

  private _renderSequenceNode(
    node: SequenceAction,
    path: string,
    graphStart = false,
    disabled = false
  ) {
    const trace: any = this.trace.trace[path];
    return html`
      <hat-graph-branch
        tabindex=${trace === undefined ? "-1" : "0"}
        @focus=${this._selectNode(node, path, "action")}
        ?track=${path in this.trace.trace}
        ?active=${this.selected === path}
        .notEnabled=${disabled || node.enabled === false}
      >
        <div class="graph-container" ?track=${path in this.trace.trace}>
          <hat-graph-node
            .graphStart=${graphStart}
            .iconPath=${mdiFormatListNumbered}
            building-block
            ?track=${path in this.trace.trace}
            ?active=${this.selected === path}
            .notEnabled=${disabled || node.enabled === false}
            .error=${this._hasError(path)}
            slot="head"
            nofocus
          ></hat-graph-node>
          ${ensureArray(node.sequence ?? []).map((action, i) =>
            this._renderActionNode(
              action,
              `${path}/sequence/${i}`,
              false,
              disabled || node.enabled === false
            )
          )}
        </div>
      </hat-graph-branch>
    `;
  }

  private _renderParallelNode(
    node: ParallelAction,
    path: string,
    graphStart = false,
    disabled = false
  ) {
    const trace: any = this.trace.trace[path];
    return html`
      <hat-graph-branch
        tabindex=${trace === undefined ? "-1" : "0"}
        @focus=${this._selectNode(node, path, "action")}
        ?track=${path in this.trace.trace}
        ?active=${this.selected === path}
        .notEnabled=${disabled || node.enabled === false}
      >
        <hat-graph-node
          .graphStart=${graphStart}
          .iconPath=${mdiShuffleDisabled}
          building-block
          ?track=${path in this.trace.trace}
          ?active=${this.selected === path}
          .notEnabled=${disabled || node.enabled === false}
          .error=${this._hasError(path)}
          slot="head"
          nofocus
        ></hat-graph-node>
        ${ensureArray<Action>(node.parallel).map((action, i) => {
          if (!("sequence" in action)) {
            return this._renderActionNode(
              action,
              `${path}/parallel/${i}/sequence/0`,
              false,
              disabled || node.enabled === false
            );
          }
          const branchSteps = ensureArray<Action>(
            (action as ManualScriptConfig).sequence
          );
          const branchPrefix = `${path}/parallel/${i}/sequence/`;
          const started = this._hasTracedSteps(branchPrefix);
          return html`<div
            ?track=${started}
            ?unfinished=${
              started && !this._branchFinished(branchPrefix, branchSteps)
            }
          >
            ${branchSteps.map((sAction, j) =>
              this._renderActionNode(
                sAction,
                `${path}/parallel/${i}/sequence/${j}`,
                false,
                disabled || node.enabled === false
              )
            )}
          </div>`;
        })}
      </hat-graph-branch>
    `;
  }

  private _renderOtherNode(
    node: Action,
    path: string,
    graphStart = false,
    disabled = false
  ) {
    return html`
      <hat-graph-node
        .graphStart=${graphStart}
        .iconPath=${
          ACTION_ICONS[getAutomationActionType(node)!] || mdiCodeBrackets
        }
        @focus=${this._selectNode(node, path, "action")}
        ?track=${path in this.trace.trace}
        ?active=${this.selected === path}
        .error=${this._hasError(path)}
        .notEnabled=${disabled || node.enabled === false}
      ></hat-graph-node>
    `;
  }

  protected render() {
    const triggerKey = "triggers" in this.trace.config ? "triggers" : "trigger";
    const conditionKey =
      "conditions" in this.trace.config ? "conditions" : "condition";
    const actionKey = "actions" in this.trace.config ? "actions" : "action";

    const paths = Object.keys(this.trackedNodes);
    const triggerNodes =
      triggerKey in this.trace.config
        ? flattenTriggers(ensureArray(this.trace.config[triggerKey])).map(
            (trigger, i) => this._renderTrigger(trigger, i)
          )
        : undefined;
    try {
      return html`
        <div class="graph-scroll ha-scrollbar">
          <div class="parent graph-container">
            ${
              triggerNodes
                ? html`<hat-graph-branch
                    start
                    .short=${triggerNodes.length < 2}
                  >
                    ${triggerNodes}
                  </hat-graph-branch>`
                : ""
            }
            ${
              conditionKey in this.trace.config
                ? html`${ensureArray(this.trace.config[conditionKey])?.map(
                    (condition, i) => this._renderCondition(condition, i)
                  )}`
                : ""
            }
            ${
              actionKey in this.trace.config
                ? html`${ensureArray(this.trace.config[actionKey]).map(
                    (action, i) => this._renderActionNode(action, `action/${i}`)
                  )}`
                : ""
            }
            ${
              "sequence" in this.trace.config
                ? html`${ensureArray<Action>(this.trace.config.sequence).map(
                    (action, i) =>
                      this._renderActionNode(action, `sequence/${i}`, i === 0)
                  )}`
                : ""
            }
          </div>
        </div>
        <div class="actions">
          <ha-icon-button
            .disabled=${paths.length === 0 || paths[0] === this.selected}
            @click=${this._previousTrackedNode}
            .path=${mdiChevronUp}
          ></ha-icon-button>
          <ha-icon-button
            .disabled=${
              paths.length === 0 || paths[paths.length - 1] === this.selected
            }
            @click=${this._nextTrackedNode}
            .path=${mdiChevronDown}
          ></ha-icon-button>
        </div>
      `;
    } catch (err: any) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log("Error creating script graph:", err);
      }
      return html`
        <div class="error">
          Error rendering graph. Please download trace and share with the
          developers.
        </div>
      `;
    }
  }

  public willUpdate(changedProps: PropertyValues<this>) {
    super.willUpdate(changedProps);
    if (changedProps.has("trace")) {
      this.renderedNodes = {};
      this.trackedNodes = {};
    }
  }

  protected updated(changedProps: PropertyValues<this>) {
    super.updated(changedProps);

    if (!changedProps.has("trace") && !changedProps.has("selected")) {
      return;
    }

    // Scroll to active node when selection changes
    if (changedProps.has("selected")) {
      this._activeNode?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }

    if (!changedProps.has("trace")) {
      return;
    }

    // If trace changed and we have no or an invalid selection, select first option.
    if (!this.selected || !(this.selected in this.trackedNodes)) {
      const firstNode = this.trackedNodes[Object.keys(this.trackedNodes)[0]];
      if (firstNode) {
        fireEvent(this, "graph-node-selected", firstNode);
      }
    }

    if (this.trace) {
      const sortKeys = Object.keys(this.trace.trace);
      const keys = Object.keys(this.renderedNodes).sort(
        (a, b) => sortKeys.indexOf(a) - sortKeys.indexOf(b)
      );
      const sortedTrackedNodes = {};
      const sortedRenderedNodes = {};
      for (const key of keys) {
        sortedRenderedNodes[key] = this.renderedNodes[key];
        if (key in this.trackedNodes) {
          sortedTrackedNodes[key] = this.trackedNodes[key];
        }
      }
      this.renderedNodes = sortedRenderedNodes;
      this.trackedNodes = sortedTrackedNodes;
    }
  }

  private _previousTrackedNode() {
    const nodes = Object.keys(this.trackedNodes);
    const prevIndex = nodes.indexOf(this.selected!) - 1;
    if (prevIndex >= 0) {
      fireEvent(
        this,
        "graph-node-selected",
        this.trackedNodes[nodes[prevIndex]]
      );
    }
  }

  private _nextTrackedNode() {
    const nodes = Object.keys(this.trackedNodes);
    const nextIndex = nodes.indexOf(this.selected!) + 1;
    if (nextIndex < nodes.length) {
      fireEvent(
        this,
        "graph-node-selected",
        this.trackedNodes[nodes[nextIndex]]
      );
    }
  }

  static get styles() {
    return css`
      :host {
        display: grid;
        overflow: hidden;
        position: relative;
        --stroke-clr: var(
          --stroke-color,
          var(--ha-color-border-neutral-normal)
        );
        --connector-clr: var(
          --connector-color,
          var(--ha-color-border-neutral-loud)
        );
        --active-clr: var(--active-color, var(--primary-color));
        --track-clr: var(
          --track-color,
          var(--ha-color-fill-success-loud-resting)
        );
        --hover-clr: var(--hover-color, var(--primary-color));
        --disabled-clr: var(
          --disabled-color,
          var(--ha-color-border-neutral-loud)
        );
        --disabled-active-clr: rgba(var(--rgb-primary-color), 0.5);
        --disabled-hover-clr: rgba(var(--rgb-primary-color), 0.7);
        /* Same chain as ha-card, so nodes match the editor rows. */
        --background-clr: var(
          --ha-card-background,
          var(--card-background-color)
        );
        --default-icon-clr: var(--icon-color, var(--primary-text-color));
        --icon-clr: var(--secondary-text-color);

        --hat-graph-spacing: ${SPACING}px;
        --hat-graph-node-size: ${NODE_SIZE}px;
        --hat-graph-branch-height: ${BRANCH_HEIGHT}px;
      }
      .graph-scroll {
        grid-area: 1 / 1;
        overflow: auto;
        min-width: 0;
        min-height: 0;
      }
      .graph-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        min-width: fit-content;
      }
      .repeat-sequence {
        padding-inline: var(--ha-space-2);
        padding-block-end: var(--ha-space-2);
        /* Offset the visual padding so the connector stays attached. */
        margin-block-end: calc(var(--ha-space-2) * -1);
        background-color: var(
          --ha-card-background,
          var(--card-background-color)
        );
        border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg));
      }
      .actions {
        display: flex;
        flex-direction: column;
        grid-area: 1 / 1;
        justify-self: end;
        align-self: start;
        margin-top: var(--ha-space-2);
        margin-inline-end: var(--ha-space-5);
        z-index: 1;
        background-color: color-mix(
          in srgb,
          var(--card-background-color) 70%,
          transparent
        );
        backdrop-filter: blur(8px);
        border-radius: var(--ha-border-radius-pill);
      }
      .parent {
        margin-left: 8px;
        margin-top: 16px;
      }
      .error {
        padding: 16px;
        max-width: 300px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hat-script-graph": HatScriptGraph;
  }
}
