// Caution before editing - For latest builds, this module is replaced with emptiness and thus not imported (see build-scripts/bundle.js)
import "core-js";
import "regenerator-runtime/runtime";
import "lit/polyfill-support";

// For localize & formatting
import "@formatjs/intl-getcanonicallocales/polyfill";
import "@formatjs/intl-locale/polyfill";
import "@formatjs/intl-pluralrules/polyfill";
import "@formatjs/intl-pluralrules/locale-data/en";
import "@formatjs/intl-numberformat/polyfill";
import "@formatjs/intl-numberformat/locale-data/en";
import "@formatjs/intl-relativetimeformat/polyfill";
import "@formatjs/intl-relativetimeformat/locale-data/en";
import "@formatjs/intl-datetimeformat/polyfill";
import "@formatjs/intl-datetimeformat/locale-data/en";
import "@formatjs/intl-datetimeformat/add-all-tz";

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
