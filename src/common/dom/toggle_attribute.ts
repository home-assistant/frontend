// Toggle Attribute Polyfill because it's too new for some browsers
export const toggleAttribute = (
  el: HTMLElement,
  name: string,
  force?: boolean
) => {
  if (force !== undefined) {
    force = !!force;
  }

  if (el.hasAttribute(name)) {
    if (force) {
      return true;
    }

    el.removeAttribute(name);
    return false;
  }
  if (force === false) {
    return false;
  }

  el.setAttribute(name, "");
  return true;
};
