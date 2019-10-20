import { customElement, CSSResult, css } from "lit-element";
import "@material/mwc-checkbox";
// tslint:disable-next-line
import { Checkbox } from "@material/mwc-checkbox";
import { style } from "@material/mwc-checkbox/mwc-checkbox-css";
import { Constructor } from "../types";
// tslint:disable-next-line
const MwcCheckbox = customElements.get("mwc-checkbox") as Constructor<Checkbox>;

@customElement("ha-checkbox")
export class HaCheckbox extends MwcCheckbox {
  protected firstUpdated() {
    super.firstUpdated();
    this.style.setProperty("--mdc-theme-secondary", "var(--primary-color)");
  }

  protected static get styles(): CSSResult[] {
    return [
      style,
      css`
        .mdc-checkbox__native-control:enabled:not(:checked):not(:indeterminate)
          ~ .mdc-checkbox__background {
          border-color: rgba(var(--rgb-primary-text-color), 0.54);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-checkbox": HaCheckbox;
  }
}
