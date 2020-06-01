import { wrap } from "comlink";

import type { api } from "./markdown_worker";

type RenderMarkdownType = api["renderMarkdown"];
type renderMarkdownParamTypes = Parameters<RenderMarkdownType>;

let worker: any | undefined;

export const renderMarkdown = async (
  content: renderMarkdownParamTypes[0],
  markedOptions: renderMarkdownParamTypes[1],
  hassOptions?: renderMarkdownParamTypes[2]
): Promise<ReturnType<RenderMarkdownType>> => {
  if (!worker) {
    worker = wrap(new Worker("./markdown_worker", { type: "module" }));
  }

  return await worker.renderMarkdown(content, markedOptions, hassOptions);
};
