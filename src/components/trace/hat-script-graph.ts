import {
  html,
  LitElement,
  property,
  customElement,
  PropertyValues,
  css,
} from "lit-element";
import "@material/mwc-icon-button/mwc-icon-button";
import { fireEvent } from "../../common/dom/fire_event";
import "../ha-svg-icon";
import { AutomationTraceExtended } from "../../data/trace";
import {
  mdiAbTesting,
  mdiArrowUp,
  mdiAsterisk,
  mdiCallSplit,
  mdiCheckboxBlankOutline,
  mdiCheckBoxOutline,
  mdiChevronDown,
  mdiChevronRight,
  mdiChevronUp,
  mdiClose,
  mdiDevices,
  mdiExclamation,
  mdiRefresh,
  mdiTimerOutline,
  mdiTrafficLight,
} from "@mdi/js";
import "./hat-graph-node";
import { classMap } from "lit-html/directives/class-map";
import { NODE_SIZE, SPACING, NodeInfo } from "./hat-graph";

declare global {
  interface HASSDomEvents {
    "graph-node-selected": NodeInfo;
  }
}

@customElement("hat-script-graph")
class HatScriptGraph extends LitElement {
  @property({ attribute: false }) public trace!: AutomationTraceExtended;

  @property({ attribute: false }) public selected;

  renderedNodes: Record<string, any> = {};

  private selectNode(config, path) {
    return () => {
      fireEvent(this, "graph-node-selected", { config, path });
    };
  }

  private render_trigger(trigger, i) {
    const path = `trigger/${i}`;
    return html`
      <hat-graph-node
        graphStart
        @focus=${this.selectNode(trigger, path)}
        .iconPath=${mdiAsterisk}
      ></hat-graph-node>
    `;
  }

  private render_condition(condition, i) {
    const path = `condition/${i}`;
    return html`
      <hat-graph
        branching
        @focus=${this.selectNode(condition, path)}
        class=${classMap({
          track: path in this.trace.condition_trace,
          active: this.selected === path,
        })}
        tabindex="0"
        short
      >
        <hat-graph-node
          slot="head"
          class=${classMap({
            track: path in this.trace.condition_trace,
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
            track: path in this.trace.condition_trace,
          })}
        ></hat-graph-node>
      </hat-graph>
    `;
  }

  private render_choose_node(node, path) {
    const trace: any = this.trace.action_trace[path];
    const trace_path = trace
      ? trace[0].result.choice === "default"
        ? [node.choose.length]
        : [trace[0].result.choice]
      : [];
    return html`
      <hat-graph
        tabindex="0"
        branching
        .track_start=${trace_path}
        .track_end=${trace_path}
        @focus=${this.selectNode(node, path)}
        class=${classMap({
          track: path in this.trace.condition_trace,
          active: this.selected === path,
        })}
      >
        <hat-graph-node
          .iconPath=${mdiCallSplit}
          class=${classMap({
            track: trace,
          })}
          slot="head"
          nofocus
        ></hat-graph-node>

        ${node.choose.map((branch, i) => {
          const branch_path = `${path}/choose/${i}`;
          return html`
            <hat-graph>
              <hat-graph-node
                .iconPath=${mdiCheckBoxOutline}
                nofocus
                class=${classMap({
                  track: trace && trace[0].result.choice === i,
                })}
              ></hat-graph-node>
              ${branch.sequence.map((action, j) =>
                this.render_node(action, `${branch_path}/sequence/${j}`)
              )}
            </hat-graph>
          `;
        })}
        <hat-graph>
          <hat-graph-node
            .iconPath=${mdiCheckboxBlankOutline}
            nofocus
            class=${classMap({
              track: trace && trace[0].result.choice === "default",
            })}
          ></hat-graph-node>
          ${node.default.map((action, i) =>
            this.render_node(action, `${path}/default/${i}`)
          )}
        </hat-graph>
      </hat-graph>
    `;
  }

  private render_condition_node(node, path) {
    const trace: any = this.trace.action_trace[path];
    const track_path = trace === undefined ? 0 : trace[0].result.result ? 1 : 2;
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
        this.trace.action_trace[path]?.}
        tabindex="0"
        short
      >
        <hat-graph-node
          slot="head"
          class=${classMap({
            track: trace,
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

  private render_delay_node(node, path) {
    return html`
      <hat-graph-node
        .iconPath=${mdiTimerOutline}
        @focus=${this.selectNode(node, path)}
        class=${classMap({
          track: path in this.trace.action_trace,
          active: this.selected === path,
        })}
      ></hat-graph-node>
    `;
  }

  private render_device_node(node, path) {
    return html`
      <hat-graph-node
        .iconPath=${mdiDevices}
        @focus=${this.selectNode(node, path)}
        class=${classMap({
          track: path in this.trace.action_trace,
          active: this.selected === path,
        })}
      ></hat-graph-node>
    `;
  }

  private render_event_node(node, path) {
    return html`
      <hat-graph-node
        .iconPath=${mdiExclamation}
        @focus=${this.selectNode(node, path)}
        class=${classMap({
          track: path in this.trace.action_trace,
          active: this.selected === path,
        })}
      ></hat-graph-node>
    `;
  }

  private render_repeat_node(node, path) {
    const trace: any = this.trace.action_trace[path];
    const track_path = trace ? [0, 1] : [];
    const repeats = this.trace?.action_trace[`${path}/repeat/sequence/0`]
      ?.length;
    return html`
      <hat-graph
        .track_start=${track_path}
        .track_end=${track_path}
        tabindex="0"
        branching
        @focus=${this.selectNode(node, path)}
        class=${classMap({
          track: path in this.trace.condition_trace,
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
          .number=${repeats}
        ></hat-graph-node>
        <hat-graph>
          ${node.repeat.sequence.map((action, i) =>
            this.render_node(action, `${path}/repeat/sequence/${i}`)
          )}
        </hat-graph>
      </hat-graph>
    `;
  }

  private render_scene_node(node, path) {
    return html`
      <hat-graph-node
        .iconPath=${mdiExclamation}
        @focus=${this.selectNode(node, path)}
        class=${classMap({
          track: path in this.trace.action_trace,
          active: this.selected === path,
        })}
      ></hat-graph-node>
    `;
  }

  private render_service_node(node, path) {
    return html`
      <hat-graph-node
        .iconPath=${mdiChevronRight}
        @focus=${this.selectNode(node, path)}
        class=${classMap({
          track: path in this.trace.action_trace,
          active: this.selected === path,
        })}
      ></hat-graph-node>
    `;
  }

  private render_wait_template_node(node, path) {
    return html`
      <hat-graph-node
        .iconPath=${mdiTrafficLight}
        @focus=${this.selectNode(node, path)}
        class=${classMap({
          track: path in this.trace.action_trace,
          active: this.selected === path,
        })}
      ></hat-graph-node>
    `;
  }

  private render_node(node, path) {
    const NODE_TYPES = {
      choose: this.render_choose_node,
      condition: this.render_condition_node,
      delay: this.render_delay_node,
      device_id: this.render_device_node,
      event: this.render_event_node,
      repeat: this.render_repeat_node,
      scene: this.render_scene_node,
      service: this.render_service_node,
      wait_template: this.render_wait_template_node,
      yaml: this.render_device_node,
    };

    const type = Object.keys(NODE_TYPES).find((key) => key in node) || "yaml";
    const nodeEl = NODE_TYPES[type].bind(this)(node, path);
    (nodeEl as any).nodeInfo = { config: node, path };
    this.renderedNodes[path] = nodeEl;
    return nodeEl;
  }

  protected render() {
    return html`
      <hat-graph>
        <div></div>
        <hat-graph branching id="trigger">
          ${this.trace.config.trigger.map((trigger, i) =>
            this.render_trigger(trigger, i)
          )}
        </hat-graph>
        <hat-graph id="condition">
          ${this.trace.config.condition?.map((condition, i) =>
            this.render_condition(condition, i)
          )}
        </hat-graph>
        ${this.trace.config.action.map((action, i) =>
          this.render_node(action, `action/${i}`)
        )}
      </hat-graph>
      <div class="actions">
        <mwc-icon-button @click=${this.previousTrackedNode}>
          <ha-svg-icon .path=${mdiChevronUp}></ha-svg-icon>
        </mwc-icon-button>
        <mwc-icon-button @click=${this.nextTrackedNode}>
          <ha-svg-icon .path=${mdiChevronDown}></ha-svg-icon>
        </mwc-icon-button>
      </div>
    `;
  }

  protected update(changedProps: PropertyValues<this>) {
    if (changedProps.has("trace")) {
      this.renderedNodes = {};
    }
    super.update(changedProps);
  }

  protected updated(changedProps: PropertyValues<this>) {
    super.updated(changedProps);

    // Select first node if new trace loaded but no selection given.
    if (changedProps.has("trace")) {
      const tracked = this.getTrackedNodes();
      const paths = Object.keys(tracked);

      // If trace changed and we have no or an invalid selection, select first option.
      if (this.selected === "" || !(this.selected in paths)) {
        // Find first tracked node with node info
        for (const path of paths) {
          if (tracked[path].nodeInfo) {
            fireEvent(this, "graph-node-selected", tracked[path].nodeInfo);
            break;
          }
        }
      }
    }
  }

  public getTrackedNodes() {
    return this.renderedNodes;
  }

  public previousTrackedNode() {
    const tracked = this.getTrackedNodes();
    const nodes = Object.keys(tracked);

    for (let i = nodes.indexOf(this.selected) - 1; i >= 0; i--) {
      if (tracked[nodes[i]].nodeInfo) {
        fireEvent(this, "graph-node-selected", tracked[nodes[i]].nodeInfo);
        break;
      }
    }
  }

  public nextTrackedNode() {
    const tracked = this.getTrackedNodes();
    const nodes = Object.keys(tracked);
    for (let i = nodes.indexOf(this.selected) + 1; i < nodes.length; i++) {
      if (tracked[nodes[i]].nodeInfo) {
        fireEvent(this, "graph-node-selected", tracked[nodes[i]].nodeInfo);
        break;
      }
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hat-script-graph": HatScriptGraph;
  }
}
