import {
  mdiAbTesting,
  mdiArrowUp,
  mdiAsterisk,
  mdiCallSplit,
  mdiCheckboxBlankOutline,
  mdiCheckboxOutline,
  mdiChevronDown,
  mdiChevronRight,
  mdiChevronUp,
  mdiClose,
  mdiCodeBrackets,
  mdiDevices,
  mdiExclamation,
  mdiRefresh,
  mdiTimerOutline,
  mdiTrafficLight,
} from "@mdi/js";
import { css, html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../common/dom/fire_event";
import { ensureArray } from "../../common/ensure-array";
import { Condition, Trigger } from "../../data/automation";
import {
  Action,
  ChooseAction,
  DelayAction,
  DeviceAction,
  EventAction,
  RepeatAction,
  SceneAction,
  ServiceAction,
  WaitAction,
  WaitForTriggerAction,
} from "../../data/script";
import {
  AutomationTraceExtended,
  ChooseActionTraceStep,
  ConditionTraceStep,
} from "../../data/trace";
import "../ha-svg-icon";
import { NodeInfo, NODE_SIZE, SPACING } from "./hat-graph";
import "./hat-graph-node";
import "./hat-graph-spacer";

declare global {
  interface HASSDomEvents {
    "graph-node-selected": NodeInfo;
  }
}

@customElement("hat-script-graph")
class HatScriptGraph extends LitElement {
  @property({ attribute: false }) public trace!: AutomationTraceExtended;

  @property({ attribute: false }) public selected;

  @property() renderedNodes: Record<string, any> = {};

  @property() trackedNodes: Record<string, any> = {};

  private selectNode(config, path) {
    return () => {
      fireEvent(this, "graph-node-selected", { config, path });
    };
  }

  private render_trigger(config: Trigger, i: number) {
    const path = `trigger/${i}`;
    const tracked = this.trace && path in this.trace.trace;
    this.renderedNodes[path] = { config, path };
    if (tracked) {
      this.trackedNodes[path] = this.renderedNodes[path];
    }
    return html`
      <hat-graph-node
        graphStart
        @focus=${this.selectNode(config, path)}
        class=${classMap({
          track: tracked,
          active: this.selected === path,
        })}
        .iconPath=${mdiAsterisk}
        tabindex=${tracked ? "0" : "-1"}
      ></hat-graph-node>
    `;
  }

  private render_condition(config: Condition, i: number) {
    const path = `condition/${i}`;
    const trace = this.trace.trace[path] as ConditionTraceStep[] | undefined;
    const track_path =
      trace?.[0].result === undefined ? 0 : trace[0].result.result ? 1 : 2;
    this.renderedNodes[path] = { config, path };
    if (trace) {
      this.trackedNodes[path] = this.renderedNodes[path];
    }
    return html`
      <hat-graph
        branching
        @focus=${this.selectNode(config, path)}
        class=${classMap({
          track: track_path,
          active: this.selected === path,
        })}
        .track_start=${[track_path]}
        .track_end=${[track_path]}
        tabindex=${trace ? "-1" : "0"}
        short
      >
        <hat-graph-node
          slot="head"
          class=${classMap({
            track: trace !== undefined,
          })}
          .iconPath=${mdiAbTesting}
          nofocus
          graphEnd
        ></hat-graph-node>
        <div
          style=${`width: ${NODE_SIZE + SPACING}px;`}
          graphStart
          graphEnd
        ></div>
        <div></div>
        <hat-graph-node
          .iconPath=${mdiClose}
          graphEnd
          nofocus
          class=${classMap({
            track: track_path === 2,
          })}
        ></hat-graph-node>
      </hat-graph>
    `;
  }

  private render_choose_node(config: ChooseAction, path: string) {
    const trace = this.trace.trace[path] as ChooseActionTraceStep[] | undefined;
    const trace_path = trace?.[0].result
      ? trace[0].result.choice === "default"
        ? [Array.isArray(config.choose) ? config.choose.length : 0]
        : [trace[0].result.choice]
      : [];
    return html`
      <hat-graph
        tabindex=${trace === undefined ? "-1" : "0"}
        branching
        .track_start=${trace_path}
        .track_end=${trace_path}
        @focus=${this.selectNode(config, path)}
        class=${classMap({
          track: trace !== undefined,
          active: this.selected === path,
        })}
      >
        <hat-graph-node
          .iconPath=${mdiCallSplit}
          class=${classMap({
            track: trace !== undefined,
          })}
          slot="head"
          nofocus
        ></hat-graph-node>

        ${config.choose
          ? ensureArray(config.choose)?.map((branch, i) => {
              const branch_path = `${path}/choose/${i}`;
              const track_this =
                trace !== undefined && trace[0].result?.choice === i;
              this.renderedNodes[branch_path] = { config, path: branch_path };
              if (track_this) {
                this.trackedNodes[branch_path] = this.renderedNodes[
                  branch_path
                ];
              }
              return html`
                <hat-graph>
                  <hat-graph-node
                    .iconPath=${!trace || track_this
                      ? mdiCheckboxOutline
                      : mdiCheckboxBlankOutline}
                    @focus=${this.selectNode(config, branch_path)}
                    class=${classMap({
                      active: this.selected === branch_path,
                      track: track_this,
                    })}
                  ></hat-graph-node>
                  ${ensureArray(branch.sequence).map((action, j) =>
                    this.render_node(action, `${branch_path}/sequence/${j}`)
                  )}
                </hat-graph>
              `;
            })
          : ""}
        <hat-graph>
          <hat-graph-spacer
            class=${classMap({
              track:
                trace !== undefined && trace[0].result?.choice === "default",
            })}
          ></hat-graph-spacer>
          ${ensureArray(config.default)?.map((action, i) =>
            this.render_node(action, `${path}/default/${i}`)
          )}
        </hat-graph>
      </hat-graph>
    `;
  }

  private render_condition_node(node: Condition, path: string) {
    const trace = (this.trace.trace[path] as ConditionTraceStep[]) || undefined;
    const track_path =
      trace?.[0].result === undefined ? 0 : trace[0].result.result ? 1 : 2;
    return html`
      <hat-graph
        branching
        @focus=${this.selectNode(node, path)}
        class=${classMap({
          track: track_path,
          active: this.selected === path,
        })}
        .track_start=${[track_path]}
        .track_end=${[track_path]}
        tabindex=${trace === undefined ? "-1" : "0"}
        short
      >
        <hat-graph-node
          slot="head"
          class=${classMap({
            track: Boolean(trace),
          })}
          .iconPath=${mdiAbTesting}
          nofocus
          graphEnd
        ></hat-graph-node>
        <div
          style=${`width: ${NODE_SIZE + SPACING}px;`}
          graphStart
          graphEnd
        ></div>
        <div></div>
        <hat-graph-node
          .iconPath=${mdiClose}
          graphEnd
          nofocus
          class=${classMap({
            track: track_path === 2,
          })}
        ></hat-graph-node>
      </hat-graph>
    `;
  }

  private render_delay_node(node: DelayAction, path: string) {
    return html`
      <hat-graph-node
        .iconPath=${mdiTimerOutline}
        @focus=${this.selectNode(node, path)}
        class=${classMap({
          track: path in this.trace.trace,
          active: this.selected === path,
        })}
        tabindex=${this.trace && path in this.trace.trace ? "0" : "-1"}
      ></hat-graph-node>
    `;
  }

  private render_device_node(node: DeviceAction, path: string) {
    return html`
      <hat-graph-node
        .iconPath=${mdiDevices}
        @focus=${this.selectNode(node, path)}
        class=${classMap({
          track: path in this.trace.trace,
          active: this.selected === path,
        })}
        tabindex=${this.trace && path in this.trace.trace ? "0" : "-1"}
      ></hat-graph-node>
    `;
  }

  private render_event_node(node: EventAction, path: string) {
    return html`
      <hat-graph-node
        .iconPath=${mdiExclamation}
        @focus=${this.selectNode(node, path)}
        class=${classMap({
          track: path in this.trace.trace,
          active: this.selected === path,
        })}
        tabindex=${this.trace && path in this.trace.trace ? "0" : "-1"}
      ></hat-graph-node>
    `;
  }

  private render_repeat_node(node: RepeatAction, path: string) {
    const trace: any = this.trace.trace[path];
    const track_path = trace ? [0, 1] : [];
    const repeats = this.trace?.trace[`${path}/repeat/sequence/0`]?.length;
    return html`
      <hat-graph
        .track_start=${track_path}
        .track_end=${track_path}
        tabindex=${trace === undefined ? "-1" : "0"}
        branching
        @focus=${this.selectNode(node, path)}
        class=${classMap({
          track: path in this.trace.trace,
          active: this.selected === path,
        })}
      >
        <hat-graph-node
          .iconPath=${mdiRefresh}
          class=${classMap({
            track: trace,
          })}
          slot="head"
          nofocus
        ></hat-graph-node>
        <hat-graph-node
          .iconPath=${mdiArrowUp}
          nofocus
          class=${classMap({
            track: track_path.includes(1),
          })}
          .badge=${repeats}
        ></hat-graph-node>
        <hat-graph>
          ${ensureArray(node.repeat.sequence).map((action, i) =>
            this.render_node(action, `${path}/repeat/sequence/${i}`)
          )}
        </hat-graph>
      </hat-graph>
    `;
  }

  private render_scene_node(node: SceneAction, path: string) {
    return html`
      <hat-graph-node
        .iconPath=${mdiExclamation}
        @focus=${this.selectNode(node, path)}
        class=${classMap({
          track: path in this.trace.trace,
          active: this.selected === path,
        })}
        tabindex=${this.trace && path in this.trace.trace ? "0" : "-1"}
      ></hat-graph-node>
    `;
  }

  private render_service_node(node: ServiceAction, path: string) {
    return html`
      <hat-graph-node
        .iconPath=${mdiChevronRight}
        @focus=${this.selectNode(node, path)}
        class=${classMap({
          track: path in this.trace.trace,
          active: this.selected === path,
        })}
        tabindex=${this.trace && path in this.trace.trace ? "0" : "-1"}
      ></hat-graph-node>
    `;
  }

  private render_wait_node(
    node: WaitAction | WaitForTriggerAction,
    path: string
  ) {
    return html`
      <hat-graph-node
        .iconPath=${mdiTrafficLight}
        @focus=${this.selectNode(node, path)}
        class=${classMap({
          track: path in this.trace.trace,
          active: this.selected === path,
        })}
        tabindex=${this.trace && path in this.trace.trace ? "0" : "-1"}
      ></hat-graph-node>
    `;
  }

  private render_other_node(node: Action, path: string) {
    return html`
      <hat-graph-node
        .iconPath=${mdiCodeBrackets}
        @focus=${this.selectNode(node, path)}
        class=${classMap({
          track: path in this.trace.trace,
          active: this.selected === path,
        })}
      ></hat-graph-node>
    `;
  }

  private render_node(node: Action, path: string) {
    const NODE_TYPES = {
      choose: this.render_choose_node,
      condition: this.render_condition_node,
      delay: this.render_delay_node,
      device_id: this.render_device_node,
      event: this.render_event_node,
      repeat: this.render_repeat_node,
      scene: this.render_scene_node,
      service: this.render_service_node,
      wait_template: this.render_wait_node,
      wait_for_trigger: this.render_wait_node,
      other: this.render_other_node,
    };

    const type = Object.keys(NODE_TYPES).find((key) => key in node) || "other";
    const nodeEl = NODE_TYPES[type].bind(this)(node, path);
    this.renderedNodes[path] = { config: node, path };
    if (this.trace && path in this.trace.trace) {
      this.trackedNodes[path] = this.renderedNodes[path];
    }
    return nodeEl;
  }

  protected render() {
    const paths = Object.keys(this.trackedNodes);
    const manual_triggered = this.trace && "trigger" in this.trace.trace;
    let track_path = manual_triggered ? undefined : [0];
    const trigger_nodes = ensureArray(this.trace.config.trigger).map(
      (trigger, i) => {
        if (this.trace && `trigger/${i}` in this.trace.trace) {
          track_path = [i];
        }
        return this.render_trigger(trigger, i);
      }
    );
    try {
      return html`
        <hat-graph class="parent">
          <div></div>
          <hat-graph
            branching
            id="trigger"
            .short=${trigger_nodes.length < 2}
            .track_start=${track_path}
            .track_end=${track_path}
          >
            ${trigger_nodes}
          </hat-graph>
          <hat-graph id="condition">
            ${ensureArray(this.trace.config.condition)?.map((condition, i) =>
              this.render_condition(condition!, i)
            )}
          </hat-graph>
          ${ensureArray(this.trace.config.action).map((action, i) =>
            this.render_node(action, `action/${i}`)
          )}
        </hat-graph>
        <div class="actions">
          <ha-icon-button
            .disabled=${paths.length === 0 || paths[0] === this.selected}
            @click=${this.previousTrackedNode}
            .path=${mdiChevronUp}
          ></ha-icon-button>
          <ha-icon-button
            .disabled=${paths.length === 0 ||
            paths[paths.length - 1] === this.selected}
            @click=${this.nextTrackedNode}
            .path=${mdiChevronDown}
          ></ha-icon-button>
        </div>
      `;
    } catch (err) {
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

  protected update(changedProps: PropertyValues<this>) {
    if (changedProps.has("trace")) {
      this.renderedNodes = {};
      this.trackedNodes = {};
    }
    super.update(changedProps);
  }

  protected updated(changedProps: PropertyValues<this>) {
    super.updated(changedProps);

    // Select first node if new trace loaded but no selection given.
    if (changedProps.has("trace")) {
      const tracked = this.trackedNodes;
      const paths = Object.keys(tracked);

      // If trace changed and we have no or an invalid selection, select first option.
      if (this.selected === "" || !(this.selected in paths)) {
        // Find first tracked node with node info
        for (const path of paths) {
          if (tracked[path]) {
            fireEvent(this, "graph-node-selected", tracked[path]);
            break;
          }
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
  }

  public previousTrackedNode() {
    const nodes = Object.keys(this.trackedNodes);
    const prevIndex = nodes.indexOf(this.selected) - 1;
    if (prevIndex >= 0) {
      fireEvent(
        this,
        "graph-node-selected",
        this.trackedNodes[nodes[prevIndex]]
      );
    }
  }

  public nextTrackedNode() {
    const nodes = Object.keys(this.trackedNodes);
    const nextIndex = nodes.indexOf(this.selected) + 1;
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
      }
      .actions {
        display: flex;
        flex-direction: column;
      }
      .parent {
        margin-left: 8px;
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
