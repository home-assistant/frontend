import WaCheckbox from "@home-assistant/webawesome/dist/components/checkbox/checkbox";
import { css, type CSSResultGroup } from "lit";
import { customElement } from "lit/decorators";

/**
 * Home Assistant checkbox component
 *
 * @element ha-checkbox
 * @extends {WaCheckbox}
 *
 * @summary
 * A Home Assistant themed wrapper around the Web Awesome checkbox.
 *
 * @slot - The checkbox's label.
 * @slot hint - Text that describes how to use the checkbox.
 *
 * @csspart base - The component's label wrapper.
 * @csspart control - The square container that wraps the checkbox's checked state.
 * @csspart checked-icon - The checked icon, a `<wa-icon>` element.
 * @csspart indeterminate-icon - The indeterminate icon, a `<wa-icon>` element.
 * @csspart label - The container that wraps the checkbox's label.
 * @csspart hint - The hint's wrapper.
 *
 * @cssprop --ha-checkbox-size - The checkbox size. Defaults to `20px`.
 * @cssprop --ha-checkbox-border-color - The border color of the checkbox control. Defaults to `--ha-color-border-neutral-normal`.
 * @cssprop --ha-checkbox-border-color-hover - The border color of the checkbox control on hover. Defaults to `--ha-checkbox-border-color`, then `--ha-color-border-neutral-loud`.
 * @cssprop --ha-checkbox-background-color - The background color of the checkbox control. Defaults to `--wa-form-control-background-color`.
 * @cssprop --ha-checkbox-background-color-hover - The background color of the checkbox control on hover. Defaults to `--ha-color-form-background-hover`.
 * @cssprop --ha-checkbox-checked-background-color - The background color when checked or indeterminate. Defaults to `--ha-color-fill-primary-loud-resting`.
 * @cssprop --ha-checkbox-checked-background-color-hover - The background color when checked or indeterminate on hover. Defaults to `--ha-color-fill-primary-loud-hover`.
 * @cssprop --ha-checkbox-checked-icon-color - The color of the checked and indeterminate icons. Defaults to `--wa-color-brand-on-loud`.
 * @cssprop --ha-checkbox-checked-icon-scale - The size of the checked and indeterminate icons relative to the checkbox. Defaults to `0.9`.
 * @cssprop --ha-checkbox-border-radius - The border radius of the checkbox control. Defaults to `--ha-border-radius-sm`.
 * @cssprop --ha-checkbox-border-width - The border width of the checkbox control. Defaults to `--ha-border-width-md`.
 *
 * @attr {boolean} checked - Draws the checkbox in a checked state.
 * @attr {boolean} disabled - Disables the checkbox.
 * @attr {boolean} indeterminate - Draws the checkbox in an indeterminate state.
 * @attr {boolean} required - Makes the checkbox a required field.
 */
@customElement("ha-checkbox")
export class HaCheckbox extends WaCheckbox {
  /**
   * Returns the configured checkbox value, independent of checked state.
   *
   * The base Web Awesome checkbox returns `null` when unchecked to align with
   * form submission rules. Home Assistant components expect the configured value
   * to remain readable, so this wrapper always exposes the internal value.
   */
  // @ts-ignore - accessing WA internal _value property
  override get value(): string | null {
    // @ts-ignore
    return this._value ?? null;
  }

  /** Sets the configured checkbox value. */
  override set value(val: string | null) {
    // @ts-ignore
    this._value = val;
  }

  static get styles(): CSSResultGroup {
    return [
      WaCheckbox.styles,
      css`
        :host {
          --wa-form-control-toggle-size: var(--ha-checkbox-size, 20px);
          --wa-form-control-border-color: var(
            --ha-checkbox-border-color,
            var(--ha-color-border-neutral-normal)
          );
          --wa-form-control-background-color: var(
            --ha-checkbox-background-color,
            var(--wa-form-control-background-color)
          );
          --checked-icon-color: var(
            --ha-checkbox-checked-icon-color,
            var(--wa-color-brand-on-loud)
          );

          --wa-form-control-activated-color: var(
            --ha-checkbox-checked-background-color,
            var(--ha-color-fill-primary-loud-resting)
          );
          -webkit-tap-highlight-color: transparent;

          --checked-icon-scale: var(--ha-checkbox-checked-icon-scale, 0.9);
        }

        [part~="base"] {
          align-items: center;
          gap: var(--ha-space-2);
        }

        [part~="control"] {
          border-radius: var(
            --ha-checkbox-border-radius,
            var(--ha-border-radius-sm)
          );
          border-width: var(
            --ha-checkbox-border-width,
            var(--ha-border-width-md)
          );
          margin-inline-end: 0;
        }

        [part~="label"] {
          line-height: 1;
        }

        #hint {
          font-size: var(--ha-font-size-xs);
          color: var(--ha-color-text-secondary);
        }

        label:has(input:not(:disabled)):hover {
          --wa-form-control-border-color: var(
            --ha-checkbox-border-color-hover,
            var(--ha-checkbox-border-color, var(--ha-color-border-neutral-loud))
          );
        }

        label:has(input:not(:disabled)):hover [part~="control"] {
          background-color: var(
            --ha-checkbox-background-color-hover,
            var(--ha-color-form-background-hover)
          );
        }

        label:has(input:checked:not(:disabled)):hover [part~="control"],
        label:has(input:indeterminate:not(:disabled)):hover [part~="control"] {
          background-color: var(
            --ha-checkbox-checked-background-color-hover,
            var(--ha-color-fill-primary-loud-hover)
          );
          border-color: var(
            --ha-checkbox-checked-background-color-hover,
            var(--ha-color-fill-primary-loud-hover)
          );
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
