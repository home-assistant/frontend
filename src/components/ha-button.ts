import Button from "@home-assistant/webawesome/dist/components/button/button";
import { css, type CSSResultGroup } from "lit";
import { customElement } from "lit/decorators";

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
 * @cssprop --ha-button-border-radius - The border radius of the button. defaults to `var(--ha-border-radius-pill)`.
 *
 * @attr {("small"|"medium")} size - Sets the button size.
 * @attr {("brand"|"neutral"|"danger"|"warning"|"success")} variant - Sets the button color variant. "primary" is default.
 * @attr {("accent"|"filled"|"plain")} appearance - Sets the button appearance.
 * @attr {boolean} loading - shows a loading indicator instead of the buttons label and disable buttons click.
 * @attr {boolean} disabled - Disables the button and prevents user interaction.
 */
@customElement("ha-button")
export class HaButton extends Button {
  variant: "brand" | "neutral" | "success" | "warning" | "danger" = "brand";

  static get styles(): CSSResultGroup {
    return [
      Button.styles,
      css`
        :host {
          --wa-form-control-padding-inline: var(--ha-space-4);
          --wa-font-weight-action: var(--ha-font-weight-medium);
          --wa-form-control-border-radius: var(
            --ha-button-border-radius,
            var(--ha-border-radius-pill)
          );

          --wa-form-control-height: var(
            --ha-button-height,
            var(--button-height, 40px)
          );
        }
        .button {
          font-size: var(--ha-font-size-m);
          line-height: 1;

          transition: background-color 0.15s ease-in-out;
          text-wrap: wrap;
        }

        :host([size="small"]) .button {
          --wa-form-control-height: var(
            --ha-button-height,
            var(--button-height, 32px)
          );
          font-size: var(--wa-font-size-s, var(--ha-font-size-m));
          --wa-form-control-padding-inline: var(--ha-space-3);
        }

        :host([variant="brand"]) {
          --button-color-fill-normal-active: var(
            --ha-color-fill-primary-normal-active
          );
          --button-color-fill-normal-hover: var(
            --ha-color-fill-primary-normal-hover
          );
          --button-color-fill-loud-active: var(
            --ha-color-fill-primary-loud-active
          );
          --button-color-fill-loud-hover: var(
            --ha-color-fill-primary-loud-hover
          );
          --button-color-fill-quiet-active: var(
            --ha-color-fill-primary-quiet-active
          );
        }

        :host([variant="neutral"]) {
          --button-color-fill-normal-active: var(
            --ha-color-fill-neutral-normal-active
          );
          --button-color-fill-normal-hover: var(
            --ha-color-fill-neutral-normal-hover
          );
          --button-color-fill-loud-active: var(
            --ha-color-fill-neutral-loud-active
          );
          --button-color-fill-loud-hover: var(
            --ha-color-fill-neutral-loud-hover
          );
          --button-color-fill-quiet-active: var(
            --ha-color-fill-neutral-normal-active
          );
        }

        :host([variant="success"]) {
          --button-color-fill-normal-active: var(
            --ha-color-fill-success-normal-active
          );
          --button-color-fill-normal-hover: var(
            --ha-color-fill-success-normal-hover
          );
          --button-color-fill-loud-active: var(
            --ha-color-fill-success-loud-active
          );
          --button-color-fill-loud-hover: var(
            --ha-color-fill-success-loud-hover
          );
          --button-color-fill-quiet-active: var(
            --ha-color-fill-success-quiet-active
          );
        }

        :host([variant="warning"]) {
          --button-color-fill-normal-active: var(
            --ha-color-fill-warning-normal-active
          );
          --button-color-fill-normal-hover: var(
            --ha-color-fill-warning-normal-hover
          );
          --button-color-fill-loud-active: var(
            --ha-color-fill-warning-loud-active
          );
          --button-color-fill-loud-hover: var(
            --ha-color-fill-warning-loud-hover
          );
          --button-color-fill-quiet-active: var(
            --ha-color-fill-warning-quiet-active
          );
        }

        :host([variant="danger"]) {
          --button-color-fill-normal-active: var(
            --ha-color-fill-danger-normal-active
          );
          --button-color-fill-normal-hover: var(
            --ha-color-fill-danger-normal-hover
          );
          --button-color-fill-loud-active: var(
            --ha-color-fill-danger-loud-active
          );
          --button-color-fill-loud-hover: var(
            --ha-color-fill-danger-loud-hover
          );
          --button-color-fill-quiet-active: var(
            --ha-color-fill-danger-quiet-active
          );
        }

        :host([appearance~="plain"]) .button {
          color: var(--wa-color-on-normal);
          background-color: transparent;
        }
        :host([appearance~="plain"]) .button.disabled {
          background-color: transparent;
          color: var(--ha-color-on-disabled-quiet);
        }

        :host([appearance~="outlined"]) .button.disabled {
          background-color: transparent;
          color: var(--ha-color-on-disabled-quiet);
        }

        @media (hover: hover) {
          :host([appearance~="filled"])
            .button:not(.disabled):not(.loading):hover {
            background-color: var(--button-color-fill-normal-hover);
          }
          :host([appearance~="accent"])
            .button:not(.disabled):not(.loading):hover {
            background-color: var(--button-color-fill-loud-hover);
          }
          :host([appearance~="plain"])
            .button:not(.disabled):not(.loading):hover {
            color: var(--wa-color-on-normal);
          }
        }
        :host([appearance~="filled"]) .button {
          color: var(--wa-color-on-normal);
          background-color: var(--wa-color-fill-normal);
          border-color: transparent;
        }
        :host([appearance~="filled"])
          .button:not(.disabled):not(.loading):active {
          background-color: var(--button-color-fill-normal-active);
        }
        :host([appearance~="filled"]) .button.disabled {
          background-color: var(--ha-color-fill-disabled-normal-resting);
          color: var(--ha-color-on-disabled-normal);
        }
        :host([appearance~="plain"])
          .button:not(.disabled):not(.loading):active {
          background-color: var(--button-color-fill-quiet-active);
        }

        :host([appearance~="accent"]) .button {
          background-color: var(
            --wa-color-fill-loud,
            var(--wa-color-neutral-fill-loud)
          );
        }
        :host([appearance~="accent"])
          .button:not(.disabled):not(.loading):active {
          background-color: var(--button-color-fill-loud-active);
        }
        :host([appearance~="accent"]) .button.disabled {
          background-color: var(--ha-color-fill-disabled-loud-resting);
          color: var(--ha-color-on-disabled-loud);
        }

        :host([loading]) {
          pointer-events: none;
        }

        .button.disabled {
          opacity: 1;
        }

        slot[name="start"]::slotted(*) {
          margin-inline-end: var(--ha-space-1);
        }
        slot[name="end"]::slotted(*) {
          margin-inline-start: var(--ha-space-1);
        }

        .button.has-start {
          padding-inline-start: var(--ha-space-2);
        }
        .button.has-end {
          padding-inline-end: var(--ha-space-2);
        }

        .label {
          overflow: var(--ha-button-label-overflow, hidden);
          text-overflow: ellipsis;
          padding: var(--ha-space-1) 0;
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
