import Radio from "@home-assistant/webawesome/dist/components/radio/radio";
import { css, type CSSResultGroup } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-radio-option")
export class HaRadioOption extends Radio {
  // --wa-form-control-activated-color
  // --wa-form-control-value-color
  // --wa-form-control-value-font-weight
  // --wa-form-control-value-line-height
  // --wa-form-control-height
  // --wa-color-surface-default
  // --wa-form-control-border-width
  // --wa-form-control-border-style
  // --wa-form-control-border-color
  // --wa-border-radius-m
  // --wa-form-control-padding-inline
  // --wa-transition-fast
  // --wa-transition-normal
  // --wa-transition-easing
  // --wa-form-control-toggle-size
  // --wa-form-control-background-color
  // --wa-focus-ring
  // --wa-focus-ring-offset
  // --wa-color-mix-hover
  // --wa-color-brand-fill-quiet
  // Component-level vars you can also override from outside (they have internal defaults):

  // --checked-icon-color (defaults to --wa-form-control-activated-color)
  // --checked-icon-scale (defaults to 0.7)
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
          border-color: var(--ha-color-border-neutral-loud);
          background-color: var(--ha-color-fill-neutral-quiet-hover);
        }

        :host([aria-checked="true"]) .control {
          background-color: var(--ha-color-fill-primary-normal-resting);
        }

        [part~="label"] {
          display: inline-flex;
          align-items: center;
          cursor: pointer;
        }

        :host([disabled]) [part~="label"] {
          cursor: not-allowed;
        }

        @media (hover: hover) {
          :host(
            [appearance="button"]:hover:not(:state(disabled), :state(checked))
          ) {
            background-color: color-mix(
              in srgb,
              var(--wa-color-surface-default) 95%,
              var(--wa-color-mix-hover)
            );
          }
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
