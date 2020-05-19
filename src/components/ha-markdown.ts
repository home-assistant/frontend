import { customElement, property, UpdatingElement } from "lit-element";
// @ts-ignore
// eslint-disable-next-line import/no-webpack-loader-syntax
import markdownWorker from "workerize-loader!../resources/markdown_worker";
import { fireEvent } from "../common/dom/fire_event";

let worker: any | undefined;

@customElement("ha-markdown")
class HaMarkdown extends UpdatingElement {
  @property() public content = "";

  @property({ type: Boolean }) public allowSvg = false;

  @property({ type: Boolean }) public breaks = false;

  protected update(changedProps) {
    super.update(changedProps);

    if (!worker) {
      worker = markdownWorker();
    }

    this._render();
  }

  private async _render() {
    this.style.display = "block";
    this.style.padding = "0 16px 16px";
    this.innerHTML = await worker.renderMarkdown(
      this.content,
      {
        breaks: this.breaks,
        gfm: true,
        tables: true,
      },
      {
        allowSvg: this.allowSvg,
      }
    );

    this.innerHTML += `<style>
      *:first-child {
        margin-top: 0;
      }
      *:last-child {
        margin-bottom: 0;
      }
      a {
        color: var(--primary-color);
      }
      img {
        max-width: 100%;
      }
      code, pre {
        background-color: var(--markdown-code-background-color, #f6f8fa);
        border-radius: 3px;
      }

      code {
        font-size: 85%;
        margin: 0;
        padding: 0.2em 0.4em;
      }

      pre {
        padding: 16px;
        overflow: auto;
        line-height: 1.45;
      }

      h2 {
        font-size: 1.5em !important;
        font-weight: bold !important;
      }
    </style>`;

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
        node.rel = "noreferrer";

        // protect referrer on external links and deny window.opener access for security reasons
        // (see https://mathiasbynens.github.io/rel-noopener/)
        node.rel = "noreferrer noopener";

        // Fire a resize event when images loaded to notify content resized
      } else if (node) {
        node.addEventListener("load", this._resize);
      }
    }
  }

  private _resize = () => fireEvent(this, "iron-resize");
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-markdown": HaMarkdown;
  }
}
