import { fireEvent } from "./dom/fire_event.js";

export const navigate = (
  node: HTMLElement,
  path: string,
  replace: boolean = false
) => {
  if (replace) {
    history.replaceState(null, "", path);
  } else {
    history.pushState(null, "", path);
  }
  fireEvent(node, "location-changed");
};
