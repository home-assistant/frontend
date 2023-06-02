// Caution before editing - For latest builds, this module is replaced with emptiness and thus not imported (see build-scripts/bundle.js)
import "core-js";
import "lit/polyfill-support";

// To use comlink under ES5
import "proxy-polyfill";
import "unfetch/polyfill";

import ResizeObserver from "resize-observer-polyfill";

if (!window.ResizeObserver) {
  window.ResizeObserver = ResizeObserver;
}

// Source: https://github.com/jserz/js_piece/blob/master/DOM/ParentNode/append()/append().md
(function (arr) {
  arr.forEach((item) => {
    if (Object.prototype.hasOwnProperty.call(item, "append")) {
      return;
    }
    Object.defineProperty(item, "append", {
      configurable: true,
      enumerable: true,
      writable: true,
      value: function append(...argArr) {
        const docFrag = document.createDocumentFragment();

        argArr.forEach((argItem) => {
          const isNode = argItem instanceof Node;
          docFrag.appendChild(
            isNode ? argItem : document.createTextNode(String(argItem))
          );
        });

        this.appendChild(docFrag);
      },
    });
  });
})([Element.prototype, Document.prototype, DocumentFragment.prototype]);

// Source: https://developer.mozilla.org/en-US/docs/Web/API/Element/getAttributeNames
if (Element.prototype.getAttributeNames === undefined) {
  Element.prototype.getAttributeNames = function () {
    const attributes = this.attributes;
    const length = attributes.length;
    const result = new Array(length);
    for (let i = 0; i < length; i++) {
      result[i] = attributes[i].name;
    }
    return result;
  };
}

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
