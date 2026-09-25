import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../../components/ha-tooltip";

@customElement("hui-energy-graph-chip")
export class HuiEnergyGraphChip extends LitElement {
  @property({ type: String }) public tooltip?: string;

  protected render() {
    const id = `energy-graph-chip-${Date.now()}`;
    return html`
      <div class="chip" id=${id}>
        <slot></slot>
      </div>
      <ha-tooltip for=${id} placement="top">${this.tooltip}</ha-tooltip>
    `;
  }

  static styles = css`
    .chip {
      font-size: var(--ha-font-size-m);
      font-weight: var(--ha-font-weight-medium);
      padding: var(--ha-space-1) var(--ha-space-2);
      border-radius: var(--ha-border-radius-md);
      border: 1px solid var(--divider-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-graph-chip": HuiEnergyGraphChip;
  }
}
