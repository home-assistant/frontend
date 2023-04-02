import { mdiCheck } from "@mdi/js";
import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { forwardHaptic } from "../data/haptics";
import "./ha-svg-icon";

@customElement("ha-switch")
export class HaSwitch extends LitElement {
  // Generate a haptic vibration.
  // Only set to true if the new value of the switch is applied right away when toggling.
  // Do not add haptic when a user is required to press save.
  @property({ type: Boolean }) public haptic = false;

  @property({ type: Boolean }) public checked = false;

  protected render() {
    return html`<div class="switch">
      <input type="checkbox" .checked=${this.checked} @change=${this._change} />
      <div class="track"></div>
      <div class="thumb"><ha-svg-icon .path=${mdiCheck}></ha-svg-icon></div>
    </div>`;
  }

  protected _change(ev: CustomEvent) {
    const target = ev.target as HTMLInputElement;
    this.checked = target.checked;
    if (this.haptic) {
      forwardHaptic("light");
    }
    const changeEvent = new InputEvent("change");
    this.dispatchEvent(changeEvent);
  }

  static override styles = css`
    .switch {
      width: 52px;
      height: 32px;
      border-radius: 32px;
      position: relative;
    }
    input {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      appearance: none;
      margin: 0;
      opacity: 0;
      cursor: pointer;
    }
    .track {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      background-color: var(--switch-unchecked-track-color);
      outline: solid var(--switch-unchecked-foreground-color) 2px;
      outline-offset: -2px;
      border-radius: 32px;
      pointer-events: none;
    }
    input:checked + .track {
      background-color: var(--switch-checked-track-color);
      outline-color: transparent;
    }
    .thumb {
      display: flex;
      align-items: center;
      justify-content: center;
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      left: 8px;
      width: 16px;
      height: 16px;
      border-radius: 16px;
      background-color: var(--switch-unchecked-foreground-color);
      pointer-events: none;
    }
    input:checked ~ .thumb {
      left: 24px;
      width: 24px;
      height: 24px;
      background-color: var(--switch-checked-foreground-color);
    }
    .thumb ha-svg-icon {
      opacity: 0;
      width: 16px;
      height: 16px;
      color: var(--switch-checked-track-color);
    }
    input:checked ~ .thumb ha-svg-icon {
      opacity: 1;
    }
    .switch * {
      transition: cubic-bezier(0.254, 0.029, 0, 1.2) all 300ms;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-switch": HaSwitch;
  }
}
