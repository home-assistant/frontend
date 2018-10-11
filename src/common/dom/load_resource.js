// Load a resource and get a promise when loading done.
// From: https://davidwalsh.name/javascript-loader

function _load(tag, url, type) {
  // This promise will be used by Promise.all to determine success or failure
  return new Promise(function(resolve, reject) {
    const element = document.createElement(tag);
    let attr = "src";
    let parent = "body";

    // Important success and error for the promise
    element.onload = () => resolve(url);
    element.onerror = () => reject(url);

    // Need to set different attributes depending on tag type
    switch (tag) {
      case "script":
        element.async = true;
        if (type) {
          element.type = type;
        }
        break;
      case "link":
        element.type = "text/css";
        element.rel = "stylesheet";
        attr = "href";
        parent = "head";
    }

    // Inject into document to kick off loading
    element[attr] = url;
    document[parent].appendChild(element);
  });
}

export const loadCSS = (url) => _load("link", url);
export const loadJS = (url) => _load("script", url);
export const loadImg = (url) => _load("img", url);
export const loadModule = (url) => _load("script", url, "module");
