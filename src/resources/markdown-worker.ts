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

const renderMarkdown = async (
  content: string,
  markedOptions: MarkedOptions,
  hassOptions: {
    // Do not allow SVG on untrusted content, it allows XSS.
    allowSvg?: boolean;
  } = {}
): Promise<string> => {
  if (!whiteListNormal) {
    whiteListNormal = {
      ...getDefaultWhiteList(),
      input: ["type", "disabled", "checked"],
      "ha-icon": ["icon"],
      "ha-svg-icon": ["path"],
      "ha-alert": ["alert-type", "title"],
      "ha-hls-player": [
        "controls",
        "url",
        "autoplay",
        "playsinline",
        "posterUrl",
      ],
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

  return filterXSS(await marked(content, markedOptions), {
    whiteList,
    onTagAttr,
  });
};

const api = {
  renderMarkdown,
};

export type Api = typeof api;

expose(api);
