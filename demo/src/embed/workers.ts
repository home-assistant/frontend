// Browsers only start a worker from a script on the page's own origin, and
// the workers of the cards, such as the markdown worker, are served next to
// this script. A worker from another origin starts from a blob instead, which
// loads the real worker script. The demo serves its scripts with CORS.
const pageWorker = globalThis.Worker;

globalThis.Worker = class extends pageWorker {
  constructor(scriptUrl: string | URL, options?: WorkerOptions) {
    const url = new URL(scriptUrl, location.href);

    if (url.origin === location.origin) {
      super(scriptUrl, options);
      return;
    }

    const source =
      options?.type === "module"
        ? `import ${JSON.stringify(url.href)};`
        : `importScripts(${JSON.stringify(url.href)});`;
    const blobUrl = URL.createObjectURL(
      new Blob([source], { type: "text/javascript" })
    );

    try {
      super(blobUrl, options);
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  }
};

export {};
