import { ReactiveElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { renderMarkdown } from "../resources/render-markdown";

const _legacyGitHubBlockQuoteToAlert = { Note: "info", Warning: "warning" };
const _gitHubBlockQuoteToAlert = {
  "[!NOTE]": "info",
  "[!TIP]": "success",
  "[!IMPORTANT]": "info",
  "[!WARNING]": "warning",
  "[!CAUTION]": "error",
};

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
        const blockQuoteType =
          firstElementChild?.firstChild?.textContent &&
          _gitHubBlockQuoteToAlert[firstElementChild.firstChild.textContent];
        const legacyBlockQuoteType =
          !blockQuoteType &&
          quoteTitleElement?.textContent &&
          _legacyGitHubBlockQuoteToAlert[quoteTitleElement.textContent];

        if (
          blockQuoteType ||
          (quoteTitleElement?.nodeName === "STRONG" && legacyBlockQuoteType)
        ) {
          const alertNote = document.createElement("ha-alert");
          alertNote.alertType = blockQuoteType || legacyBlockQuoteType;
          alertNote.title = blockQuoteType
            ? ""
            : (firstElementChild!.childNodes[1].nodeName === "#text" &&
                firstElementChild!.childNodes[1].textContent?.trimStart()) ||
              "";

          const childNodes = Array.from(node.childNodes)
            .map((child) => Array.from(child.childNodes))
            .reduce((acc, val) => acc.concat(val), [])
            .filter(
              (childNode) =>
                childNode.textContent &&
                !(childNode.textContent in _gitHubBlockQuoteToAlert) &&
                !(childNode.textContent in _legacyGitHubBlockQuoteToAlert)
            );
          for (const child of childNodes) {
            alertNote.appendChild(child);
          }
          node.firstElementChild!.replaceWith(alertNote);
        }
      } else if (
        node instanceof HTMLElement &&
        ["ha-alert", "ha-qr-code", "ha-icon", "ha-svg-icon"].includes(
          node.localName
        )
      ) {
        import(
          /* webpackInclude: /(ha-alert)|(ha-qr-code)|(ha-icon)|(ha-svg-icon)/ */ `./${node.localName}`
        );
      }
    }
  }

  private _resize = () => fireEvent(this, "content-resize");
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-markdown-element": HaMarkdownElement;
  }
}
