// To use comlink under ES5
import "proxy-polyfill";
import { expose } from "comlink";
import marked from "marked";
// @ts-ignore
import filterXSS from "xss";

interface WhiteList {
  [tag: string]: string[];
}

let whiteListNormal: WhiteList | undefined;
let whiteListSvg: WhiteList | undefined;

const renderMarkdown = (
  content: string,
  markedOptions: object,
  hassOptions: {
    // Do not allow SVG on untrusted content, it allows XSS.
    allowSvg?: boolean;
  } = {}
): string => {
  if (!whiteListNormal) {
    whiteListNormal = {
      ...filterXSS.whiteList,
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
  });
};

const api = {
  renderMarkdown,
};

export type api = typeof api;

expose(api);
