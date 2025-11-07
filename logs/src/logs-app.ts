import { LitElement, css, html } from "lit";
import { customElement } from "lit/decorators";
import "./logs-viewer";

@customElement("logs-app")
class LogsApp extends LitElement {
  render() {
    return html`<logs-viewer></logs-viewer>`;
  }

  static styles = css`
    :host {
      display: block;
      min-height: 100vh;
      background-color: var(--primary-background-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "logs-app": LogsApp;
  }
}
