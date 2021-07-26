import "core-js";
import "regenerator-runtime/runtime";
import "lit/polyfill-support";
// For localize
import "@formatjs/intl-getcanonicallocales/polyfill";
// To use comlink under ES5
import "proxy-polyfill";
import "unfetch/polyfill";

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
