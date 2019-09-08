import marked from "marked";
// @ts-ignore
import filterXSS from "xss";

interface WhiteList {
  [tag: string]: string[];
}

let whiteListNormal: WhiteList | undefined;
let whiteListSvg: WhiteList | undefined;

export const renderMarkdown = (
  content: string,
  markedOptions: object,
  hassOptions: {
    // Do not allow SVG on untrusted content, it allows XSS.
    allowSvg?: boolean;
  } = {}
) => {
  if (!whiteListNormal) {
    whiteListNormal = {
      ...filterXSS.whiteList,
      "ha-icon": ["icon"],
    };
  }

  let whiteList: WhiteList | undefined;

  if (hassOptions.allowSvg) {
    if (!whiteListSvg) {
      whiteListSvg = {
        ...whiteListNormal,
        svg: ["xmlns", "height", "width"],
        path: ["transform", "stroke", "d"],
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
