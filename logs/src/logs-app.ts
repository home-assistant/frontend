import { LitElement, css, html } from "lit";
import { customElement } from "lit/decorators";
import "../../../src/components/ha-card";

@customElement("logs-app")
class LogsApp extends LitElement {
  render() {
    return html`
      <main class="container">
        <ha-card>
          <h1>Home Assistant Logs</h1>
          <p>View and search logs to diagnose issues</p>
        </ha-card>
      </main>
    `;
  }

  static styles = css`
    :host {
      display: block;
      height: 100vh;
      background-color: var(--ha-color-surface-default);
    }

    .container {
      padding: var(--ha-space-12);
      max-width: 1200px;
      margin: 0 auto;
    }

    h1 {
      font-size: var(--ha-font-size-4xl);
      font-weight: var(--ha-font-weight-normal);
      line-height: var(--ha-line-height-condensed);
      margin: 0 0 var(--ha-space-4) 0;
      color: var(--ha-color-text-primary);
    }

    p {
      font-size: var(--ha-font-size-m);
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
