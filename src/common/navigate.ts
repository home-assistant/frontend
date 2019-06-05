import { fireEvent } from "./dom/fire_event";

declare global {
  // for fire event
  interface HASSDomEvents {
    "location-changed": {
      replace: boolean;
    };
  }
}

export const navigate = (
  _node: any,
  path: string,
  replace: boolean = false
) => {
  if (__DEMO__) {
    if (replace) {
      history.replaceState(null, "", `${location.pathname}#${path}`);
    } else {
      window.location.hash = path;
    }
  } else {
    if (replace) {
      history.replaceState(null, "", path);
    } else {
      history.pushState(null, "", path);
    }
  }
  fireEvent(window, "location-changed", {
    replace,
  });
};
