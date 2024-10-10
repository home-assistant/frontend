import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, query } from "lit/decorators";

interface State {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  foregroundColor: null | string;
  backgroundColor: null | string;
}

@customElement("ha-ansi-to-html")
export class HaAnsiToHtml extends LitElement {
  @property() public content!: string;

  @query("pre") private _pre!: HTMLPreElement;

  protected render(): TemplateResult | void {
    return html`<pre></pre>`;
  }

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);

    // handle initial content
    if (this.content) {
      this.parseTextToColoredPre(this.content);
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      pre {
        overflow-x: auto;
        white-space: pre-wrap;
        overflow-wrap: break-word;
        margin: 0;
      }
      .bold {
        font-weight: bold;
      }
      .italic {
        font-style: italic;
      }
      .underline {
        text-decoration: underline;
      }
      .strikethrough {
        text-decoration: line-through;
      }
      .underline.strikethrough {
        text-decoration: underline line-through;
      }
      .fg-red {
        color: var(--error-color);
      }
      .fg-green {
        color: var(--success-color);
      }
      .fg-yellow {
        color: var(--warning-color);
      }
      .fg-blue {
        color: var(--info-color);
      }
      .fg-magenta {
        color: rgb(118, 38, 113);
      }
      .fg-cyan {
        color: rgb(44, 181, 233);
      }
      .fg-white {
        color: rgb(204, 204, 204);
      }
      .bg-black {
        background-color: rgb(0, 0, 0);
      }
      .bg-red {
        background-color: var(--error-color);
      }
      .bg-green {
        background-color: var(--success-color);
      }
      .bg-yellow {
        background-color: var(--warning-color);
      }
      .bg-blue {
        background-color: var(--info-color);
      }
      .bg-magenta {
        background-color: rgb(118, 38, 113);
      }
      .bg-cyan {
        background-color: rgb(44, 181, 233);
      }
      .bg-white {
        background-color: rgb(204, 204, 204);
      }

      ::highlight(search-results) {
        background-color: var(--primary-color);
        border-radius: 4px;
        color: var(--text-primary-color);
      }
    `;
  }

  public parseLinesToColoredPre(lines: string[]) {
    for (const line of lines) {
      this.parseLineToColoredPre(line);
    }
  }

  public parseLineToColoredPre(line) {
    // eslint-disable-next-line no-control-regex
    const re = /\x1b(?:\[(.*?)[@-~]|\].*?(?:\x07|\x1b\\))/g;
    let i = 0;

    const state: State = {
      bold: false,
      italic: false,
      underline: false,
      strikethrough: false,
      foregroundColor: null,
      backgroundColor: null,
    };

    const addLine = (content) => {
      const div = document.createElement("div");
      if (state.bold) {
        div.classList.add("bold");
      }
      if (state.italic) {
        div.classList.add("italic");
      }
      if (state.underline) {
        div.classList.add("underline");
      }
      if (state.strikethrough) {
        div.classList.add("strikethrough");
      }
      if (state.foregroundColor !== null) {
        div.classList.add(`fg-${state.foregroundColor}`);
      }
      if (state.backgroundColor !== null) {
        div.classList.add(`bg-${state.backgroundColor}`);
      }
      div.appendChild(document.createTextNode(content));
      this._pre.appendChild(div);
    };

    /* eslint-disable no-cond-assign */
    let match;
    // eslint-disable-next-line
    while ((match = re.exec(line)) !== null) {
      const j = match!.index;
      addLine(line.substring(i, j));
      i = j + match[0].length;

      if (match[1] === undefined) {
        continue;
      }

      match[1].split(";").forEach((colorCode: string) => {
        switch (parseInt(colorCode, 10)) {
          case 0:
            // reset
            state.bold = false;
            state.italic = false;
            state.underline = false;
            state.strikethrough = false;
            state.foregroundColor = null;
            state.backgroundColor = null;
            break;
          case 1:
            state.bold = true;
            break;
          case 3:
            state.italic = true;
            break;
          case 4:
            state.underline = true;
            break;
          case 9:
            state.strikethrough = true;
            break;
          case 22:
            state.bold = false;
            break;
          case 23:
            state.italic = false;
            break;
          case 24:
            state.underline = false;
            break;
          case 29:
            state.strikethrough = false;
            break;
          case 30:
            // foreground black
            state.foregroundColor = null;
            break;
          case 31:
            state.foregroundColor = "red";
            break;
          case 32:
            state.foregroundColor = "green";
            break;
          case 33:
            state.foregroundColor = "yellow";
            break;
          case 34:
            state.foregroundColor = "blue";
            break;
          case 35:
            state.foregroundColor = "magenta";
            break;
          case 36:
            state.foregroundColor = "cyan";
            break;
          case 37:
            state.foregroundColor = "white";
            break;
          case 39:
            // foreground reset
            state.foregroundColor = null;
            break;
          case 40:
            state.backgroundColor = "black";
            break;
          case 41:
            state.backgroundColor = "red";
            break;
          case 42:
            state.backgroundColor = "green";
            break;
          case 43:
            state.backgroundColor = "yellow";
            break;
          case 44:
            state.backgroundColor = "blue";
            break;
          case 45:
            state.backgroundColor = "magenta";
            break;
          case 46:
            state.backgroundColor = "cyan";
            break;
          case 47:
            state.backgroundColor = "white";
            break;
          case 49:
            // background reset
            state.backgroundColor = null;
            break;
        }
      });
    }
    addLine(line.substring(i));
  }

  public parseTextToColoredPre(text) {
    const lines = text.split("\n");

    for (const line of lines) {
      this.parseLineToColoredPre(`${line}\n`);
    }
  }

  /**
   * Filter lines based on a search string, lines and search string will be converted to lowercase
   * @param filter the search string
   * @returns true if there are lines to display
   */
  filterLines(filter: string): boolean {
    const lines = this.shadowRoot?.querySelectorAll("div") || [];
    if (!filter) {
      lines.forEach((line) => {
        line.style.display = "";
      });
      if (CSS.highlights) {
        CSS.highlights.delete("search-results");
      }
    } else {
      const highlightRanges: Range[] = [];
      lines.forEach((line) => {
        if (
          !line.textContent?.toLowerCase().includes(filter.toLocaleLowerCase())
        ) {
          line.style.display = "none";
        } else {
          line.style.display = "";
          if (CSS.highlights && line.firstChild !== null && line.textContent) {
            const text = line.textContent.toLowerCase();
            const indices: number[] = [];
            let startPos = 0;
            while (startPos < text.length) {
              const index = text.indexOf(filter, startPos);
              if (index === -1) break;
              indices.push(index);
              startPos = index + filter.length;
            }

            indices.forEach((index) => {
              const range = new Range();
              range.setStart(line.firstChild!, index);
              range.setEnd(line.firstChild!, index + filter.length);
              highlightRanges.push(range);
            });
          }
        }
      });
      if (CSS.highlights) {
        CSS.highlights.set("search-results", new Highlight(...highlightRanges));
      }
    }

    return !!lines.length;
  }

  public clear() {
    this._pre.innerHTML = "";
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-ansi-to-html": HaAnsiToHtml;
  }
}
