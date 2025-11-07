import { LitElement, css, html } from "lit";
import { customElement } from "lit/decorators";

@customElement("logs-app")
class LogsApp extends LitElement {
  render() {
    return html`
      <div class="container">
        <h1>Logs Application</h1>
        <p>This is a minimal logs frontend application.</p>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      height: 100vh;
      background-color: var(--ha-color-surface-default);
    }

    .container {
      padding: var(--ha-space-3xl);
      max-width: 1200px;
      margin: 0 auto;
    }

    h1 {
      font-size: var(--ha-font-size-4xl);
      font-weight: var(--ha-font-weight-regular);
      line-height: var(--ha-line-height-tight);
      margin: 0 0 var(--ha-space-md) 0;
      color: var(--ha-color-text-primary);
    }

    p {
      font-size: var(--ha-font-size-md);
      line-height: var(--ha-line-height-normal);
      color: var(--ha-color-text-secondary);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "logs-app": LogsApp;
  }
}
