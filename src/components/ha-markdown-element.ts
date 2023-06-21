import { ReactiveElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { renderMarkdown } from "../resources/render-markdown";

const _blockQuoteToAlert = { Note: "info", Warning: "warning" };

@customElement("ha-markdown-element")
class HaMarkdownElement extends ReactiveElement {
  @property() public content?;

  @property({ type: Boolean }) public allowSvg = false;

  @property({ type: Boolean }) public breaks = false;

  @property({ type: Boolean, attribute: "lazy-images" }) public lazyImages =
    false;

  protected createRenderRoot() {
    return this;
  }

  protected update(changedProps) {
    super.update(changedProps);
    if (this.content !== undefined) {
      this._render();
    }
  }

  private async _render() {
    this.innerHTML = await renderMarkdown(
      String(this.content),
      {
        breaks: this.breaks,
        gfm: true,
      },
      {
        allowSvg: this.allowSvg,
      }
    );

    this._resize();

    const walker = document.createTreeWalker(
      this,
      NodeFilter.SHOW_ELEMENT,
      null
    );

    while (walker.nextNode()) {
      const node = walker.currentNode;

      // Open external links in a new window
      if (
        node instanceof HTMLAnchorElement &&
        node.host !== document.location.host
      ) {
        node.target = "_blank";

        // protect referrer on external links and deny window.opener access for security reasons
        // (see https://mathiasbynens.github.io/rel-noopener/)
        node.rel = "noreferrer noopener";

        // Fire a resize event when images loaded to notify content resized
      } else if (node instanceof HTMLImageElement) {
        if (this.lazyImages) {
          node.loading = "lazy";
        }
        node.addEventListener("load", this._resize);
      } else if (node instanceof HTMLQuoteElement) {
        // Map GitHub blockquote elements to our ha-alert element
        const firstElementChild = node.firstElementChild;
        const quoteTitleElement = firstElementChild?.firstElementChild;
        const quoteType =
          quoteTitleElement?.textContent &&
          _blockQuoteToAlert[quoteTitleElement.textContent];

        // GitHub is strict on how these are defined, we need to make sure we know what we have before starting to replace it
        if (quoteTitleElement?.nodeName === "STRONG" && quoteType) {
          const alertNote = document.createElement("ha-alert");
          alertNote.alertType = quoteType;
          alertNote.title =
            (firstElementChild!.childNodes[1].nodeName === "#text" &&
              firstElementChild!.childNodes[1].textContent?.trimStart()) ||
            "";

          const childNodes = Array.from(firstElementChild!.childNodes);
          for (const child of childNodes.slice(
            childNodes.findIndex(
              // There is always a line break between the title and the content, we want to skip that
              (childNode) => childNode instanceof HTMLBRElement
            ) + 1
          )) {
            alertNote.appendChild(child);
          }
          node.firstElementChild!.replaceWith(alertNote);
        }
      }
    }
  }

  private _resize = () => fireEvent(this, "iron-resize");
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-markdown-element": HaMarkdownElement;
  }
}
