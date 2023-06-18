import { css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { until } from "lit/directives/until";
import { HaMarkdown } from "../../../src/components/ha-markdown";
import { PAGES } from "../../build/import-pages";

@customElement("page-description")
class PageDescription extends HaMarkdown {
  @property() public page!: string;

  render() {
    if (!PAGES[this.page].description) {
      return nothing;
    }

    return html`
      <div class="heading">
        <div class="title">
          ${PAGES[this.page].metadata.title || this.page.split("/")[1]}
        </div>
        <div class="subtitle">${PAGES[this.page].metadata.subtitle}</div>
      </div>
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
      .heading {
        padding: 16px;
        border-bottom: 1px solid var(--secondary-background-color);
      }
      .title {
        font-size: 42px;
        line-height: 56px;
        padding-bottom: 8px;
      }
      .subtitle {
        font-size: 18px;
        line-height: 24px;
      }
      .root {
        max-width: 800px;
        margin: 16px auto;
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
