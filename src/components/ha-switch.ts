import {
  customElement,
  CSSResult,
  css,
  query,
  html,
  property,
} from "lit-element";
import "@material/mwc-switch";
import { style } from "@material/mwc-switch/mwc-switch-css";
// tslint:disable-next-line
import { Switch } from "@material/mwc-switch";
import { Constructor } from "../types";
import { forwardHaptic } from "../data/haptics";
import { ripple } from "@material/mwc-ripple/ripple-directive";
// tslint:disable-next-line
const MwcSwitch = customElements.get("mwc-switch") as Constructor<Switch>;

@customElement("ha-switch")
export class HaSwitch extends MwcSwitch {
  // Generate a haptic vibration.
  // Only set to true if the new value of the switch is applied right away when toggling.
  // Do not add haptic when a user is required to press save.
  @property({ type: Boolean }) public haptic = false;
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
    this.addEventListener("change", () => {
      if (this.haptic) {
        forwardHaptic("light");
      }
    });
  }

  protected render() {
    return html`
      <div class="mdc-switch">
        <div class="mdc-switch__track"></div>
        <div
          class="mdc-switch__thumb-underlay"
          .ripple="${ripple({
            interactionNode: this,
          })}"
        >
          <div class="mdc-switch__thumb">
            <input
              type="checkbox"
              id="basic-switch"
              class="mdc-switch__native-control"
              role="switch"
              @change="${this._haChangeHandler}"
            />
          </div>
        </div>
      </div>
      <label for="basic-switch"><slot></slot></label>
    `;
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
        .mdc-switch.mdc-switch--checked .mdc-switch__thumb {
          background-color: var(--switch-checked-button-color);
          border-color: var(--switch-checked-button-color);
        }
        .mdc-switch.mdc-switch--checked .mdc-switch__track {
          background-color: var(--switch-checked-track-color);
          border-color: var(--switch-checked-track-color);
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

  private _haChangeHandler(e: Event) {
    this.mdcFoundation.handleChange(e);
    // catch "click" event and sync properties
    this.checked = this.formElement.checked;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-switch": HaSwitch;
  }
}
