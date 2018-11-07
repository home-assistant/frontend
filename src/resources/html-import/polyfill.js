/* eslint-disable */
/*
 Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 Code distributed by Google as part of the polymer project is also
 subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/
(function(q) {
  function y(a, b) {
    if ("function" === typeof window.CustomEvent) return new CustomEvent(a, b);
    var c = document.createEvent("CustomEvent");
    c.initCustomEvent(a, !!b.bubbles, !!b.cancelable, b.detail);
    return c;
  }
  function m(a) {
    if (u) return a.ownerDocument !== document ? a.ownerDocument : null;
    var b = a.__importDoc;
    if (!b && a.parentNode) {
      b = a.parentNode;
      if ("function" === typeof b.closest) b = b.closest("link[rel=import]");
      else for (; !r(b) && (b = b.parentNode); );
      a.__importDoc = b;
    }
    return b;
  }
  function D(a) {
    var b = k(document, "link[rel=import]:not([import-dependency])"),
      c = b.length;
    c
      ? g(b, function(b) {
          return t(b, function() {
            0 === --c && a();
          });
        })
      : a();
  }
  function z(a) {
    function b() {
      "loading" !== document.readyState &&
        document.body &&
        (document.removeEventListener("readystatechange", b), a());
    }
    document.addEventListener("readystatechange", b);
    b();
  }
  function A(a) {
    z(function() {
      return D(function() {
        return a && a();
      });
    });
  }
  function t(a, b) {
    if (a.__loaded) b && b();
    else if (
      ("script" === a.localName && !a.src) ||
      ("style" === a.localName && !a.firstChild)
    )
      (a.__loaded = !0), b && b();
    else {
      var c = function(d) {
        a.removeEventListener(d.type, c);
        a.__loaded = !0;
        b && b();
      };
      a.addEventListener("load", c);
      (v && "style" === a.localName) || a.addEventListener("error", c);
    }
  }
  function r(a) {
    return (
      a.nodeType === Node.ELEMENT_NODE &&
      "link" === a.localName &&
      "import" === a.rel
    );
  }
  function h() {
    var a = this;
    this.a = {};
    this.b = 0;
    this.g = new MutationObserver(function(b) {
      return a.w(b);
    });
    this.g.observe(document.head, { childList: !0, subtree: !0 });
    this.loadImports(document);
  }
  function B(a) {
    g(k(a, "template"), function(a) {
      g(
        k(
          a.content,
          'script:not([type]),script[type="application/javascript"],script[type="text/javascript"]'
        ),
        function(a) {
          var b = document.createElement("script");
          g(a.attributes, function(a) {
            return b.setAttribute(a.name, a.value);
          });
          b.textContent = a.textContent;
          a.parentNode.replaceChild(b, a);
        }
      );
      B(a.content);
    });
  }
  function k(a, b) {
    return a.childNodes.length ? a.querySelectorAll(b) : E;
  }
  function g(a, b, c) {
    var d = a ? a.length : 0,
      f = c ? -1 : 1;
    for (c = c ? d - 1 : 0; c < d && 0 <= c; c += f) b(a[c], c);
  }
  var n = document.createElement("link"),
    u = "import" in n,
    E = n.querySelectorAll("*"),
    w = null;
  !1 === "currentScript" in document &&
    Object.defineProperty(document, "currentScript", {
      get: function() {
        return (
          w ||
          ("complete" !== document.readyState
            ? document.scripts[document.scripts.length - 1]
            : null)
        );
      },
      configurable: !0,
    });
  var F = /(url\()([^)]*)(\))/g,
    G = /(@import[\s]+(?!url\())([^;]*)(;)/g,
    H = /(<link[^>]*)(rel=['|"]?stylesheet['|"]?[^>]*>)/g,
    e = {
      u: function(a, b) {
        a.href && a.setAttribute("href", e.c(a.getAttribute("href"), b));
        a.src && a.setAttribute("src", e.c(a.getAttribute("src"), b));
        if ("style" === a.localName) {
          var c = e.o(a.textContent, b, F);
          a.textContent = e.o(c, b, G);
        }
      },
      o: function(a, b, c) {
        return a.replace(c, function(a, c, l, g) {
          a = l.replace(/["']/g, "");
          b && (a = e.c(a, b));
          return c + "'" + a + "'" + g;
        });
      },
      c: function(a, b) {
        if (void 0 === e.f) {
          e.f = !1;
          try {
            var c = new URL("b", "http://a");
            c.pathname = "c%20d";
            e.f = "http://a/c%20d" === c.href;
          } catch (d) {}
        }
        if (e.f) return new URL(a, b).href;
        c = e.s;
        c ||
          ((c = document.implementation.createHTMLDocument("temp")),
          (e.s = c),
          (c.i = c.createElement("base")),
          c.head.appendChild(c.i),
          (c.h = c.createElement("a")));
        c.i.href = b;
        c.h.href = a;
        return c.h.href || a;
      },
    },
    C = {
      async: !0,
      load: function(a, b, c) {
        if (a)
          if (a.match(/^data:/)) {
            a = a.split(",");
            var d = a[1];
            d = -1 < a[0].indexOf(";base64") ? atob(d) : decodeURIComponent(d);
            b(d);
          } else {
            var f = new XMLHttpRequest();
            f.open("GET", a, C.async);
            f.onload = function() {
              var a = f.responseURL || f.getResponseHeader("Location");
              a &&
                0 === a.indexOf("/") &&
                (a =
                  (location.origin ||
                    location.protocol + "//" + location.host) + a);
              var d = f.response || f.responseText;
              304 === f.status ||
              0 === f.status ||
              (200 <= f.status && 300 > f.status)
                ? b(d, a)
                : c(d);
            };
            f.send();
          }
        else c("error: href must be specified");
      },
    },
    v =
      /Trident/.test(navigator.userAgent) ||
      /Edge\/\d./i.test(navigator.userAgent);
  h.prototype.loadImports = function(a) {
    var b = this;
    g(k(a, "link[rel=import]"), function(a) {
      return b.l(a);
    });
  };
  h.prototype.l = function(a) {
    var b = this,
      c = a.href;
    if (void 0 !== this.a[c]) {
      var d = this.a[c];
      d && d.__loaded && ((a.__import = d), this.j(a));
    } else
      this.b++,
        (this.a[c] = "pending"),
        C.load(
          c,
          function(a, d) {
            a = b.A(a, d || c);
            b.a[c] = a;
            b.b--;
            b.loadImports(a);
            b.m();
          },
          function() {
            b.a[c] = null;
            b.b--;
            b.m();
          }
        );
  };
  h.prototype.A = function(a, b) {
    if (!a) return document.createDocumentFragment();
    v &&
      (a = a.replace(H, function(a, b, c) {
        return -1 === a.indexOf("type=") ? b + " type=import-disable " + c : a;
      }));
    var c = document.createElement("template");
    c.innerHTML = a;
    if (c.content) (a = c.content), B(a);
    else
      for (a = document.createDocumentFragment(); c.firstChild; )
        a.appendChild(c.firstChild);
    if ((c = a.querySelector("base")))
      (b = e.c(c.getAttribute("href"), b)), c.removeAttribute("href");
    var d = 0;
    g(
      k(
        a,
        'link[rel=import],link[rel=stylesheet][href][type=import-disable],style:not([type]),link[rel=stylesheet][href]:not([type]),script:not([type]),script[type="application/javascript"],script[type="text/javascript"]'
      ),
      function(a) {
        t(a);
        e.u(a, b);
        a.setAttribute("import-dependency", "");
        "script" === a.localName &&
          !a.src &&
          a.textContent &&
          (a.setAttribute(
            "src",
            "data:text/javascript;charset=utf-8," +
              encodeURIComponent(
                a.textContent +
                  ("\n//# sourceURL=" + b + (d ? "-" + d : "") + ".js\n")
              )
          ),
          (a.textContent = ""),
          d++);
      }
    );
    return a;
  };
  h.prototype.m = function() {
    var a = this;
    if (!this.b) {
      this.g.disconnect();
      this.flatten(document);
      var b = !1,
        c = !1,
        d = function() {
          c &&
            b &&
            (a.loadImports(document),
            a.b ||
              (a.g.observe(document.head, { childList: !0, subtree: !0 }),
              a.v()));
        };
      this.C(function() {
        c = !0;
        d();
      });
      this.B(function() {
        b = !0;
        d();
      });
    }
  };
  h.prototype.flatten = function(a) {
    var b = this;
    g(k(a, "link[rel=import]"), function(a) {
      var c = b.a[a.href];
      (a.__import = c) &&
        c.nodeType === Node.DOCUMENT_FRAGMENT_NODE &&
        ((b.a[a.href] = a),
        (a.readyState = "loading"),
        (a.__import = a),
        b.flatten(c),
        a.appendChild(c));
    });
  };
  h.prototype.B = function(a) {
    function b(f) {
      if (f < d) {
        var l = c[f],
          e = document.createElement("script");
        l.removeAttribute("import-dependency");
        g(l.attributes, function(a) {
          return e.setAttribute(a.name, a.value);
        });
        w = e;
        l.parentNode.replaceChild(e, l);
        t(e, function() {
          w = null;
          b(f + 1);
        });
      } else a();
    }
    var c = k(document, "script[import-dependency]"),
      d = c.length;
    b(0);
  };
  h.prototype.C = function(a) {
    var b = k(
        document,
        "style[import-dependency],link[rel=stylesheet][import-dependency]"
      ),
      c = b.length;
    if (c) {
      var d =
        v &&
        !!document.querySelector(
          "link[rel=stylesheet][href][type=import-disable]"
        );
      g(b, function(b) {
        t(b, function() {
          b.removeAttribute("import-dependency");
          0 === --c && a();
        });
        if (d && b.parentNode !== document.head) {
          var e = document.createElement(b.localName);
          e.__appliedElement = b;
          e.setAttribute("type", "import-placeholder");
          b.parentNode.insertBefore(e, b.nextSibling);
          for (e = m(b); e && m(e); ) e = m(e);
          e.parentNode !== document.head && (e = null);
          document.head.insertBefore(b, e);
          b.removeAttribute("type");
        }
      });
    } else a();
  };
  h.prototype.v = function() {
    var a = this;
    g(
      k(document, "link[rel=import]"),
      function(b) {
        return a.j(b);
      },
      !0
    );
  };
  h.prototype.j = function(a) {
    a.__loaded ||
      ((a.__loaded = !0),
      a.import && (a.import.readyState = "complete"),
      a.dispatchEvent(
        y(a.import ? "load" : "error", {
          bubbles: !1,
          cancelable: !1,
          detail: void 0,
        })
      ));
  };
  h.prototype.w = function(a) {
    var b = this;
    g(a, function(a) {
      return g(a.addedNodes, function(a) {
        a &&
          a.nodeType === Node.ELEMENT_NODE &&
          (r(a) ? b.l(a) : b.loadImports(a));
      });
    });
  };
  var x = null;
  if (u)
    g(k(document, "link[rel=import]"), function(a) {
      (a.import && "loading" === a.import.readyState) || (a.__loaded = !0);
    }),
      (n = function(a) {
        a = a.target;
        r(a) && (a.__loaded = !0);
      }),
      document.addEventListener("load", n, !0),
      document.addEventListener("error", n, !0);
  else {
    var p = Object.getOwnPropertyDescriptor(Node.prototype, "baseURI");
    Object.defineProperty(
      (!p || p.configurable ? Node : Element).prototype,
      "baseURI",
      {
        get: function() {
          var a = r(this) ? this : m(this);
          return a
            ? a.href
            : p && p.get
            ? p.get.call(this)
            : (document.querySelector("base") || window.location).href;
        },
        configurable: !0,
        enumerable: !0,
      }
    );
    Object.defineProperty(HTMLLinkElement.prototype, "import", {
      get: function() {
        return this.__import || null;
      },
      configurable: !0,
      enumerable: !0,
    });
    z(function() {
      x = new h();
    });
  }
  A(function() {
    return document.dispatchEvent(
      y("HTMLImportsLoaded", { cancelable: !0, bubbles: !0, detail: void 0 })
    );
  });
  q.useNative = u;
  q.whenReady = A;
  q.importForElement = m;
  q.loadImports = function(a) {
    x && x.loadImports(a);
  };
})((window.HTMLImports = window.HTMLImports || {}));
