import {
  mdiAbTesting,
  mdiArrowDecision,
  mdiArrowUp,
  mdiAsterisk,
  mdiCallMissed,
  mdiCallReceived,
  mdiCallSplit,
  mdiCheckboxBlankOutline,
  mdiCheckboxMarkedOutline,
  mdiChevronDown,
  mdiChevronUp,
  mdiClose,
  mdiCodeBraces,
  mdiCodeBrackets,
  mdiDevices,
  mdiGestureDoubleTap,
  mdiHandBackRight,
  mdiPalette,
  mdiRefresh,
  mdiRoomService,
  mdiShuffleDisabled,
  mdiTimerOutline,
} from "@mdi/js";
import { css, html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { ensureArray } from "../../common/array/ensure-array";
import { Condition, Trigger } from "../../data/automation";
import {
  Action,
  ChooseAction,
  DelayAction,
  DeviceAction,
  EventAction,
  IfAction,
  ManualScriptConfig,
  ParallelAction,
  RepeatAction,
  SceneAction,
  ServiceAction,
  WaitAction,
  WaitForTriggerAction,
} from "../../data/script";
import {
  ChooseActionTraceStep,
  ConditionTraceStep,
  IfActionTraceStep,
  TraceExtended,
} from "../../data/trace";
import "../ha-icon-button";
import "./hat-graph-branch";
import { BRANCH_HEIGHT, NODE_SIZE, SPACING } from "./hat-graph-const";
import "./hat-graph-node";
import "./hat-graph-spacer";

export interface NodeInfo {
  path: string;
  config: any;
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

  public renderedNodes: Record<string, NodeInfo> = {};

  public trackedNodes: Record<string, NodeInfo> = {};

  private selectNode(config, path) {
    return () => {
      fireEvent(this, "graph-node-selected", { config, path });
    };
  }

  private render_trigger(config: Trigger, i: number) {
    const path = `trigger/${i}`;
    const track = this.trace && path in this.trace.trace;
    this.renderedNodes[path] = { config, path };
    if (track) {
      this.trackedNodes[path] = this.renderedNodes[path];
    }
    return html`
      <hat-graph-node
        graphStart
        ?track=${track}
        @focus=${this.selectNode(config, path)}
        ?active=${this.selected === path}
        .iconPath=${mdiAsterisk}
        .notEnabled=${config.enabled === false}
        tabindex=${track ? "0" : "-1"}
      ></hat-graph-node>
    `;
  }

  private render_condition(config: Condition, i: number) {
    const path = `condition/${i}`;
    this.renderedNodes[path] = { config, path };
    if (this.trace && path in this.trace.trace) {
      this.trackedNodes[path] = this.renderedNodes[path];
    }
    return this.render_condition_node(config, path);
  }

  private typeRenderers = {
    condition: this.render_condition_node,
    and: this.render_condition_node,
    or: this.render_condition_node,
    not: this.render_condition_node,
    delay: this.render_delay_node,
    event: this.render_event_node,
    scene: this.render_scene_node,
    service: this.render_service_node,
    wait_template: this.render_wait_node,
    wait_for_trigger: this.render_wait_node,
    repeat: this.render_repeat_node,
    choose: this.render_choose_node,
    device_id: this.render_device_node,
    if: this.render_if_node,
    stop: this.render_stop_node,
    parallel: this.render_parallel_node,
    other: this.render_other_node,
  };

  private render_action_node(
    node: Action,
    path: string,
    graphStart = false,
    disabled = false
  ) {
    const type =
      Object.keys(this.typeRenderers).find((key) => key in node) || "other";
    this.renderedNodes[path] = { config: node, path };
    if (this.trace && path in this.trace.trace) {
      this.trackedNodes[path] = this.renderedNodes[path];
    }
    return this.typeRenderers[type].bind(this)(
      node,
      path,
      graphStart,
      disabled
    );
  }

  private render_choose_node(
    config: ChooseAction,
    path: string,
    graphStart = false,
    disabled = false
  ) {
    const trace = this.trace.trace[path] as ChooseActionTraceStep[] | undefined;
    const trace_path = trace
      ? trace.map((trc) =>
          trc.result === undefined || trc.result.choice === "default"
            ? "default"
            : trc.result.choice
        )
      : [];
    const track_default = trace_path.includes("default");
    return html`
      <hat-graph-branch
        tabindex=${trace === undefined ? "-1" : "0"}
        @focus=${this.selectNode(config, path)}
        ?track=${trace !== undefined}
        ?active=${this.selected === path}
        .notEnabled=${disabled || config.enabled === false}
      >
        <hat-graph-node
          .graphStart=${graphStart}
          .iconPath=${mdiArrowDecision}
          ?track=${trace !== undefined}
          ?active=${this.selected === path}
          .notEnabled=${disabled || config.enabled === false}
          slot="head"
          nofocus
        ></hat-graph-node>

        ${config.choose
          ? ensureArray(config.choose)?.map((branch, i) => {
              const branch_path = `${path}/choose/${i}`;
              const track_this = trace_path.includes(i);
              this.renderedNodes[branch_path] = { config, path: branch_path };
              if (track_this) {
                this.trackedNodes[branch_path] =
                  this.renderedNodes[branch_path];
              }
              return html`
                <div class="graph-container" ?track=${track_this}>
                  <hat-graph-node
                    .iconPath=${!trace || track_this
                      ? mdiCheckboxMarkedOutline
                      : mdiCheckboxBlankOutline}
                    @focus=${this.selectNode(config, branch_path)}
                    ?track=${track_this}
                    ?active=${this.selected === branch_path}
                    .notEnabled=${disabled || config.enabled === false}
                  ></hat-graph-node>
                  ${branch.sequence !== null
                    ? ensureArray(branch.sequence).map((action, j) =>
                        this.render_action_node(
                          action,
                          `${branch_path}/sequence/${j}`,
                          false,
                          disabled || config.enabled === false
                        )
                      )
                    : ""}
                </div>
              `;
            })
          : ""}
        <div ?track=${track_default}>
          <hat-graph-spacer ?track=${track_default}></hat-graph-spacer>
          ${config.default !== null
            ? ensureArray(config.default)?.map((action, i) =>
                this.render_action_node(
                  action,
                  `${path}/default/${i}`,
                  false,
                  disabled || config.enabled === false
                )
              )
            : ""}
        </div>
      </hat-graph-branch>
    `;
  }

  private render_if_node(
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
    return html`
      <hat-graph-branch
        tabindex=${trace === undefined ? "-1" : "0"}
        @focus=${this.selectNode(config, path)}
        ?track=${trace !== undefined}
        ?active=${this.selected === path}
        .notEnabled=${disabled || config.enabled === false}
      >
        <hat-graph-node
          .graphStart=${graphStart}
          .iconPath=${mdiCallSplit}
          ?track=${trace !== undefined}
          ?active=${this.selected === path}
          .notEnabled=${disabled || config.enabled === false}
          slot="head"
          nofocus
        ></hat-graph-node>
        ${config.else
          ? html`<div class="graph-container" ?track=${trackElse}>
              <hat-graph-node
                .iconPath=${mdiCallMissed}
                ?track=${trackElse}
                ?active=${this.selected === path}
                .notEnabled=${disabled || config.enabled === false}
                nofocus
              ></hat-graph-node
              >${ensureArray(config.else).map((action, j) =>
                this.render_action_node(
                  action,
                  `${path}/else/${j}`,
                  false,
                  disabled || config.enabled === false
                )
              )}
            </div>`
          : html`<hat-graph-spacer ?track=${trackElse}></hat-graph-spacer>`}
        <div class="graph-container" ?track=${trackThen}>
          <hat-graph-node
            .iconPath=${mdiCallReceived}
            ?track=${trackThen}
            ?active=${this.selected === path}
            .notEnabled=${disabled || config.enabled === false}
            nofocus
          ></hat-graph-node>
          ${ensureArray(config.then ?? []).map((action, j) =>
            this.render_action_node(
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

  private render_condition_node(
    node: Condition,
    path: string,
    graphStart = false,
    disabled = false
  ) {
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
        @focus=${this.selectNode(node, path)}
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
          .iconPath=${mdiAbTesting}
          nofocus
        ></hat-graph-node>
        <div
          style=${`width: ${NODE_SIZE + SPACING}px;`}
          graphStart
          graphEnd
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

  private render_delay_node(
    node: DelayAction,
    path: string,
    graphStart = false,
    disabled = false
  ) {
    return html`
      <hat-graph-node
        .graphStart=${graphStart}
        .iconPath=${mdiTimerOutline}
        @focus=${this.selectNode(node, path)}
        ?track=${path in this.trace.trace}
        ?active=${this.selected === path}
        .notEnabled=${disabled || node.enabled === false}
        tabindex=${this.trace && path in this.trace.trace ? "0" : "-1"}
      ></hat-graph-node>
    `;
  }

  private render_device_node(
    node: DeviceAction,
    path: string,
    graphStart = false,
    disabled = false
  ) {
    return html`
      <hat-graph-node
        .graphStart=${graphStart}
        .iconPath=${mdiDevices}
        @focus=${this.selectNode(node, path)}
        ?track=${path in this.trace.trace}
        ?active=${this.selected === path}
        .notEnabled=${disabled || node.enabled === false}
        tabindex=${this.trace && path in this.trace.trace ? "0" : "-1"}
      ></hat-graph-node>
    `;
  }

  private render_event_node(
    node: EventAction,
    path: string,
    graphStart = false,
    disabled = false
  ) {
    return html`
      <hat-graph-node
        .graphStart=${graphStart}
        .iconPath=${mdiGestureDoubleTap}
        @focus=${this.selectNode(node, path)}
        ?track=${path in this.trace.trace}
        ?active=${this.selected === path}
        .notEnabled=${disabled || node.enabled === false}
        tabindex=${this.trace && path in this.trace.trace ? "0" : "-1"}
      ></hat-graph-node>
    `;
  }

  private render_repeat_node(
    node: RepeatAction,
    path: string,
    graphStart = false,
    disabled = false
  ) {
    const trace: any = this.trace.trace[path];
    const repeats = this.trace?.trace[`${path}/repeat/sequence/0`]?.length;
    return html`
      <hat-graph-branch
        tabindex=${trace === undefined ? "-1" : "0"}
        @focus=${this.selectNode(node, path)}
        ?track=${path in this.trace.trace}
        ?active=${this.selected === path}
        .notEnabled=${disabled || node.enabled === false}
      >
        <hat-graph-node
          .graphStart=${graphStart}
          .iconPath=${mdiRefresh}
          ?track=${path in this.trace.trace}
          ?active=${this.selected === path}
          .notEnabled=${disabled || node.enabled === false}
          slot="head"
          nofocus
        ></hat-graph-node>
        <hat-graph-node
          .iconPath=${mdiArrowUp}
          ?track=${repeats > 1}
          ?active=${this.selected === path}
          .notEnabled=${disabled || node.enabled === false}
          nofocus
          .badge=${repeats > 1 ? repeats : undefined}
        ></hat-graph-node>
        <div ?track=${trace}>
          ${ensureArray(node.repeat.sequence).map((action, i) =>
            this.render_action_node(
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

  private render_scene_node(
    node: SceneAction,
    path: string,
    graphStart = false,
    disabled = false
  ) {
    return html`
      <hat-graph-node
        .graphStart=${graphStart}
        .iconPath=${mdiPalette}
        @focus=${this.selectNode(node, path)}
        ?track=${path in this.trace.trace}
        ?active=${this.selected === path}
        .notEnabled=${disabled || node.enabled === false}
        tabindex=${this.trace && path in this.trace.trace ? "0" : "-1"}
      ></hat-graph-node>
    `;
  }

  private render_service_node(
    node: ServiceAction,
    path: string,
    graphStart = false,
    disabled = false
  ) {
    return html`
      <hat-graph-node
        .graphStart=${graphStart}
        .iconPath=${mdiRoomService}
        @focus=${this.selectNode(node, path)}
        ?track=${path in this.trace.trace}
        ?active=${this.selected === path}
        .notEnabled=${disabled || node.enabled === false}
        tabindex=${this.trace && path in this.trace.trace ? "0" : "-1"}
      ></hat-graph-node>
    `;
  }

  private render_wait_node(
    node: WaitAction | WaitForTriggerAction,
    path: string,
    graphStart = false,
    disabled = false
  ) {
    return html`
      <hat-graph-node
        .graphStart=${graphStart}
        .iconPath=${mdiCodeBraces}
        @focus=${this.selectNode(node, path)}
        ?track=${path in this.trace.trace}
        ?active=${this.selected === path}
        .notEnabled=${disabled || node.enabled === false}
        tabindex=${this.trace && path in this.trace.trace ? "0" : "-1"}
      ></hat-graph-node>
    `;
  }

  private render_parallel_node(
    node: ParallelAction,
    path: string,
    graphStart = false,
    disabled = false
  ) {
    const trace: any = this.trace.trace[path];
    return html`
      <hat-graph-branch
        tabindex=${trace === undefined ? "-1" : "0"}
        @focus=${this.selectNode(node, path)}
        ?track=${path in this.trace.trace}
        ?active=${this.selected === path}
        .notEnabled=${disabled || node.enabled === false}
      >
        <hat-graph-node
          .graphStart=${graphStart}
          .iconPath=${mdiShuffleDisabled}
          ?track=${path in this.trace.trace}
          ?active=${this.selected === path}
          .notEnabled=${disabled || node.enabled === false}
          slot="head"
          nofocus
        ></hat-graph-node>
        ${ensureArray(node.parallel).map((action, i) =>
          "sequence" in action
            ? html`<div ?track=${path in this.trace.trace}>
                ${ensureArray((action as ManualScriptConfig).sequence).map(
                  (sAction, j) =>
                    this.render_action_node(
                      sAction,
                      `${path}/parallel/${i}/sequence/${j}`,
                      false,
                      disabled || node.enabled === false
                    )
                )}
              </div>`
            : this.render_action_node(
                action,
                `${path}/parallel/${i}/sequence/0`,
                false,
                disabled || node.enabled === false
              )
        )}
      </hat-graph-branch>
    `;
  }

  private render_stop_node(
    node: Action,
    path: string,
    graphStart = false,
    disabled = false
  ) {
    return html`
      <hat-graph-node
        .graphStart=${graphStart}
        .iconPath=${mdiHandBackRight}
        @focus=${this.selectNode(node, path)}
        ?track=${path in this.trace.trace}
        ?active=${this.selected === path}
        .notEnabled=${disabled || node.enabled === false}
      ></hat-graph-node>
    `;
  }

  private render_other_node(
    node: Action,
    path: string,
    graphStart = false,
    disabled = false
  ) {
    return html`
      <hat-graph-node
        .graphStart=${graphStart}
        .iconPath=${mdiCodeBrackets}
        @focus=${this.selectNode(node, path)}
        ?track=${path in this.trace.trace}
        ?active=${this.selected === path}
        .notEnabled=${disabled || node.enabled === false}
      ></hat-graph-node>
    `;
  }

  protected render() {
    const paths = Object.keys(this.trackedNodes);
    const trigger_nodes =
      "trigger" in this.trace.config
        ? ensureArray(this.trace.config.trigger).map((trigger, i) =>
            this.render_trigger(trigger, i)
          )
        : undefined;
    try {
      return html`
        <div class="parent graph-container">
          ${trigger_nodes
            ? html`<hat-graph-branch start .short=${trigger_nodes.length < 2}>
                ${trigger_nodes}
              </hat-graph-branch>`
            : ""}
          ${"condition" in this.trace.config
            ? html`${ensureArray(this.trace.config.condition)?.map(
                (condition, i) => this.render_condition(condition, i)
              )}`
            : ""}
          ${"action" in this.trace.config
            ? html`${ensureArray(this.trace.config.action).map((action, i) =>
                this.render_action_node(action, `action/${i}`)
              )}`
            : ""}
          ${"sequence" in this.trace.config
            ? html`${ensureArray(this.trace.config.sequence).map((action, i) =>
                this.render_action_node(action, `sequence/${i}`, i === 0)
              )}`
            : ""}
        </div>
        <div class="actions">
          <ha-icon-button
            .disabled=${paths.length === 0 || paths[0] === this.selected}
            @click=${this._previousTrackedNode}
            .path=${mdiChevronUp}
          ></ha-icon-button>
          <ha-icon-button
            .disabled=${paths.length === 0 ||
            paths[paths.length - 1] === this.selected}
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
        display: flex;
        --stroke-clr: var(--stroke-color, var(--secondary-text-color));
        --active-clr: var(--active-color, var(--primary-color));
        --track-clr: var(--track-color, var(--accent-color));
        --hover-clr: var(--hover-color, var(--primary-color));
        --disabled-clr: var(--disabled-color, var(--disabled-text-color));
        --disabled-active-clr: rgba(var(--rgb-primary-color), 0.5);
        --disabled-hover-clr: rgba(var(--rgb-primary-color), 0.7);
        --default-trigger-color: 3, 169, 244;
        --rgb-trigger-color: var(--trigger-color, var(--default-trigger-color));
        --background-clr: var(--background-color, white);
        --default-icon-clr: var(--icon-color, black);
        --icon-clr: var(--stroke-clr);

        --hat-graph-spacing: ${SPACING}px;
        --hat-graph-node-size: ${NODE_SIZE}px;
        --hat-graph-branch-height: ${BRANCH_HEIGHT}px;
      }
      .graph-container {
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .actions {
        display: flex;
        flex-direction: column;
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
