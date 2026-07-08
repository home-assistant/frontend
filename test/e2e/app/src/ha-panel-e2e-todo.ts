import { LitElement, html } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-panel-e2e-todo")
class HaPanelE2ETodo extends LitElement {
  protected render() {
    return html`<span>Todo panel route</span>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-e2e-todo": HaPanelE2ETodo;
  }
}
