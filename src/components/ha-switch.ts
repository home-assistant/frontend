import { Constructor, customElement, CSSResult, css } from "lit-element";
import "@material/mwc-switch";
import { style } from "@material/mwc-switch/mwc-switch-css";
// tslint:disable-next-line
import { Switch } from "@material/mwc-switch";
// tslint:disable-next-line
const MwcSwitch = customElements.get("mwc-switch") as Constructor<Switch>;

@customElement("ha-switch")
export class HaSwitch extends MwcSwitch {
  protected firstUpdated() {
    super.firstUpdated();
    this.style.setProperty("--mdc-theme-secondary", "var(--primary-color)");
  }

  protected static get styles(): CSSResult[] {
    return [
      style,
      css`
        .mdc-switch:not(.mdc-switch--checked) .mdc-switch__thumb {
          background-color: var(--paper-toggle-button-unchecked-button-color);
          border-color: var(--paper-toggle-button-unchecked-button-color);
        }
        .mdc-switch:not(.mdc-switch--checked) .mdc-switch__track {
          background-color: var(--paper-toggle-button-unchecked-bar-color;
          border-color: var(--paper-toggle-button-unchecked-bar-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-switch": HaSwitch;
  }
}
