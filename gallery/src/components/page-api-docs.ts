import { css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { until } from "lit/directives/until";
import { HaMarkdown } from "../../../src/components/ha-markdown";
import { PAGES } from "../../build/import-pages";

@customElement("page-api-docs")
class PageApiDocs extends HaMarkdown {
  @property() public page!: string;

  render() {
    if (!PAGES[this.page].apiDocs) {
      return nothing;
    }

    return html`${until(
      PAGES[this.page]
        .apiDocs()
        .then((content) => html`<div class="root">${content}</div>`),
      ""
    )}`;
  }

  static styles = [
    HaMarkdown.styles,
    css`
      :host {
        display: block;
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
    "page-api-docs": PageApiDocs;
  }
}
