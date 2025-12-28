import xss from "xss";

export const filterXSS = (html: string) =>
  xss(html, {
    whiteList: {},
    stripIgnoreTag: true,
    stripIgnoreTagBody: true,
  });
