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
        PAGES[this.page]
          .description()
          .then((content) => html`<div class="root">${content}</div>`),
        ""
      )}
    `;
  }

  static styles = [
    HaMarkdown.styles,
    css`
      .root {
        max-width: 800px;
        margin: 0 auto;
      }
      .root > *:first-child {
        margin-top: 0;
      }
      .root > *:last-child {
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
