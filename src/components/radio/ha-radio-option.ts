import Radio from "@home-assistant/webawesome/dist/components/radio/radio";
import { css, type CSSResultGroup } from "lit";
import { customElement } from "lit/decorators";

/**
 * Home Assistant radio option component
 *
 * @element ha-radio-option
 * @extends {Radio}
 *
 * @summary
 * A Home Assistant themed radio built on top of the Web Awesome radio.
 * Intended to be used as a child of `ha-radio-group`.
 *
 * @slot - The radio option's label.
 *
 * @csspart control - The circular container that wraps the radio's checked state.
 * @csspart checked-icon - The checked icon.
 * @csspart label - The container that wraps the radio option's label.
 *
 * @cssprop --ha-radio-option-active-color - Accent color used for the checked indicator and border. Defaults to `--ha-color-fill-primary-loud-resting`.
 * @cssprop --ha-radio-option-height - Minimum height of the option in `button` appearance. Defaults to `40px`.
 * @cssprop --ha-radio-option-toggle-size - Size of the radio toggle circle in `default` appearance. Defaults to `20px`.
 * @cssprop --ha-radio-option-border-width - Border width of the radio control. Defaults to `--ha-border-width-md`.
 * @cssprop --ha-radio-option-border-color - Border color of the radio control. Defaults to `--ha-color-border-neutral-normal`.
 * @cssprop --ha-radio-option-border-color-hover - Border color of the radio control on hover. Defaults to `--ha-radio-option-border-color`, then `--ha-color-border-neutral-loud`.
 * @cssprop --ha-radio-option-background-color - Background color of the radio control. Defaults to `--wa-form-control-background-color`.
 * @cssprop --ha-radio-option-background-color-hover - Background color of the radio control on hover. Defaults to `--ha-color-fill-neutral-quiet-hover`.
 * @cssprop --ha-radio-option-checked-background-color - Background color of the radio control when checked. Defaults to `--ha-color-fill-primary-normal-resting`.
 * @cssprop --ha-radio-option-checked-icon-color - Color of the checked indicator dot. Defaults to `--ha-radio-option-active-color`.
 * @cssprop --ha-radio-option-checked-icon-scale - Size of the checked indicator relative to the toggle. Defaults to `0.7`.
 * @cssprop --ha-radio-option-control-margin - Margin around the radio toggle in `default` appearance. Defaults to `var(--ha-space-3) var(--ha-space-2) var(--ha-space-3) var(--ha-space-3)`.
 *
 * @attr {("default"|"button")} appearance - Sets the radio option's visual appearance.
 * @attr {("small"|"medium"|"large")} size - Sets the radio option's size. Overridden by the parent `ha-radio-group`.
 * @attr {boolean} checked - Draws the radio option in a checked state.
 * @attr {boolean} disabled - Disables the radio option.
 */
@customElement("ha-radio-option")
export class HaRadioOption extends Radio {
  static get styles(): CSSResultGroup {
    return [
      Radio.styles,
      css`
        :host {
          --wa-form-control-activated-color: var(
            --ha-radio-option-active-color,
            var(--ha-color-fill-primary-loud-resting)
          );
          --wa-form-control-height: var(--ha-radio-option-height, 40px);
          --wa-form-control-toggle-size: var(
            --ha-radio-option-toggle-size,
            20px
          );
          --wa-form-control-border-width: var(
            --ha-radio-option-border-width,
            var(--ha-border-width-md)
          );
          --wa-form-control-border-color: var(
            --ha-radio-option-border-color,
            var(--ha-color-border-neutral-normal)
          );
          --wa-form-control-background-color: var(
            --ha-radio-option-background-color,
            var(--wa-form-control-background-color)
          );
          --checked-icon-color: var(
            --ha-radio-option-checked-icon-color,
            var(--wa-form-control-activated-color)
          );
          --checked-icon-scale: var(--ha-radio-option-checked-icon-scale, 0.7);
        }

        :host([appearance="default"]) .control {
          margin: var(
            --ha-radio-option-control-margin,
            var(--ha-space-3) var(--ha-space-2) var(--ha-space-3)
              var(--ha-space-3)
          );
        }

        :host(:not([aria-checked="true"], [aria-disabled="true"]):hover)
          .control {
          border-color: var(
            --ha-radio-option-border-color-hover,
            var(
              --ha-radio-option-border-color,
              var(--ha-color-border-neutral-loud)
            )
          );
          background-color: var(
            --ha-radio-option-background-color-hover,
            var(--ha-color-fill-neutral-quiet-hover)
          );
        }

        :host([aria-checked="true"]) .control {
          background-color: var(
            --ha-radio-option-checked-background-color,
            var(--ha-color-fill-primary-normal-resting)
          );
        }

        [part~="label"] {
          display: inline-flex;
          align-items: center;
          cursor: pointer;
        }

        :host([disabled]) [part~="label"] {
          cursor: not-allowed;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-radio-option": HaRadioOption;
  }
}
