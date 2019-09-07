import { UpdatingElement, property, customElement } from "lit-element";
// eslint-disable-next-line import/no-webpack-loader-syntax
// @ts-ignore
// tslint:disable-next-line: no-implicit-dependencies
import markdownWorker from "workerize-loader!../resources/markdown_worker";
import { fireEvent } from "../common/dom/fire_event";

let worker: any | undefined;

@customElement("ha-markdown")
class HaMarkdown extends UpdatingElement {
  @property() public content = "";
  @property({ type: Boolean }) public allowSvg = false;

  protected update(changedProps) {
    super.update(changedProps);

    if (!worker) {
      worker = markdownWorker();
    }

    this._render();
  }

  private async _render() {
    this.innerHTML = await worker.renderMarkdown(
      this.content,
      {
        breaks: true,
        gfm: true,
        tables: true,
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
        node.nodeName === "A" &&
        (node as HTMLAnchorElement).host !== document.location.host
      ) {
        (node as HTMLAnchorElement).target = "_blank";

        // Fire a resize event when images loaded to notify content resized
      } else if (node.nodeName === "IMG") {
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
