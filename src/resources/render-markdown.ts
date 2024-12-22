import { Remote, wrap } from "comlink";
import type { Api } from "./markdown-worker";

type RenderMarkdownType = Api["renderMarkdown"];
type RenderMarkdownParamTypes = Parameters<RenderMarkdownType>;

let worker: Remote<Api> | undefined;

export const renderMarkdown = async (
  content: RenderMarkdownParamTypes[0],
  markedOptions: RenderMarkdownParamTypes[1],
  hassOptions?: RenderMarkdownParamTypes[2]
): Promise<ReturnType<RenderMarkdownType>> => {
  if (!worker) {
    worker = wrap(
      new Worker(
        /* webpackChunkName: "markdown-worker" */
        new URL("./markdown-worker", import.meta.url)
      )
    );
  }
  return worker.renderMarkdown(content, markedOptions, hassOptions);
};
