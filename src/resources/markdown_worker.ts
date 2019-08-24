import marked from "marked";
// @ts-ignore
import filterXSS from "xss";

export const renderMarkdown = (content: string, markedOptions: object) =>
  filterXSS(marked(content, markedOptions), {
    onIgnoreTag(tag, html) {
      return ["svg", "path", "ha-icon"].indexOf(tag) !== -1 ? html : null;
    },
  });
