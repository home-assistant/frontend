import { mdiHelpCircle } from "@mdi/js";
import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "./ha-svg-icon";
import "./ha-tooltip";

@customElement("ha-help-tooltip")
export class HaHelpTooltip extends LitElement {
  @property() public label!: string;

  @property() public position:
    | "top"
    | "bottom"
    | "left"
    | "right"
    | "top-start"
    | "top-end"
    | "right-start"
    | "right-end"
    | "bottom-start"
    | "bottom-end"
    | "left-start"
    | "left-end" = "top";

  protected render(): TemplateResult {
    return html`
      <ha-svg-icon id="svg-icon" .path=${mdiHelpCircle}></ha-svg-icon>
      <ha-tooltip for="svg-icon" .placement=${this.position}>
        ${this.label}
      </ha-tooltip>
    `;
  }

  static styles = css`
    ha-svg-icon {
      --mdc-icon-size: var(--ha-help-tooltip-size, 14px);
      color: var(--ha-help-tooltip-color, var(--disabled-text-color));
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-help-tooltip": HaHelpTooltip;
  }
}
