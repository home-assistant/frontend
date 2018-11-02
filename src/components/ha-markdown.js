import { PolymerElement } from "@polymer/polymer/polymer-element";
import EventsMixin from "../mixins/events-mixin";

let loaded = null;

/**
 * White list allowed svg tag.
 * Only put in the tag used in QR code, can be extend in future.
 */
const svgWhiteList = ["svg", "path"];

/*
 * @appliesMixin EventsMixin
 */
class HaMarkdown extends EventsMixin(PolymerElement) {
  static get properties() {
    return {
      content: {
        type: String,
        observer: "_render",
      },
      allowSvg: {
        type: Boolean,
        value: false,
      },
    };
  }

  connectedCallback() {
    super.connectedCallback();
    // 0 = not loaded, 1 = success, 2 = error
    this._scriptLoaded = 0;
    this._renderScheduled = false;
    this._resize = () => this.fire("iron-resize");

    if (!loaded) {
      loaded = import(/* webpackChunkName: "load_markdown" */ "../resources/load_markdown.js");
    }
    loaded
      .then(
        ({ marked, filterXSS }) => {
          this.marked = marked;
          this.filterXSS = filterXSS;
          this._scriptLoaded = 1;
        },
        () => {
          this._scriptLoaded = 2;
        }
      )
      .then(() => this._render());
  }

  _render() {
    if (this._scriptLoaded === 0 || this._renderScheduled) return;

    this._renderScheduled = true;

    // debounce it to next microtask.
    Promise.resolve().then(() => {
      this._renderScheduled = false;

      if (this._scriptLoaded === 1) {
        this.innerHTML = this.filterXSS(
          this.marked(this.content, {
            gfm: true,
            tables: true,
            breaks: true,
          }),
          {
            onIgnoreTag: this.allowSvg
              ? (tag, html) => (svgWhiteList.indexOf(tag) >= 0 ? html : null)
              : null,
          }
        );
        this._resize();

        const walker = document.createTreeWalker(
          this,
          1 /* SHOW_ELEMENT */,
          null,
          false
        );

        while (walker.nextNode()) {
          const node = walker.currentNode;

          // Open external links in a new window
          if (node.tagName === "A" && node.host !== document.location.host) {
            node.target = "_blank";

            // Fire a resize event when images loaded to notify content resized
          } else if (node.tagName === "IMG") {
            node.addEventListener("load", this._resize);
          }
        }
      } else if (this._scriptLoaded === 2) {
        this.innerText = this.content;
      }
    });
  }
}

customElements.define("ha-markdown", HaMarkdown);
