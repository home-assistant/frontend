import "@shoelace-style/shoelace/dist/components/tooltip/tooltip";
import { ifDefined } from "lit/directives/if-defined";
import { styles } from "@material/mwc-switch/deprecated/mwc-switch.css";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";

@customElement("ha-tooltip")
export class HaTooltip extends LitElement {
  @property({ type: String }) public content?: string;

  @property({ type: String }) public placement?:
    | "top"
    | "top-start"
    | "top-end"
    | "right"
    | "right-start"
    | "right-end"
    | "bottom"
    | "bottom-start"
    | "bottom-end"
    | "left"
    | "left-start"
    | "left-end";

  @property({ type: Boolean }) public disabled?: boolean;

  render() {
    return html`
      <sl-tooltip
        placement=${ifDefined(this.placement)}
        content=${ifDefined(this.content)}
        ?disabled=${this.disabled}
      >
        <slot></slot>
      </sl-tooltip>
    `;
  }

  static override styles = [
    styles,
    css`
      :host {
        --sl-tooltip-arrow-size: 8px;
      }
      sl-tooltip::part(base__popup) {
        border-radius: 4px;
      }
      sl-tooltip::part(base__arrow),
      sl-tooltip::part(base__popup) {
        background-color: var(--secondary-background-color);
      }
      sl-tooltip::part(base__popup) {
        box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
      }
      sl-tooltip::part(body) {
        padding: 8px;
      }
      @media (prefers-color-scheme: dark) {
        sl-tooltip::part(base__popup) {
          box-shadow: 0px 4px 8px rgba(255, 255, 255, 0.1);
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-tooltip": HaTooltip;
  }
}
