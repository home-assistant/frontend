import "@shoelace-style/shoelace/dist/components/animation/animation";
import "./ha-spinner";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";

@customElement("ha-spinner-delayed")
export class HaSpinner extends LitElement {
  @property({ type: Number, attribute: "delay-seconds" }) public delaySeconds =
    1;

  @property() public size?: "tiny" | "small" | "medium" | "large" | number;

  public render() {
    return html`
      <sl-animation
        name="fadeIn"
        .delay=${this.delaySeconds * 1000}
        fill="both"
        .iterations=${1}
        play
      >
        <ha-spinner .size=${this.size}></ha-spinner>
      </sl-animation>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-spinner-delayed": HaSpinner;
  }
}
