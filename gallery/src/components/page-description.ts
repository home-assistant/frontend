import { html, css } from "lit";
import { customElement, property } from "lit/decorators";
import { until } from "lit/directives/until";
import { HaMarkdown } from "../../../src/components/ha-markdown";
import { PAGES } from "../../build/import-pages";

@customElement("page-description")
class PageDescription extends HaMarkdown {
  @property() public page!: string;

  render() {
    if (!PAGES[this.page].description) {
      return html``;
    }
    return html`
      ${until(
        PAGES[this.page].description().then(
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
    HaMarkdown.styles,
    css`
      ha-card {
        max-width: 600px;
        margin: 16px auto;
      }
      .card-content > *:first-child {
        margin-top: 0;
      }
      .card-content > *:last-child {
        margin-bottom: 0;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "page-description": PageDescription;
  }
}
