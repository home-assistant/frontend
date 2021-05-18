import { fireEvent } from "./dom/fire_event";

declare global {
  // for fire event
  interface HASSDomEvents {
    "location-changed": {
      replace: boolean;
    };
  }
}

export const navigate = (_node: any, path: string, replace = false) => {
  if (__DEMO__) {
    if (replace) {
      top.history.replaceState(
        top.history.state?.root ? { root: true } : null,
        "",
        `${top.location.pathname}#${path}`
      );
    } else {
      top.location.hash = path;
    }
  } else if (replace) {
    top.history.replaceState(
      top.history.state?.root ? { root: true } : null,
      "",
      path
    );
  } else {
    top.history.pushState(null, "", path);
  }
  fireEvent(top, "location-changed", {
    replace,
  });
};
