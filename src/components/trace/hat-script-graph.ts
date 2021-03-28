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
import { bfsIterateTreeNodes, NodeInfo, TreeNode } from "./hat-graph";
import { ActionHandler } from "./script-to-graph";
import { mdiChevronDown, mdiChevronUp } from "@mdi/js";

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

  protected render() {
    const actionHandler = this.getActionHandler(this.trace);
    const paths = Object.keys(this.getTrackedNodes());
    return html`
      <hat-graph .tree=${actionHandler.createGraph()}></hat-graph>
      <div class="actions">
        <mwc-icon-button
          .disabled=${paths.length === 0 || paths[0] === this.selected}
          @click=${this.previousTrackedNode}
        >
          <ha-svg-icon .path=${mdiChevronUp}></ha-svg-icon>
        </mwc-icon-button>
        <mwc-icon-button
          .disabled=${paths.length === 0 ||
          paths[paths.length - 1] === this.selected}
          @click=${this.nextTrackedNode}
        >
          <ha-svg-icon .path=${mdiChevronDown}></ha-svg-icon>
        </mwc-icon-button>
      </div>
    `;
  }

  public selectPath(path: string) {
    const actionHandler = this.getActionHandler(this.trace!);
    let selected: NodeInfo | undefined;

    for (const node of actionHandler.createGraph()) {
      if (node.nodeInfo?.path === path) {
        selected = node.nodeInfo;
        break;
      }
    }

    actionHandler.selected = selected?.path || "";
    this.requestUpdate();
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

    if (changedProps.has("selected")) {
      this.getActionHandler(this.trace).selected = this.selected;
      this.requestUpdate();
    }
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
    const tracked: Record<string, TreeNode> = {};
    for (const node of bfsIterateTreeNodes(
      this.getActionHandler(trace).createGraph()
    )) {
      if (node.isTracked && node.nodeInfo) {
        tracked[node.nodeInfo.path] = node;
      }
    }
    return tracked;
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
