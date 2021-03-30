import {
  html,
  LitElement,
  property,
  customElement,
  PropertyValues,
  css,
} from "lit-element";
import "@material/mwc-icon-button/mwc-icon-button";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import "../ha-svg-icon";
import { AutomationTraceExtended } from "../../data/trace";
//import { bfsIterateTreeNodes, NodeInfo, TreeNode } from "./hat-graph";
import { ActionHandler } from "./script-to-graph";
import {
  mdiAbTesting,
  mdiArrowUp,
  mdiAsterisk,
  mdiCallSplit,
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
import { NODE_SIZE, SPACING } from "./hat-graph";

declare global {
  interface HASSDomEvents {
    "graph-node-selected": NodeInfo;
  }
}

@customElement("hat-script-graph")
class HatScriptGraph extends LitElement {
  @property({ attribute: false }) public trace!: AutomationTraceExtended;

  @property({ attribute: false }) public selected;

  private getActionHandler = memoizeOne((trace: AutomationTraceExtended) => {
    return new ActionHandler(
      trace.config.action,
      false,
      undefined,
      (nodeInfo) => {
        // eslint-disable-next-line no-console
        console.log(nodeInfo);
        fireEvent(this, "graph-node-selected", nodeInfo);
        this.requestUpdate();
      },
      this.selected,
      this.trace
    );
  });

  private selectNode(node) {
    return () => {
      fireEvent(this, "graph-node-selected", node);
    };
  }

  private render_trigger(trigger, i) {
    const path = `trigger/${i}`;
    return html`
      <hat-graph-node
        graphStart
        @focus=${this.selectNode({ path })}
        .iconPath=${mdiAsterisk}
      ></hat-graph-node>
    `;
  }

  private render_condition(condition, i) {
    const path = `condition/${i}`;
    return html`
      <hat-graph
        branching
        @focus=${this.selectNode({ path })}
        class=${classMap({
          track: path in this.trace.condition_trace,
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
    return html`
      <hat-graph-node
        .iconPath=${mdiCallSplit}
        class=${classMap({
          track: path in this.trace.action_trace,
        })}
      ></hat-graph-node>
    `;
  }

  private render_condition_node(node, path) {
    const trace: any = this.trace.action_trace[path];
    const track_path = trace === undefined ? 0 : trace[0].result.result ? 1 : 2;
    return html`
      <hat-graph
        branching
        @focus=${this.selectNode({ path })}
        class=${classMap({
          track: track_path,
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
            track: path in this.trace.action_trace,
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
        class=${classMap({
          track: path in this.trace.action_trace,
        })}
      ></hat-graph-node>
    `;
  }

  private render_device_node(node, path) {
    return html`
      <hat-graph-node
        .iconPath=${mdiDevices}
        class=${classMap({
          track: path in this.trace.action_trace,
        })}
      ></hat-graph-node>
    `;
  }

  private render_event_node(node, path) {
    return html`
      <hat-graph-node
        .iconPath=${mdiExclamation}
        class=${classMap({
          track: path in this.trace.action_trace,
        })}
      ></hat-graph-node>
    `;
  }

  private render_repeat_node(node, path) {
    const trace: any = this.trace.action_trace[path];
    const track_path = trace ? [0, 1] : [];
    return html`
      <hat-graph
        .track_start=${track_path}
        .track_end=${track_path}
        tabindex="0"
        branching
      >
        <hat-graph-node
          .iconPath=${mdiRefresh}
          class=${classMap({
            track: track_path.length > 0,
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
        class=${classMap({
          track: path in this.trace.action_trace,
        })}
      ></hat-graph-node>
    `;
  }

  private render_service_node(node, path) {
    return html`
      <hat-graph-node
        .iconPath=${mdiChevronRight}
        class=${classMap({
          track: path in this.trace.action_trace,
        })}
      ></hat-graph-node>
    `;
  }

  private render_wait_template_node(node, path) {
    return html`
      <hat-graph-node
        .iconPath=${mdiTrafficLight}
        class=${classMap({
          track: path in this.trace.action_trace,
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
    return NODE_TYPES[type].bind(this)(node, path);
  }

  firstUpdated() {
    // prettier-ignore
    // eslint-disable-next-line no-console
    console.log(this.trace);
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
    const actionHandler = this.getActionHandler(this.trace);
    const paths = Object.keys(this.getTrackedNodes());
    return html` <hat-graph .tree=${actionHandler.createGraph()}></hat-graph> `;
  }

  // public selectPath(path: string) {
  //   const actionHandler = this.getActionHandler(this.trace!);
  //   let selected: NodeInfo | undefined;

  //   for (const node of actionHandler.createGraph()) {
  //     if (node.nodeInfo?.path === path) {
  //       selected = node.nodeInfo;
  //       break;
  //     }
  //   }

  //   actionHandler.selected = selected?.path || "";
  //   this.requestUpdate();
  // }

  protected updated(changedProps: PropertyValues<this>) {
    super.updated(changedProps);

    // Select first node if new trace loaded but no selection given.
    // if (changedProps.has("trace")) {
    //   const tracked = this.getTrackedNodes();
    //   const paths = Object.keys(tracked);

    //   // If trace changed and we have no or an invalid selection, select first option.
    //   if (this.selected === "" || !(this.selected in paths)) {
    //     // Find first tracked node with node info
    //     for (const path of paths) {
    //       if (tracked[path].nodeInfo) {
    //         fireEvent(this, "graph-node-selected", tracked[path].nodeInfo);
    //         break;
    //       }
    //     }
    //   }
    // }

    // if (changedProps.has("selected")) {
    //   this.getActionHandler(this.trace).selected = this.selected;
    //   this.requestUpdate();
    // }
  }

  public getTrackedNodes() {
    return this._getTrackedNodes(this.trace);
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

  private _getTrackedNodes = memoizeOne((trace) => {
    // const tracked: Record<string, TreeNode> = {};
    // for (const node of bfsIterateTreeNodes(
    //   this.getActionHandler(trace).createGraph()
    // )) {
    //   if (node.isTracked && node.nodeInfo) {
    //     tracked[node.nodeInfo.path] = node;
    //   }
    // }
    // return tracked;
  });

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
