import { expose } from "comlink";
import type { MarkedOptions } from "marked";
import { marked } from "marked";
import type { IWhiteList } from "xss";
import {
  escapeAttrValue,
  filterXSS,
  friendlyAttrValue,
  getDefaultWhiteList,
  safeAttrValue,
} from "xss";

let whiteListNormal: IWhiteList | undefined;
let whiteListSvg: IWhiteList | undefined;

// The CSS filter is only used for `style` attributes
const cssFilter = { process: (css: string) => css };

// xss only checks the protocol of `src` and `href`, so check every URL in
// `srcset` the same way. Returns the attribute to render, or "" to drop it.
const sanitizeSrcset = (value: string): string => {
  // Decode entities like xss does, and `&amp;` so query strings keep working
  const decoded = friendlyAttrValue(value).replace(/&amp;/g, "&");
  // Split at every comma and space. That is stricter than the browser (which
  // allows commas inside a URL), so every URL the browser reads starts with
  // one of these parts.
  const allowed = decoded.split(/[\s,]+/).every(
    (part) =>
      !part ||
      // A width or density descriptor such as `800w` or `2x`
      /^\d+(?:\.\d+)?[wx]$/.test(part) ||
      // `safeAttrValue` decodes again, so a part with entities left over
      // (`&#38;#58;` leaves `&#58;`) would be checked as text the browser
      // never sees. Drop it instead.
      (friendlyAttrValue(part) === part &&
        safeAttrValue("img", "src", part, cssFilter) !== "")
  );
  // xss would write the value back with `&` unescaped, so the browser would
  // decode it a second time. Escape it so the browser reads what was checked.
  return allowed
    ? `srcset="${escapeAttrValue(decoded.replace(/&/g, "&amp;"))}"`
    : "";
};

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
      // Allows <picture>, and <video>/<audio> that have <source> children.
      picture: [],
      source: ["src", "srcset", "sizes", "media", "type"],
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
        if (tag === "source" && name === "srcset") {
          return sanitizeSrcset(value);
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
