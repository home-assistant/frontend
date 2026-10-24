import { mdiUnfoldMoreHorizontal } from "@mdi/js";
import {
  css,
  html,
  LitElement,
  type PropertyValues,
  type TemplateResult,
} from "lit";
import {
  customElement,
  property,
  query,
  queryAll,
  state as litState,
} from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import "./ha-button";
import "./ha-svg-icon";

const LINE_TIMESTAMP = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/;

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

  @property({ type: Boolean, attribute: "wrap-disabled" }) public wrapDisabled =
    false;

  // Lines to show before and after each line that matches the filter.
  @property({ type: Number, attribute: "context-lines" }) public contextLines =
    0;

  // Text for the button that shows a run of hidden lines between matches.
  @property({ attribute: false }) public expandLabel?: (
    count: number
  ) => string;

  @query("pre") private _pre?: HTMLPreElement;

  @queryAll("div") private _divs!: NodeListOf<HTMLDivElement>;

  @litState() private _filter = "";

  // Hidden lines the user chose to show while a filter is set.
  private _expandedLines = new WeakSet<HTMLDivElement>();

  // The hidden lines each expand row shows when clicked.
  private _expandGaps = new WeakMap<HTMLElement, HTMLDivElement[]>();

  protected render(): TemplateResult {
    return html`<pre class=${classMap({ wrap: !this.wrapDisabled })}></pre>`;
  }

  protected firstUpdated(_changedProperties: PropertyValues<this>): void {
    super.firstUpdated(_changedProperties);

    // handle initial content
    if (this.content) {
      this.parseTextToColoredPre(this.content);
    }
  }

  static styles = css`
    pre {
      margin: 0;
    }
    pre.wrap {
      white-space: pre-wrap;
      overflow-wrap: break-word;
    }
    .context {
      color: var(--secondary-text-color);
    }
    .expand {
      display: block;
      margin: var(--ha-space-1) 0;
      font-family: var(--ha-font-family-body);
      white-space: normal;
    }
    .bold {
      font-weight: var(--ha-font-weight-bold);
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
      background-color: var(--ha-color-fill-primary-normal-resting);
    }
  `;

  /**
   * add new lines to the log
   * @param lines log lines
   * @param top should the new lines be added to the top of the log
   */
  public parseLinesToColoredPre(lines: string[], top = false) {
    for (const line of lines) {
      this._addLine(line, top);
    }

    // Filter once all lines are added, keeping the hidden lines already shown
    if (this._filter) {
      this.filterLines(this._filter);
    }
  }

  /**
   * Add a single line to the log
   * @param line log line
   * @param top should the new line be added to the top of the log
   */
  public parseLineToColoredPre(line, top = false) {
    this.parseLinesToColoredPre([line], top);
  }

  private _addLine(line: string, top: boolean) {
    const lineDiv = document.createElement("div");

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

    const addPart = (content) => {
      const span = document.createElement("span");
      if (state.bold) {
        span.classList.add("bold");
      }
      if (state.italic) {
        span.classList.add("italic");
      }
      if (state.underline) {
        span.classList.add("underline");
      }
      if (state.strikethrough) {
        span.classList.add("strikethrough");
      }
      if (state.foregroundColor !== null) {
        span.classList.add(`fg-${state.foregroundColor}`);
      }
      if (state.backgroundColor !== null) {
        span.classList.add(`bg-${state.backgroundColor}`);
      }
      span.appendChild(document.createTextNode(content));
      lineDiv.appendChild(span);
    };

    let match;

    while ((match = re.exec(line)) !== null) {
      const j = match!.index;
      const substring = line.substring(i, j);
      if (substring) {
        addPart(substring);
      }
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

    const substring = line.substring(i);
    if (substring) {
      addPart(substring);
    }

    if (top) {
      this._pre?.prepend(lineDiv);
      lineDiv.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500 });
    } else {
      this._pre?.appendChild(lineDiv);
    }
  }

  public parseTextToColoredPre(text) {
    this.parseLinesToColoredPre(text.split("\n"));
  }

  /**
   * Filter lines based on a search string, lines and search string will be converted to lowercase
   * @param filter the search string
   * @returns true if there are lines to display
   */
  filterLines(filter: string): boolean {
    if (filter !== this._filter) {
      this._expandedLines = new WeakSet();
    }
    this._filter = filter;
    const lines = this._divs;
    let numberOfFoundLines = 0;
    if (!filter) {
      lines.forEach((line) => {
        line.style.display = "";
        line.classList.remove("context");
      });
      numberOfFoundLines = lines.length;
      if (CSS.highlights) {
        CSS.highlights.delete("search-results");
      }
    } else {
      const highlightRanges: Range[] = [];

      const lineList = Array.from(lines);

      const matches = lineList.map(
        (line) =>
          line.textContent?.toLowerCase().includes(filter.toLowerCase()) ??
          false
      );

      // A line without a timestamp continues the entry above it, such as a
      // build's output, so a matching entry shows all of its lines.
      let entryStart = -1;

      const entryOf = lineList.map((line, lineIndex) => {
        if (LINE_TIMESTAMP.test(line.textContent ?? "")) {
          entryStart = lineIndex;
        }

        return entryStart === -1 ? lineIndex : entryStart;
      });

      const matchedEntries = new Set(
        entryOf.filter((_entry, lineIndex) => matches[lineIndex])
      );

      const inMatch = entryOf.map(
        (entry, lineIndex) =>
          matches[lineIndex] ||
          (this.contextLines > 0 && matchedEntries.has(entry))
      );

      // Like a diff, also show the lines around each match.
      const visible = inMatch.map(
        (_match, lineIndex) =>
          this._expandedLines.has(lineList[lineIndex]) ||
          inMatch
            .slice(
              Math.max(0, lineIndex - this.contextLines),
              lineIndex + this.contextLines + 1
            )
            .some(Boolean)
      );

      // A button in place of a single hidden line takes as much room as the
      // line, so show the line instead. Buttons only show around matches.
      if (this.contextLines > 0 && matchedEntries.size) {
        visible.forEach((shown, lineIndex) => {
          if (
            !shown &&
            visible[lineIndex - 1] !== false &&
            visible[lineIndex + 1] !== false
          ) {
            visible[lineIndex] = true;
          }
        });
      }

      lineList.forEach((line, lineIndex) => {
        line.classList.toggle(
          "context",
          visible[lineIndex] && !inMatch[lineIndex]
        );

        if (!visible[lineIndex]) {
          line.style.display = "none";
        } else if (!matches[lineIndex]) {
          line.style.display = "";
        } else {
          line.style.display = "";
          numberOfFoundLines++;
          if (CSS.highlights && line.firstChild !== null && line.textContent) {
            const spansOfLine = line.querySelectorAll("span");
            spansOfLine.forEach((span) => {
              const text = span.textContent.toLowerCase();
              const indices: number[] = [];
              let startPos = 0;
              while (startPos < text.length) {
                const index = text.indexOf(filter.toLowerCase(), startPos);
                if (index === -1) break;
                indices.push(index);
                startPos = index + filter.length;
              }

              indices.forEach((index) => {
                const range = new Range();
                range.setStart(span.firstChild!, index);
                range.setEnd(span.firstChild!, index + filter.length);
                highlightRanges.push(range);
              });
            });
          }
        }
      });
      if (CSS.highlights) {
        CSS.highlights.set("search-results", new Highlight(...highlightRanges));
      }

      if (this.contextLines && numberOfFoundLines) {
        this._updateExpandButtons(lineList, visible);

        return true;
      }
    }

    this._updateExpandButtons([], []);

    return !!numberOfFoundLines;
  }

  // Filtering runs again for every new log line, so rows for unchanged gaps
  // are kept rather than recreated, which would drop keyboard focus.
  private _updateExpandButtons(lines: HTMLDivElement[], visible: boolean[]) {
    const rows = new Map<Element | null, HTMLSpanElement>();
    this._pre?.querySelectorAll(".expand").forEach((row) => {
      if (row instanceof HTMLSpanElement) {
        rows.set(row.nextElementSibling, row);
      }
    });

    let hidden: HTMLDivElement[] = [];

    lines.forEach((line, lineIndex) => {
      if (!visible[lineIndex]) {
        hidden.push(line);
      }

      if (
        hidden.length &&
        (visible[lineIndex] || lineIndex === lines.length - 1)
      ) {
        const label = this.expandLabel?.(hidden.length) ?? `${hidden.length}`;
        let row = rows.get(hidden[0]);

        if (row) {
          rows.delete(hidden[0]);
          const text = row.querySelector("ha-button")?.lastChild;

          if (text instanceof Text && text.data !== label) {
            text.data = label;
          }
        } else {
          row = this._createExpandRow(label);
          hidden[0].before(row);
        }

        this._expandGaps.set(row, hidden);
        hidden = [];
      }
    });

    rows.forEach((row) => row.remove());
  }

  private _createExpandRow(label: string): HTMLSpanElement {
    const row = document.createElement("span");
    row.className = "expand";
    const button = document.createElement("ha-button");
    button.setAttribute("appearance", "filled");
    button.setAttribute("variant", "neutral");
    button.setAttribute("size", "s");
    const icon = document.createElement("ha-svg-icon");
    icon.slot = "start";
    icon.path = mdiUnfoldMoreHorizontal;
    button.append(icon, label);
    button.addEventListener("click", () => {
      const gap = this._expandGaps.get(row) ?? [];
      const hadFocus = row.matches(":focus-within");
      gap.forEach((hiddenLine) => this._expandedLines.add(hiddenLine));
      this.filterLines(this._filter);

      // The row is gone once its lines show, so keep focus on the first of them.
      if (hadFocus && gap[0]) {
        gap[0].tabIndex = -1;
        gap[0].focus({ preventScroll: true });
      }
    });
    row.append(button);

    return row;
  }

  public trimLines(maxLines: number) {
    const lines = this._divs;

    if (lines.length <= maxLines) {
      return;
    }

    Array.from(lines)
      .slice(0, lines.length - maxLines)
      .forEach((line) => line.remove());

    if (this._filter) {
      this.filterLines(this._filter);
    }
  }

  public clear() {
    if (this._pre) {
      this._pre.innerHTML = "";
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-ansi-to-html": HaAnsiToHtml;
  }
}
