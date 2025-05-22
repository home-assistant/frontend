import Button from "@shoelace-style/shoelace/dist/components/button/button.component";
import styles from "@shoelace-style/shoelace/dist/components/button/button.styles";
import { css } from "lit";
import { customElement, property } from "lit/decorators";

/**
 * Home Assistant button component
 *
 * @element ha-button
 * @extends {Button}
 *
 * @summary
 * A stylable button component supporting Home Assistant theming, variants, and appearances.
 *
 * @slot - Label of the button
 * @slot prefix - The prefix container (usually for icons).
 * @slot suffix - The suffix container (usually for icons).
 *
 * @csspart base - The component's base wrapper.
 * @csspart prefix - The container that wraps the prefix.
 * @csspart label - The button's label.
 * @csspart suffix - The container that wraps the suffix.
 * @csspart caret - The button's caret icon, an `<sl-icon>` element.
 * @csspart spinner - The spinner that shows when the button is in the loading state.
 *
 * @cssprop --ha-button-font-family - Font family for the button text.
 * @cssprop --ha-font-weight-medium - Medium font weight for button text.
 * @cssprop --ha-button-border-width - Border width for the button.
 * @cssprop --ha-button-theme-color - Main color for the button.
 * @cssprop --ha-button-theme-darker-color - Darker variant of the main color.
 * @cssprop --ha-button-theme-lighter-color - Lighter variant of the main color.
 * @cssprop --ha-button-height - Height of the button.
 * @cssprop --ha-button-border-radius - Border radius for the button.
 * @cssprop --ha-button-text-color - Text color for the button.
 * @cssprop --ha-button-font-size - Font weight for the button text.
 *
 * @attr {("small"|"medium")} size - Sets the button size.
 * @attr {("primary"|"danger"|"neutral"|"warning")} variant - Sets the button color variant. "primary" is default.
 * @attr {("accent"|"filled"|"plain")} appearance - Sets the button appearance.
 */
@customElement("ha-button")
export class HaButton extends Button {
  @property() appearance?: "accent" | "filled" | "plain";

  static override styles = [
    styles,
    css`
      :host {
        --sl-input-font-family: var(
          --ha-button-font-family,
          var(--ha-font-family-body)
        );
        --sl-font-weight-semibold: var(
          --ha-button-font-weight,
          var(--ha-font-weight-medium)
        );
        --sl-transition-x-fast: 0.4s;
        --sl-focus-ring: solid 4px var(--accent-color);
        --sl-focus-ring-offset: 1px;
        --sl-button-font-size-small: var(
          --ha-button-font-size,
          var(--ha-font-size-m)
        );
        --sl-button-font-size-medium: var(
          --ha-button-font-size,
          var(--ha-font-size-m)
        );

        --sl-spacing-medium: 16px;
        --sl-spacing-small: 12px;
        --sl-spacing-x-small: 8px;

        --ha-button-theme-color: var(--primary-color);
        --ha-button-theme-darker-color: var(--dark-primary-color);
        --ha-button-theme-lighter-color: #dff3fc;

        line-height: 1;
        --sl-input-border-width: var(--ha-button-border-width, 0);
      }

      :host([destructive]), /* Deprecated */
      :host([variant="danger"]) {
        --ha-button-theme-color: #b30532;
        --ha-button-theme-darker-color: #64031d;
        --ha-button-theme-lighter-color: #ffdedc;
      }

      :host([variant="neutral"]) {
        --ha-button-theme-color: #545868;
        --ha-button-theme-darker-color: #373a44;
        --ha-button-theme-lighter-color: #e4e5e9;
      }

      :host([variant="warning"]) {
        --ha-button-theme-color: #b45f04;
        --ha-button-theme-darker-color: #9c5203;
        --ha-button-theme-lighter-color: #fef3cd;
      }

      .button {
        height: var(--ha-button-height, var(--button-height, 40px));
        align-items: center;
        border-radius: var(--ha-button-border-radius, 48px);
      }
      .button.button--small {
        border-radius: var(--ha-button-border-radius, 32px);
        height: var(--ha-button-height, var(--button-height, 32px));
      }

      .button,
      .button--standard.button--default,
      .button--standard.button--primary,
      .button--standard.button--neutral,
      .button--standard.button--danger,
      .button--standard.button--warning,
      .button--standard.button--default:active:not(.button--disabled),
      .button--standard.button--primary:active:not(.button--disabled),
      .button--standard.button--neutral:active:not(.button--disabled),
      .button--standard.button--danger:active:not(.button--disabled),
      .button--standard.button--warning:active:not(.button--disabled),
      .button:active:not(.button--disabled) {
        background-color: var(--ha-button-theme-color);
        color: var(--ha-button-text-color, var(--white-color));
      }
      .button:hover:not(.button--disabled),
      .button--standard.button--default:hover:not(.button--disabled),
      .button--standard.button--primary:hover:not(.button--disabled),
      .button--standard.button--neutral:hover:not(.button--disabled),
      .button--standard.button--warning:hover:not(.button--disabled),
      .button--standard.button--danger:hover:not(.button--disabled) {
        background-color: var(--ha-button-theme-darker-color);
        color: var(--ha-button-text-color, var(--white-color));
      }

      :host([appearance="filled"]) .button,
      :host([appearance="filled"]) .button:active:not(.button--disabled) {
        background-color: var(--ha-button-theme-lighter-color);
        color: var(--ha-button-text-color, var(--ha-button-theme-color));
      }
      :host([appearance="filled"]) .button:hover:not(.button--disabled) {
        background-color: var(--ha-button-theme-color);
        color: var(--white-color);
      }

      :host([appearance="plain"]) .button,
      :host([appearance="plain"]) .button:active:not(.button--disabled) {
        background-color: transparent;
        color: var(--ha-button-text-color, var(--ha-button-theme-color));
      }
      :host([appearance="plain"]) .button:hover:not(.button--disabled) {
        background-color: var(--ha-button-theme-lighter-color);
        color: var(--ha-button-text-color, var(--ha-button-theme-darker-color));
      }

      /* spacing */
      .button--has-prefix.button--medium .button__label {
        padding-inline-start: 8px;
      }
      .button--has-prefix.button--small .button__label {
        padding-inline-start: 4px;
      }
      .button--has-suffix.button--medium .button__label,
      .button--caret.button--medium .button__label {
        padding-inline-end: 8px;
      }
      .button--has-suffix.button--small .button__label,
      .button--caret.button--small .button__label {
        padding-inline-end: 4px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-button": HaButton;
  }
}
