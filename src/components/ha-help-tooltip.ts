import { mdiHelpCircle } from "@mdi/js";
import "@polymer/paper-tooltip/paper-tooltip";
import {
  css,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import "./ha-svg-icon";

@customElement("ha-help-tooltip")
export class HaHelpTooltip extends LitElement {
  @property() public label!: string;

  @property() public position = "top";

  protected render(): TemplateResult {
    return html`
      <ha-svg-icon .path=${mdiHelpCircle}></ha-svg-icon>
      <paper-tooltip
        offset="4"
        .position=${this.position}
        .fitToVisibleBounds=${true}
        >${this.label}</paper-tooltip
      >
    `;
  }

  static get styles() {
    return css`
      ha-svg-icon {
        --mdc-icon-size: var(--ha-help-tooltip-size, 14px);
        color: var(--ha-help-tooltip-color, var(--disabled-text-color));
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-help-tooltip": HaHelpTooltip;
  }
}
