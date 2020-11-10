import { customElement, property, UpdatingElement } from "lit-element";
import { fireEvent } from "../common/dom/fire_event";
import { renderMarkdown } from "../resources/render-markdown";

@customElement("ha-markdown-element")
class HaMarkdownElement extends UpdatingElement {
  @property() public content?;

  @property({ type: Boolean }) public allowSvg = false;

  @property({ type: Boolean }) public breaks = false;

  protected update(changedProps) {
    super.update(changedProps);
    if (this.content !== undefined) {
      this._render();
    }
  }

  private async _render() {
    this.innerHTML = await renderMarkdown(
      this.content,
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
      1 /* SHOW_ELEMENT */,
      null,
      false
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
        node.addEventListener("load", this._resize);
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
