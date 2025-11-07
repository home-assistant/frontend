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
    }

    .container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    h1 {
      font-size: 32px;
      font-weight: 400;
      margin: 0 0 16px 0;
      color: var(--primary-text-color, #212121);
    }

    p {
      font-size: 16px;
      line-height: 1.5;
      color: var(--secondary-text-color, #727272);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "logs-app": LogsApp;
  }
}
