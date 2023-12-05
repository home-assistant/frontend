import "@material/mwc-button/mwc-button";
import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators";

const styles = css`
  div {
    position: fixed;
    background-color: var(--sidebar-text-color);
    color: var(--sidebar-background-color);
    padding: 4px;
    border-radius: 2px;
    transform: translateY(-50%);
    white-space: nowrap;
    display: none;
  }
`;

@customElement("ha-sidebar-tooltip")
class HaSidebarTooltip extends LitElement {
  protected render() {
    return html`<div></div>`;
  }

  static styles = styles;
}

export interface TooltipPosition {
  shown: boolean;
  x: number;
  y: number;
}
declare global {
  interface HTMLElementTagNameMap {
    "ha-sidebar-tooltip": HaSidebarTooltip;
  }
}
