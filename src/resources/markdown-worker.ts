import { expose } from "comlink";
import type { MarkedOptions } from "marked";
import { marked } from "marked";
import type { IWhiteList } from "xss";
import { filterXSS, getDefaultWhiteList } from "xss";

let whiteListNormal: IWhiteList | undefined;
let whiteListSvg: IWhiteList | undefined;

const renderMarkdown = async (
  content: string,
  markedOptions: MarkedOptions,
  hassOptions: {
    // Do not allow SVG on untrusted content, it allows XSS.
    allowSvg?: boolean;
    allowDataUrl?: boolean;
  } = {}
): Promise<string[]> => {
  if (!whiteListNormal) {
    whiteListNormal = {
      ...getDefaultWhiteList(),
      table: [...(getDefaultWhiteList().table ?? []), "role"],
      input: ["type", "disabled", "checked"],
      "ha-icon": ["icon"],
      "ha-svg-icon": ["path"],
      "ha-alert": ["alert-type", "title"],
      "ha-qr-code": [
        "data",
        "scale",
        "width",
        "margin",
        "error-correction-level",
        "center-image",
      ],
    };
  }

  let whiteList: IWhiteList | undefined;

  if (hassOptions.allowSvg) {
    if (!whiteListSvg) {
      whiteListSvg = {
        ...whiteListNormal,
        svg: ["xmlns", "height", "width"],
        path: ["transform", "stroke", "d"],
        img: ["src"],
      };
    }
    whiteList = whiteListSvg;
  } else {
    whiteList = whiteListNormal;
  }
  if (hassOptions.allowDataUrl && whiteList.a) {
    whiteList.a.push("download");
  }

  marked.setOptions(markedOptions);

  marked.use({
    renderer: {
      table(...args) {
        const defaultRenderer = new marked.Renderer();
        // Wrap the table with block element because the property 'overflow'
        // cannot be applied to elements of display type 'table'.
        // https://www.w3.org/TR/css-overflow-3/#overflow-control
        return `<div>${defaultRenderer.table.apply(this, args)}</div>`;
      },
    },
  });

  const tokens = marked.lexer(content);
  return tokens.map((token) =>
    filterXSS(marked.parser([token]), {
      whiteList,
      onTagAttr: (
        tag: string,
        name: string,
        value: string
      ): string | undefined => {
        // Override the default `onTagAttr` behavior to only render
        // our markdown checkboxes.
        // Returning undefined causes the default measure to be taken
        // in the xss library.
        if (tag === "input") {
          if (
            (name === "type" && value === "checkbox") ||
            name === "checked" ||
            name === "disabled"
          ) {
            return undefined;
          }
          return "";
        }
        if (
          hassOptions.allowDataUrl &&
          tag === "a" &&
          name === "href" &&
          value.startsWith("data:")
        ) {
          return `href="${value}"`;
        }
        return undefined;
      },
    })
  );
};

const api = {
  renderMarkdown,
};

export type Api = typeof api;

expose(api);
