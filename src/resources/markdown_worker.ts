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

export type Api = typeof api;

expose(api);
