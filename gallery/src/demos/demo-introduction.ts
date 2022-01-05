import { css, html, LitElement, TemplateResult } from "lit";
import { customElement } from "lit/decorators";
import "../../../src/components/ha-markdown";

@customElement("demo-introduction")
export class DemoIntroduction extends LitElement {
  protected render(): TemplateResult {
    return html`
      <ha-card header="Welcome!">
        <div class="card-content">
          <ha-markdown
            .content=${`
Lovelace has many different cards. Each card allows the user to tell
a different story about what is going on in their house. These cards
are very customizable, as no household is the same.

This gallery helps our developers and designers to see all the
different states that each card can be in.

Check [the Lovelace documentation](https://www.home-assistant.io/lovelace) for instructions on how to get started with Lovelace.
          `}
          ></ha-markdown>
        </div>
      </ha-card>
    `;
  }

  static get styles() {
    return css`
      ha-card {
        max-width: 600px;
        margin: 24px auto;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-introduction": DemoIntroduction;
  }
}
