import { html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { HomeAssistant, Route } from "../../../../types";
import "./assist-pipeline-debug";
import "./assist-pipeline-run-debug";

@customElement("assist-debug")
export class AssistDebug extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ attribute: false }) public route!: Route;

  protected render() {
    if (this.route.path) {
      const splitPath = this.route.path.split("/", 3);
      if (splitPath.length < 2) {
        return nothing;
      }
      return html`<assist-pipeline-debug
        .hass=${this.hass}
        .narrow=${this.narrow}
        .pipelineId=${splitPath[1]}
      ></assist-pipeline-debug>`;
    }
    return html`<assist-pipeline-run-debug
      .hass=${this.hass}
      .narrow=${this.narrow}
    ></assist-pipeline-run-debug>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "assist-debug": AssistDebug;
  }
}
