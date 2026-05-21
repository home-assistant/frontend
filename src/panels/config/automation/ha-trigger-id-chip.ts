import { mdiPound } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-svg-icon";

@customElement("ha-trigger-id-chip")
export class HaTriggerIdChip extends LitElement {
  @property({ attribute: "trigger-id" }) public triggerId?: string;

  @property({ attribute: false }) public triggerIds?: string[];

  @property({ type: Boolean, reflect: true }) public warning = false;

  protected render() {
    const label =
      this.triggerIds !== undefined
        ? this.triggerIds.join(", ")
        : this.triggerId;
    return html`
      <slot name="start"> </slot>
      <ha-svg-icon .path=${mdiPound}></ha-svg-icon>
      <span>${label !== undefined ? label : nothing}</span>
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
