import { css } from "lit-element";

export const ANSI_HTML_STYLE = css`
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
    color: rgb(222, 56, 43);
  }
  .fg-green {
    color: rgb(57, 181, 74);
  }
  .fg-yellow {
    color: rgb(255, 199, 6);
  }
  .fg-blue {
    color: rgb(0, 111, 184);
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
    background-color: rgb(222, 56, 43);
  }
  .bg-green {
    background-color: rgb(57, 181, 74);
  }
  .bg-yellow {
    background-color: rgb(255, 199, 6);
  }
  .bg-blue {
    background-color: rgb(0, 111, 184);
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
`;

export function parseTextToColoredPre(text) {
  const pre = document.createElement("pre");
  const re = /\033(?:\[(.*?)[@-~]|\].*?(?:\007|\033\\))/g;
  let i = 0;

  const state = {
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    foregroundColor: null,
    backgroundColor: null,
  };

  const addSpan = (content) => {
    const span = document.createElement("span");
    if (state.bold) span.classList.add("bold");
    if (state.italic) span.classList.add("italic");
    if (state.underline) span.classList.add("underline");
    if (state.strikethrough) span.classList.add("strikethrough");
    if (state.foregroundColor !== null)
      span.classList.add(`fg-${state.foregroundColor}`);
    if (state.backgroundColor !== null)
      span.classList.add(`bg-${state.backgroundColor}`);
    span.appendChild(document.createTextNode(content));
    pre.appendChild(span);
  };

  /* eslint-disable no-cond-assign */
  let match;
  while ((match = re.exec(text)) !== null) {
    const j = match.index;
    addSpan(text.substring(i, j));
    i = j + match[0].length;

    if (match[1] === undefined) continue;

    match[1].split(";").forEach((colorCode) => {
      switch (parseInt(colorCode)) {
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
  addSpan(text.substring(i));

  return pre;
}
