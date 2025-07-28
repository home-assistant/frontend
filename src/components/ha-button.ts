import Button from "@awesome.me/webawesome/dist/components/button/button";
import { css, type CSSResultGroup } from "lit";
import { customElement, property } from "lit/decorators";

export type Appearance = "accent" | "filled" | "outlined" | "plain";

/**
 * Home Assistant button component
 *
 * @element ha-button
 * @extends {Button}
 *
 * @summary
 * A stylable button component supporting Home Assistant theming, variants, and appearances based on webawesome button.
 *
 * @slot - Label of the button
 * @slot start - The prefix container (usually for icons).
 * @slot end - The suffix container (usually for icons).
 *
 * @csspart base - The component's base wrapper.
 * @csspart start - The container that wraps the prefix.
 * @csspart label - The button's label.
 * @csspart end - The container that wraps the suffix.
 * @csspart caret - The button's caret icon, an `<sl-icon>` element.
 * @csspart spinner - The spinner that shows when the button is in the loading state.
 *
 * @cssprop --ha-button-height - The height of the button.
 * @cssprop --ha-button-radius - The border radius of the button. defaults to `var(--wa-border-radius-pill)`.
 *
 * @attr {("small"|"medium")} size - Sets the button size.
 * @attr {("brand"|"neutral"|"danger"|"warning"|"success")} variant - Sets the button color variant. "primary" is default.
 * @attr {("accent"|"filled"|"plain")} appearance - Sets the button appearance.
 * @attr {boolean} hideContent - Hides the button content (for overlays).
 */
@customElement("ha-button")
export class HaButton extends Button {
  variant: "brand" | "neutral" | "success" | "warning" | "danger" = "brand";

  @property({ type: Boolean, attribute: "hide-content", reflect: true })
  hideContent = false;

  static get styles(): CSSResultGroup {
    return [
      Button.styles,
      css`
        .button {
          /* set theme vars */
          --wa-form-control-padding-inline: 16px;
          --wa-font-weight-action: var(--ha-font-weight-medium);
          --wa-border-radius-pill: 9999px;
          --wa-form-control-border-radius: var(
            --ha-button-radius,
            var(--wa-border-radius-pill)
          );

          --wa-form-control-height: var(
            --ha-button-height,
            var(--button-height, 40px)
          );

          font-size: var(--ha-font-size-l);
        }

        :host([size="small"]) .button {
          --wa-form-control-height: var(
            --ha-button-height,
            var(--button-height, 32px)
          );
          font-size: var(--wa-font-size-s, var(--ha-font-size-l));
        }

        :host([variant="brand"]) {
          --color-fill-normal-active: var(--color-fill-primary-normal-active);
          --color-fill-normal-hover: var(--color-fill-primary-normal-hover);
          --color-fill-loud-active: var(--color-fill-primary-loud-active);
          --color-fill-loud-hover: var(--color-fill-primary-loud-hover);
        }

        :host([variant="neutral"]) {
          --color-fill-normal-active: var(--color-fill-neutral-normal-active);
          --color-fill-normal-hover: var(--color-fill-neutral-normal-hover);
          --color-fill-loud-active: var(--color-fill-neutral-loud-active);
          --color-fill-loud-hover: var(--color-fill-neutral-loud-hover);
        }

        :host([variant="success"]) {
          --color-fill-normal-active: var(--color-fill-success-normal-active);
          --color-fill-normal-hover: var(--color-fill-success-normal-hover);
          --color-fill-loud-active: var(--color-fill-success-loud-active);
          --color-fill-loud-hover: var(--color-fill-success-loud-hover);
        }

        :host([variant="warning"]) {
          --color-fill-normal-active: var(--color-fill-warning-normal-active);
          --color-fill-normal-hover: var(--color-fill-warning-normal-hover);
          --color-fill-loud-active: var(--color-fill-warning-loud-active);
          --color-fill-loud-hover: var(--color-fill-warning-loud-hover);
        }

        :host([variant="danger"]) {
          --color-fill-normal-active: var(--color-fill-danger-normal-active);
          --color-fill-normal-hover: var(--color-fill-danger-normal-hover);
          --color-fill-loud-active: var(--color-fill-danger-loud-active);
          --color-fill-loud-hover: var(--color-fill-danger-loud-hover);
        }

        :host([appearance~="plain"]) .button {
          color: var(--wa-color-on-normal);
        }
        :host([appearance~="plain"]) .button.disabled {
          background-color: var(--transparent-none);
          color: var(--color-on-disabled-quiet);
        }

        :host([appearance~="outlined"]) .button.disabled {
          background-color: var(--transparent-none);
          color: var(--color-on-disabled-quiet);
        }

        @media (hover: hover) {
          :host([appearance~="filled"])
            .button:not(.disabled):not(.loading):hover {
            background-color: var(--color-fill-normal-hover);
          }
          :host([appearance~="accent"])
            .button:not(.disabled):not(.loading):hover {
            background-color: var(--color-fill-loud-hover);
          }
        }
        :host([appearance~="filled"])
          .button:not(.disabled):not(.loading):active {
          background-color: var(--color-fill-normal-active);
        }
        :host([appearance~="filled"]) .button.disabled {
          background-color: var(--color-fill-disabled-normal-resting);
          color: var(--color-on-disabled-normal);
        }

        :host([appearance~="accent"]) .button {
          background-color: var(
            --wa-color-fill-loud,
            var(--wa-color-neutral-fill-loud)
          );
        }
        :host([appearance~="accent"])
          .button:not(.disabled):not(.loading):active {
          background-color: var(--color-fill-loud-active);
        }
        :host([appearance~="accent"]) .button.disabled {
          background-color: var(--color-fill-disabled-loud-resting);
          color: var(--color-on-disabled-loud);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-button": HaButton;
  }
}
