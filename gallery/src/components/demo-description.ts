import { html, css, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { until } from "lit/directives/until";
import { haStyle } from "../../../src/resources/styles";
import { DEMOS } from "../../build/import-demos";

@customElement("demo-description")
class DemoDescription extends LitElement {
  @property() public demo!: string;

  render() {
    if (!DEMOS[this.demo].description) {
      return "";
    }
    return html`
      ${until(
        DEMOS[this.demo].description().then(
          (content) => html`
            <ha-card>
              <div class="card-content">${content}</div>
            </ha-card>
          `
        ),
        ""
      )}
    `;
  }

  static styles = [
    haStyle,
    css`
      ha-card {
        max-width: 600px;
        margin: 16px auto;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-description": DemoDescription;
  }
}
