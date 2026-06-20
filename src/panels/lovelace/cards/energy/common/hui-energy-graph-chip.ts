import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../../components/ha-tooltip";

@customElement("hui-energy-graph-chip")
export class HuiEnergyGraphChip extends LitElement {
  @property({ type: String }) public tooltip?: string;

  // Opt-in square shape (equal padding, centred content) for icon-only chips, same height as a text
  // chip. Off by default so the text chips other energy cards use are unaffected.
  @property({ type: Boolean }) public square = false;

  protected render() {
    const id = `energy-graph-chip-${Date.now()}`;
    return html`
      <div class="chip ${this.square ? "square" : ""}" id=${id}>
        <slot></slot>
      </div>
      ${this.tooltip
        ? html`<ha-tooltip for=${id} placement="top"
            >${this.tooltip}</ha-tooltip
          >`
        : nothing}
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
    /* Square icon chip: equal padding centres a same-height (one text line) square icon, so the box
       matches the text chip's height and its width equals that height. */
    .chip.square {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      padding: var(--ha-space-1);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-graph-chip": HuiEnergyGraphChip;
  }
}
