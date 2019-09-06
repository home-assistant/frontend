import {
  classMap,
  customElement,
  html,
  LitElement,
  property,
} from "@material/mwc-base/base-element";
import { ripple } from "@material/mwc-ripple/ripple-directive.js";

import "@material/mwc-fab";
// tslint:disable-next-line
const MwcFab = customElements.get("mwc-fab");

@customElement("ha-fab")
export class HaFab extends MwcFab {
  protected render() {
    const classes = {
      "mdc-fab--mini": this.mini,
      "mdc-fab--exited": this.exited,
      "mdc-fab--extended": this.extended,
    };
    const showLabel = this.label !== "" && this.extended;
    return html`
      <button
        .ripple="${ripple()}"
        class="mdc-fab ${classMap(classes)}"
        ?disabled="${this.disabled}"
        aria-label="${this.label || this.icon}"
      >
        ${showLabel && this.showIconAtEnd ? this.label : ""}
        ${this.icon
          ? html`
              <ha-icon .icon=${this.icon}></ha-icon>
            `
          : ""}
        ${showLabel && !this.showIconAtEnd ? this.label : ""}
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-fab": HaFab;
  }
}
