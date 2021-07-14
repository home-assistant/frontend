import { Switch } from "@material/mwc-switch";
import { css, CSSResultGroup } from "lit";
import { customElement, property } from "lit/decorators";
import { forwardHaptic } from "../data/haptics";

@customElement("ha-switch")
// @ts-expect-error
export class HaSwitch extends Switch {
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

  static get styles(): CSSResultGroup {
    return [
      Switch.styles,
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
