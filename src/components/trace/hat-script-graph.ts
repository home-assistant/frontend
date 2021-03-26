import { html, LitElement, property, customElement } from "lit-element";
import memoizeOne from "memoize-one";
import { AutomationTraceExtended } from "../../data/trace";
import "./hat-graph";
import { ActionHandler } from "./script-to-graph";

@customElement("hat-script-graph")
class HatScriptGraph extends LitElement {
  @property({ attribute: false }) public trace?: AutomationTraceExtended;

  private getActionHandler = memoizeOne((trace: AutomationTraceExtended) => {
    return new ActionHandler(
      trace.config.action,
      false,
      undefined,
      (path, action, update) => {
        // eslint-disable-next-line no-console
        console.log(path);
        this.requestUpdate();
      }
    );
  });

  protected render() {
    if (!this.trace) {
      return html``;
    }
    const actionHandler = this.getActionHandler(this.trace);
    return html` <hat-graph .tree=${actionHandler.graph}></hat-graph> `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hat-script-graph": HatScriptGraph;
  }
}
