// Load a resource and get a promise when loading done.
// From: https://davidwalsh.name/javascript-loader

const _load = (tag: "link" | "script" | "img", url: string, type?: "module") =>
  // This promise will be used by Promise.all to determine success or failure
  new Promise((resolve, reject) => {
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
export const loadCSS = (url: string) => _load("link", url);
export const loadJS = (url: string) => _load("script", url);
export const loadImg = (url: string) => _load("img", url);
export const loadModule = (url: string) => _load("script", url, "module");
