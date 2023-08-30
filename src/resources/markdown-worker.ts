// To use comlink under ES5
import "proxy-polyfill";
import { expose } from "comlink";
import { marked, MarkedOptions } from "marked";
import { filterXSS, getDefaultWhiteList, IWhiteList } from "xss";

let whiteListNormal: IWhiteList | undefined;
let whiteListSvg: IWhiteList | undefined;

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
  markedOptions: MarkedOptions,
  hassOptions: {
    // Do not allow SVG on untrusted content, it allows XSS.
    allowSvg?: boolean;
  } = {}
): string => {
  if (!whiteListNormal) {
    whiteListNormal = {
      ...getDefaultWhiteList(),
      input: ["type", "disabled", "checked"],
      "ha-icon": ["icon"],
      "ha-svg-icon": ["path"],
      "ha-alert": ["alert-type", "title"],
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
