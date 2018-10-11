import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

class HuiDividerRow extends PolymerElement {
  static get template() {
    return html``;
  }

  setConfig(config) {
    if (!config) {
      throw new Error("Error in card configuration.");
    }
    this._config = config;
    this._createDivider();
  }

  ready() {
    super.ready();
    this._createDivider();
  }

  _createDivider() {
    const root = this.shadowRoot;
    if (root === null) return;

    while (root.lastChild) {
      root.removeChild(root.lastChild);
    }

    const style = this._config.style || {
      height: "1px",
      "background-color": "var(--secondary-text-color)",
    };

    const el = document.createElement("div");
    Object.keys(style).forEach((prop) => {
      el.style.setProperty(prop, style[prop]);
    });

    root.appendChild(el);
  }
}
customElements.define("hui-divider-row", HuiDividerRow);
