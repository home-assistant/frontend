import "@material/mwc-switch";
import type { Switch } from "@material/mwc-switch";
import { style } from "@material/mwc-switch/mwc-switch-css";
import { css, CSSResult, customElement, property } from "lit-element";
import { forwardHaptic } from "../data/haptics";
import { Constructor } from "../types";

const MwcSwitch = customElements.get("mwc-switch") as Constructor<Switch>;

@customElement("ha-switch")
export class HaSwitch extends MwcSwitch {
  // Generate a haptic vibration.
  // Only set to true if the new value of the switch is applied right away when toggling.
  // Do not add haptic when a user is required to press save.
  @property({ type: Boolean }) public haptic = false;

  protected firstUpdated() {
    super.firstUpdated();
    this.style.setProperty(
      "--mdc-theme-secondary",
      "var(--switch-checked-color)"
    );
    this.addEventListener("change", () => {
      if (this.haptic) {
        forwardHaptic("light");
      }
    });
  }

  protected static get styles(): CSSResult[] {
    return [
      style,
      css`
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-switch": HaSwitch;
  }
}
