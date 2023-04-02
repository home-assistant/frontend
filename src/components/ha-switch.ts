import { MdSwitch } from "@material/web/switch/switch";
import { css } from "lit";
import { customElement, property } from "lit/decorators";
import { forwardHaptic } from "../data/haptics";

@customElement("ha-switch")
// @ts-ignore
export class HaSwitch extends MdSwitch {
  // Generate a haptic vibration.
  // Only set to true if the new value of the switch is applied right away when toggling.
  // Do not add haptic when a user is required to press save.
  @property({ type: Boolean }) public haptic = false;

  constructor() {
    super();
    this.icons = true;
    this.showOnlySelectedIcon = true;
  }

  get checked() {
    return this.selected;
  }

  set checked(value) {
    this.selected = value;
  }

  static override styles = [
    MdSwitch.styles,
    css`
      :host {
        --md-sys-color-primary: var(--switch-checked-color);
        --md-sys-color-primary-container: var(--light-primary-color);
        --md-sys-color-on-primary-container: var(--switch-checked-color);
        --md-sys-color-on-primary: var(--switch-checked-thumb-color);
        --md-sys-color-outline: var(--switch-unchecked-foreground-color);
        --md-sys-color-surface-variant: var(--switch-unchecked-track-color);
        --md-sys-color-on-surface-variant: var(--primary-text-color);
      }
    `,
  ];

  // @ts-ignore
  private handleClick() {
    if (this.disabled) {
      return;
    }
    if (this.haptic) {
      forwardHaptic("light");
    }
    this.selected = !this.selected;
    this.dispatchEvent(
      new InputEvent("input", { bubbles: true, composed: true })
    );
    // Bubbles but does not compose to mimic native browser <input> & <select>
    // Additionally, native change event is not an InputEvent.
    this.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-switch": HaSwitch;
  }
}
