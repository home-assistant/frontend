import { classMap } from "lit-html/directives/class-map";
import { html, customElement } from "lit-element";
import { ripple } from "@material/mwc-ripple/ripple-directive";

import "@material/mwc-fab";
import { Constructor } from "../types";
// tslint:disable-next-line
import { Fab } from "@material/mwc-fab";
// tslint:disable-next-line
const MwcFab = customElements.get("mwc-fab") as Constructor<Fab>;

@customElement("ha-fab")
export class HaFab extends MwcFab {
  // We override the render method because we don't have an icon font and mwc-fab doesn't support our svg-icon sets.
  // Based on version mwc-fab 0.8
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
