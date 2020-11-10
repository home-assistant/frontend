import "core-js";
import "regenerator-runtime/runtime";
import "unfetch/polyfill";
// To use comlink under ES5
import "proxy-polyfill";
// For localize
import "@formatjs/intl-getcanonicallocales/polyfill";

// Source: https://github.com/jserz/js_piece/blob/master/DOM/ParentNode/append()/append().md
(function (arr) {
  arr.forEach(function (item) {
    if (Object.prototype.hasOwnProperty.call(item, "append")) {
      return;
    }
    Object.defineProperty(item, "append", {
      configurable: true,
      enumerable: true,
      writable: true,
      value: function append(...argArr) {
        const docFrag = document.createDocumentFragment();

        argArr.forEach(function (argItem) {
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
