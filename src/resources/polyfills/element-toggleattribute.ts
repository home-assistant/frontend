// Source: https://gist.github.com/rebelchris/365f26f95d7e9f432f64f21886d9b9ef
if (!Element.prototype.toggleAttribute) {
  Element.prototype.toggleAttribute = function (name, force) {
    if (force !== undefined) {
      force = !!force;
    }

    if (this.hasAttribute(name)) {
      if (force) {
        return true;
      }

      this.removeAttribute(name);
      return false;
    }
    if (force === false) {
      return false;
    }

    this.setAttribute(name, "");
    return true;
  };
}
