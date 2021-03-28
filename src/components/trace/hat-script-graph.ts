import { html, LitElement, property, customElement } from "lit-element";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { AutomationTraceExtended } from "../../data/trace";
import { bfsIterateTreeNodes, NodeInfo } from "./hat-graph";
import { ActionHandler } from "./script-to-graph";

declare global {
  interface HASSDomEvents {
    "graph-node-selected": NodeInfo;
  }
}

@customElement("hat-script-graph")
class HatScriptGraph extends LitElement {
  @property({ attribute: false }) public trace?: AutomationTraceExtended;

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
      [],
      this.trace
    );
  });

  protected render() {
    if (!this.trace) {
      return html``;
    }
    const actionHandler = this.getActionHandler(this.trace);
    return html`<hat-graph .tree=${actionHandler.createGraph()}></hat-graph>`;
  }

  public selectPath(path: string) {
    const actionHandler = this.getActionHandler(this.trace!);
    let selected: NodeInfo | undefined;

    for (const node of actionHandler.createGraph()) {
      if (node.nodeInfo.path === path) {
        selected = node.nodeInfo;
        break;
      }
    }

    actionHandler.selected = selected?.idx || [];
    this.requestUpdate();
  }

  public getNodes() {
    if (!this.trace) {
      return [];
    }
    return Array.from(
      bfsIterateTreeNodes(this.getActionHandler(this.trace).createGraph())
    );
  }

  /**
   * Select the next trackced node.
   * @param path Optional path. Will select next node after this one.
   */
  public selectNextTrackedNode(path?: string) {
    const actionHandler = this.getActionHandler(this.trace!);
    let selected: NodeInfo | undefined;
    let pathMatched = path === undefined;

    for (const node of bfsIterateTreeNodes(actionHandler.createGraph())) {
      if (pathMatched) {
        if (node.isTracked) {
          selected = node.nodeInfo;
          break;
        }
        continue;
      }

      if (node.nodeInfo.path === path) {
        pathMatched = true;
      }
    }

    actionHandler.selected = selected?.idx || [];
    this.requestUpdate();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hat-script-graph": HatScriptGraph;
  }
}
