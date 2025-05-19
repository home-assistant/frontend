import Button from "@shoelace-style/shoelace/dist/components/button/button.component";
import styles from "@shoelace-style/shoelace/dist/components/button/button.styles";
import { css } from "lit";
import { customElement, property } from "lit/decorators";

@customElement("ha-button")
export class HaButton extends Button {
  @property({ type: Boolean }) pill = true;

  static override styles = [
    styles,
    css`
      :host {
        --sl-input-border-width: 0;
        --sl-input-font-family: var(
          --ha-button-font-family,
          var(--ha-font-family-body)
        );
        --sl-font-weight-semibold: var(--ha-font-weight-medium);
        --sl-transition-x-fast: 0.1s; /* ? */
        --sl-focus-ring: none; /* ? */
        --sl-focus-ring-offset: 0; /* ? */
      }

      .button {
        height: 40px;
        align-items: center;
      }
      .button.button--small {
        height: 32px;
      }

      /* Default */
      .button--standard.button--default,
      .button--standard.button--primary:active:not(.button--disabled) {
        background-color: var(
          --ha-button-background-color,
          var(--primary-color)
        );
        color: var(--ha-button-text-color, var(--white-color));
      }
      .button--standard.button--default:hover:not(.button--disabled) {
        background-color: var(
          --ha-button-background-color,
          var(--dark-primary-color)
        );
        color: var(--ha-button-text-color, var(--white-color));
      }

      /* Danger */
      :host([destructive]) .button--standard,
      .button--standard.button--danger,
      .button--standard.button--danger:active:not(.button--disabled) {
        background-color: var(--ha-button-background-color, var(--error-color));
        color: var(--ha-button-text-color, var(--white-color));
      }

      :host([destructive]) .button--standard:hover:not(.button--disabled),
      .button--standard.button--danger:hover:not(.button--disabled) {
        background-color: var(--ha-button-background-color, var(--error-color));
        color: var(--ha-button-text-color, var(--white-color));
      }

      /*
      * Text buttons
      */

      .button--text,
      .button--text:active:not(.button--disabled) {
        color: var(--ha-button-text-color, var(--primary-color));
      }

      .button--text:hover:not(.button--disabled),
      .button--text:focus-visible:not(.button--disabled) {
        background-color: transparent;
        border-color: transparent;
        color: var(--ha-button-text-color, var(--dark-primary-color));
      }

      .button--pill.button--small {
        border-radius: 30px;
      }

      .button--pill.button--medium {
        border-radius: 48px;
      }

      /*
      * Button spacing
      */

      .button--has-label.button--small .button__label {
        padding: 0 12px;
      }

      .button--has-label.button--medium .button__label {
        padding: 0 16px;
      }

      .button--has-prefix.button--small,
      .button--has-prefix.button--small .button__label {
        padding-inline-start: 8px;
      }

      .button--has-prefix.button--medium,
      .button--has-prefix.button--medium .button__label {
        padding-inline-start: 12px;
      }

      .button--has-suffix.button--small,
      .button--caret.button--small,
      .button--has-suffix.button--small .button__label,
      .button--caret.button--small .button__label {
        padding-inline-end: 8px;
      }

      .button--has-suffix.button--medium,
      .button--caret.button--medium,
      .button--has-suffix.button--medium .button__label,
      .button--caret.button--medium .button__label {
        padding-inline-end: 12px;
      }

      ::slotted([slot="icon"]) {
        margin-inline-start: 0px;
        margin-inline-end: 8px;
        direction: var(--direction);
        display: block;
      }
      .mdc-button {
        height: var(--button-height, 36px);
      }
      .trailing-icon {
        display: flex;
      }
      .slot-container {
        overflow: var(--button-slot-container-overflow, visible);
      }
      :host([destructive]) {
        --mdc-theme-primary: var(--error-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-button": HaButton;
  }
}
