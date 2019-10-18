import { Constructor, customElement, CSSResult, css, query } from "lit-element";
import "@material/mwc-switch";
import { style } from "@material/mwc-switch/mwc-switch-css";
// tslint:disable-next-line
import { Switch } from "@material/mwc-switch";
// tslint:disable-next-line
const MwcSwitch = customElements.get("mwc-switch") as Constructor<Switch>;

@customElement("ha-switch")
export class HaSwitch extends MwcSwitch {
  @query("slot") private _slot!: HTMLSlotElement;

  protected firstUpdated() {
    super.firstUpdated();
    this.style.setProperty(
      "--mdc-theme-secondary",
      "var(--switch-checked-color)"
    );
    this.classList.toggle(
      "slotted",
      Boolean(this._slot.assignedNodes().length)
    );
  }

  protected static get styles(): CSSResult[] {
    return [
      style,
      css`
        :host {
          display: flex;
          flex-direction: row;
          align-items: center;
        }
        .mdc-switch:not(.mdc-switch--checked) .mdc-switch__thumb {
          background-color: var(--switch-unchecked-button-color);
          border-color: var(--switch-unchecked-button-color);
        }
        .mdc-switch:not(.mdc-switch--checked) .mdc-switch__track {
          background-color: var(--switch-unchecked-track-color);
          border-color: var(--switch-unchecked-track-color);
        }
        :host(.slotted) .mdc-switch {
          margin-right: 24px;
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
