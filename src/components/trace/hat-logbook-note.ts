import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators";

@customElement("hat-logbook-note")
class HatLogbookNote extends LitElement {
  render() {
    return html`
      Not all shown logbook entries might be related to this automation.
    `;
  }

  static styles = css`
    :host {
      display: block;
      text-align: center;
      font-style: italic;
      padding: 16px;
      margin-top: 8px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hat-logbook-note": HatLogbookNote;
  }
}
