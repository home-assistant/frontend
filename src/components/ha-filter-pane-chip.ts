import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "./chips/ha-assist-chip";
import "./ha-svg-icon";

/**
 * Chip that opens a filter pane, with a badge showing how many filters are
 * active.
 */
@customElement("ha-filter-pane-chip")
export class HaFilterPaneChip extends LitElement {
  @property() public label = "";

  /** SVG path of the leading icon. */
  @property() public path?: string;

  /** Number of active filters, shown as a badge when there is at least one. */
  @property({ type: Number }) public count = 0;

  @property({ type: Boolean }) public active = false;

  @property({ type: Boolean }) public disabled = false;

  protected render() {
    return html`
      <ha-assist-chip
        .label=${this.label}
        .active=${this.active}
        .disabled=${this.disabled}
      >
        ${
          this.path
            ? html`<ha-svg-icon slot="icon" .path=${this.path}></ha-svg-icon>`
            : nothing
        }
      </ha-assist-chip>
      ${this.count ? html`<div class="badge">${this.count}</div>` : nothing}
    `;
  }

  static styles = css`
    :host {
      position: relative;
      display: inline-block;
      --ha-assist-chip-container-shape: 10px;
    }

    .badge {
      position: absolute;
      top: -4px;
      right: -4px;
      inset-inline-end: -4px;
      inset-inline-start: initial;
      min-width: 16px;
      box-sizing: border-box;
      border-radius: var(--ha-border-radius-circle);
      font-size: var(--ha-font-size-xs);
      font-weight: var(--ha-font-weight-normal);
      background-color: var(--primary-color);
      line-height: var(--ha-line-height-normal);
      text-align: center;
      padding: 0 2px;
      color: var(--text-primary-color);
      pointer-events: none;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-filter-pane-chip": HaFilterPaneChip;
  }
}
