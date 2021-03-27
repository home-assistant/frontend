import { html, LitElement, property, customElement } from "lit-element";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { AutomationTraceExtended } from "../../data/trace";
import "./hat-graph";
import { ActionHandler, SelectParams } from "./script-to-graph";

declare global {
  interface HASSDomEvents {
    "graph-node-selected": SelectParams;
    change: undefined;
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
      (params) => {
        // eslint-disable-next-line no-console
        console.log(params);
        fireEvent(this, "graph-node-selected", params);
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
    return html`<hat-graph .tree=${actionHandler.graph}></hat-graph>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hat-script-graph": HatScriptGraph;
  }
}
