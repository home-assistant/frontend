// Load a resource and get a promise when loading done.
// From: https://davidwalsh.name/javascript-loader

const _load = (
  tag: "link" | "script" | "img",
  url: string,
  type?: "module"
) => {
  // This promise will be used by Promise.all to determine success or failure
  return new Promise((resolve, reject) => {
    const element = document.createElement(tag);
    let attr = "src";
    let parent = "body";

    // Important success and error for the promise
    element.onload = () => resolve(url);
    element.onerror = () => reject(url);

    // Need to set different attributes depending on tag type
    switch (tag) {
      case "script":
        (element as HTMLScriptElement).async = true;
        if (type) {
          (element as HTMLScriptElement).type = type;
          // https://github.com/home-assistant/frontend/pull/6328
          if (isUrlAbsolute(url)) {
            (element as HTMLScriptElement).crossOrigin = "anonymous";
          } else {
            (element as HTMLScriptElement).crossOrigin = "use-credentials";
          }
        }
        break;
      case "link":
        (element as HTMLLinkElement).type = "text/css";
        (element as HTMLLinkElement).rel = "stylesheet";
        attr = "href";
        parent = "head";
    }

    // Inject into document to kick off loading
    element[attr] = url;
    document[parent].appendChild(element);
  });
};

// From: https://stackoverflow.com/a/38979205
const isUrlAbsolute = (url) =>
  url.indexOf("://") > 0 || url.indexOf("//") === 0;

export const loadCSS = (url: string) => _load("link", url);
export const loadJS = (url: string) => _load("script", url);
export const loadImg = (url: string) => _load("img", url);
export const loadModule = (url: string) => _load("script", url, "module");
