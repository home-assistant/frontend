import marked from "marked";
// @ts-ignore
import filterXSS from "xss";

const allowedSvgTags = ["svg", "path"];

const allowedTag = (tag: string) => tag === "ha-icon";

export const renderMarkdown = (
  content: string,
  markedOptions: object,
  hassOptions: {
    // Do not allow SVG on untrusted content, it allows XSS.
    allowSvg?: boolean;
  } = {}
) =>
  filterXSS(marked(content, markedOptions), {
    onIgnoreTag: hassOptions.allowSvg
      ? (tag, html) =>
          allowedTag(tag) || allowedSvgTags.includes(tag) ? html : null
      : (tag, html) => (allowedTag(tag) ? html : null),
  });
