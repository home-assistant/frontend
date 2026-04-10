import Switch from "@home-assistant/webawesome/dist/components/switch/switch";
import { css, type CSSResultGroup, type PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import { forwardHaptic } from "../data/haptics";

/**
 * Home Assistant switch component
 *
 * @element ha-switch
 * @extends {Switch}
 *
 * @summary
 * A toggle switch component supporting Home Assistant theming, based on the webawesome switch.
 * Represents two states: on and off.
 *
 * @cssprop --ha-switch-size - The size of the switch track height. Defaults to `14px`.
 * @cssprop --ha-switch-thumb-size - The size of the thumb. Defaults to `20px`.
 * @cssprop --ha-switch-width - The width of the switch track. Defaults to `36px`.
 * @cssprop --ha-switch-box-shadow - The box shadow of the thumb. Defaults to `var(--ha-box-shadow-s)`.
 * @cssprop --ha-switch-background-color - Background color of the unchecked track.
 * @cssprop --ha-switch-border-color - Border color of the unchecked track and thumb.
 * @cssprop --ha-switch-thumb-background-color - Background color of the unchecked thumb.
 * @cssprop --ha-switch-background-color-hover - Background color of the unchecked track on hover.
 * @cssprop --ha-switch-thumb-background-color-hover - Background color of the unchecked thumb on hover.
 * @cssprop --ha-switch-checked-background-color - Background color of the checked track.
 * @cssprop --ha-switch-checked-border-color - Border color of the checked track.
 * @cssprop --ha-switch-checked-thumb-background-color - Background color of the checked thumb.
 * @cssprop --ha-switch-checked-thumb-border-color - Border color of the checked thumb.
 * @cssprop --ha-switch-checked-background-color-hover - Background color of the checked track on hover.
 * @cssprop --ha-switch-checked-thumb-background-color-hover - Background color of the checked thumb on hover.
 * @cssprop --ha-switch-required-marker - The marker shown after the label for required fields. Defaults to `"*"`.
 * @cssprop --ha-switch-required-marker-offset - Offset of the required marker. Defaults to `0.1rem`.
 *
 * @attr {boolean} checked - The checked state of the switch.
 * @attr {boolean} disabled - Disables the switch and prevents user interaction.
 * @attr {boolean} required - Makes the switch a required field.
 * @attr {boolean} haptic - Enables haptic vibration on toggle. Only use when the new state is applied immediately (not when a save action is required).
 */
@customElement("ha-switch")
export class HaSwitch extends Switch {
  /**
   * Enables haptic vibration on toggle.
   * Only set to true if the new value of the switch is applied right away when toggling.
   * Do not add haptic when a user is required to press save.
   */
  @property({ type: Boolean }) public haptic = false;

  public updated(changedProperties: PropertyValues<typeof this>) {
    super.updated(changedProperties);
    if (changedProperties.has("haptic")) {
      if (this.haptic) {
        this.addEventListener("change", this._forwardHaptic);
      } else {
        this.removeEventListener("change", this._forwardHaptic);
      }
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener("change", this._forwardHaptic);
  }

  private _forwardHaptic = () => {
    forwardHaptic(this, "light");
  };

  static get styles(): CSSResultGroup {
    return [
      Switch.styles,
      css`
        :host {
          --wa-form-control-toggle-size: var(--ha-switch-size, 14px);
          --wa-form-control-required-content: var(
            --ha-switch-required-marker,
            var(--ha-input-required-marker, "*")
          );
          --wa-form-control-required-content-offset: var(
            --ha-switch-required-marker-offset,
            0.1rem
          );
          --thumb-size: var(--ha-switch-thumb-size, 20px);
          --width: var(--ha-switch-width, 36px);
        }

        label {
          height: max(var(--thumb-size), var(--wa-form-control-toggle-size));
          padding: 0 3px;
        }

        .switch {
          background-color: var(
            --ha-switch-background-color,
            var(--ha-color-form-background)
          );
          border-color: var(
            --ha-switch-border-color,
            var(--ha-color-border-neutral-normal)
          );
        }

        .switch .thumb {
          background-color: var(
            --ha-switch-thumb-background-color,
            var(--ha-color-form-background)
          );
          border-color: var(
            --ha-switch-border-color,
            var(--ha-color-border-neutral-normal)
          );
          border-style: var(--wa-form-control-border-style);
          border-width: var(--wa-form-control-border-width);
          box-shadow: var(--ha-switch-box-shadow, var(--ha-box-shadow-s));
        }

        label:not(.disabled):hover .switch,
        label:not(.disabled) .input:focus-visible ~ .switch,
        label:not(.disabled):active .switch {
          background-color: var(
            --ha-switch-background-color-hover,
            var(
              --ha-switch-background-color,
              var(--ha-color-fill-neutral-normal-hover)
            )
          );
        }

        label:not(.disabled):hover .switch .thumb,
        label:not(.disabled) .input:focus-visible ~ .switch .thumb,
        label:not(.disabled):active .switch .thumb {
          background-color: var(
            --ha-switch-thumb-background-color-hover,
            var(
              --ha-switch-thumb-background-color,
              var(--ha-color-form-background-hover)
            )
          );
        }

        .checked .switch {
          background-color: var(
            --ha-switch-checked-background-color,
            var(--ha-color-fill-primary-normal-resting)
          );
          border-color: var(
            --ha-switch-checked-border-color,
            var(--ha-color-border-primary-loud)
          );
        }

        .checked .switch .thumb {
          background-color: var(
            --ha-switch-checked-thumb-background-color,
            var(--ha-color-fill-primary-loud-resting)
          );
          border-color: var(
            --ha-switch-checked-thumb-border-color,
            var(--ha-color-fill-primary-loud-resting)
          );
        }

        label:not(.disabled).checked:hover .switch,
        label:not(.disabled).checked .input:focus-visible ~ .switch,
        label:not(.disabled).checked:active .switch {
          background-color: var(
            --ha-switch-checked-background-color-hover,
            var(
              --ha-switch-checked-background-color,
              var(--ha-color-fill-primary-normal-hover)
            )
          );
        }

        label:not(.disabled).checked:hover .switch .thumb,
        label:not(.disabled).checked .input:focus-visible ~ .switch .thumb,
        label:not(.disabled).checked:active .switch .thumb {
          background-color: var(
            --ha-switch-checked-thumb-background-color-hover,
            var(
              --ha-switch-checked-thumb-background-color,
              var(--ha-color-fill-primary-loud-hover)
            )
          );
        }

        label.disabled {
          opacity: 0.5;
          cursor: not-allowed;
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
