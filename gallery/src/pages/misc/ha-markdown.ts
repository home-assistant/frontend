import { css, html, LitElement } from "lit";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-markdown";

import { customElement } from "lit/decorators";

interface MarkdownContent {
  content: string;
  breaks: boolean;
  allowSvg: boolean;
  lazyImages: boolean;
}

const mdContentwithDefaults = (md: Partial<MarkdownContent>) =>
  ({
    breaks: false,
    allowSvg: false,
    lazyImages: false,
    ...md,
  }) as MarkdownContent;

const generateContent = (md) => `
\`\`\`json
${JSON.stringify({ ...md, content: undefined })}
\`\`\`

---

${md.content}
`;

const markdownContents: MarkdownContent[] = [
  mdContentwithDefaults({
    content: "_Hello_ **there** 👋, ~~nice~~ of you ||to|| show up.",
  }),
  ...[true, false].map((breaks) =>
    mdContentwithDefaults({
      breaks,
      content: `
![image](https://img.shields.io/badge/markdown-rendering-brightgreen)
![image](https://img.shields.io/badge/markdown-rendering-blue)

> [!TIP]
> Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer dictum quis ante eu eleifend. Integer sed [consectetur est, nec elementum magna](#). Fusce lobortis lectus ac rutrum tincidunt. Quisque suscipit gravida ante, in convallis risus vulputate non.

key | description
--  | --
lorem | ipsum

- list item 1
- list item 2


    `,
    })
  ),
];

@customElement("demo-misc-ha-markdown")
export class DemoMiscMarkdown extends LitElement {
  protected render() {
    return html`
      <div class="container">
        ${markdownContents.map(
          (md) =>
            html`<ha-card>
              <ha-markdown
                .content=${generateContent(md)}
                .breaks=${md.breaks}
                .allowSvg=${md.allowSvg}
                .lazyImages=${md.lazyImages}
              ></ha-markdown>
            </ha-card>`
        )}
      </div>
    `;
  }

  static get styles() {
    return css`
      ha-card {
        margin: 12px;
        padding: 12px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-misc-ha-markdown": DemoMiscMarkdown;
  }
}
