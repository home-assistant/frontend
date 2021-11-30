// To use comlink under ES5
import { expose } from "comlink";
import marked from "marked";
import "proxy-polyfill";
import { filterXSS, getDefaultWhiteList } from "xss";

interface WhiteList {
  [tag: string]: string[];
}

let whiteListNormal: WhiteList | undefined;
let whiteListSvg: WhiteList | undefined;

// Override the default `onTagAttr` behavior to only render
// our markdown checkboxes.
// Returning undefined causes the default measure to be taken
// in the xss library.
const onTagAttr = (
  tag: string,
  name: string,
  value: string
): string | undefined => {
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
  return undefined;
};

const renderMarkdown = (
  content: string,
  markedOptions: marked.MarkedOptions,
  hassOptions: {
    // Do not allow SVG on untrusted content, it allows XSS.
    allowSvg?: boolean;
  } = {}
): string => {
  if (!whiteListNormal) {
    whiteListNormal = {
      ...(getDefaultWhiteList() as WhiteList),
      input: ["type", "disabled", "checked"],
      "ha-icon": ["icon"],
      "ha-svg-icon": ["path"],
    };
  }

  let whiteList: WhiteList | undefined;

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

  return filterXSS(marked(content, markedOptions), {
    whiteList,
    onTagAttr,
  });
};

const api = {
  renderMarkdown,
};

export type Api = typeof api;

expose(api);
