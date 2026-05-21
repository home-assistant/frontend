import { mdiPound } from "@mdi/js";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-svg-icon";

/**
 * Home Assistant trigger ID chip component
 *
 * @element ha-trigger-id-chip
 * @extends {LitElement}
 *
 * @summary
 * A small chip that displays an automation trigger ID prefixed with a hash icon.
 *
 * @slot start - Optional content rendered before the hash icon (usually an icon).
 *
 * @attr {string} trigger-id - The trigger ID to display.
 * @attr {boolean} warning - Renders the chip with warning colors.
 */
@customElement("ha-trigger-id-chip")
export class HaTriggerIdChip extends LitElement {
  @property({ attribute: "trigger-id" }) public triggerId!: string;

  @property({ type: Boolean, reflect: true }) public warning = false;

  protected render() {
    return html`
      <slot name="start"></slot>
      <ha-svg-icon .path=${mdiPound}></ha-svg-icon>
      <span>${this.triggerId}</span>
    `;
  }

  static styles = css`
    :host {
      background-color: var(--card-background-color);
      border-radius: var(--ha-border-radius-sm);
      border: var(--ha-border-width-sm) solid
        var(--ha-color-border-neutral-normal);
      --mdc-icon-size: 16px;
      display: inline-flex;
      gap: var(--ha-space-1);
      align-items: center;
      color: var(--ha-color-on-neutral-normal);
      padding: 0 var(--ha-space-1);
      font-weight: var(--ha-font-weight-medium);
      line-height: 20px;
      height: 20px;
    }
    :host([warning]) {
      border-color: var(--ha-color-border-warning-normal);
      color: var(--ha-color-on-warning-normal);
      background-color: var(--ha-color-fill-warning-quiet-resting);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-trigger-id-chip": HaTriggerIdChip;
  }
}
