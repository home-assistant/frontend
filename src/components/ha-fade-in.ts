import SlAnimation from "@shoelace-style/shoelace/dist/components/animation/animation.component";
import { customElement, property } from "lit/decorators";

@customElement("ha-fade-in")
export class HaFadeIn extends SlAnimation {
  @property() public name = "fadeIn";

  @property() public fill: FillMode = "both";

  @property({ type: Boolean }) public play = true;

  @property({ type: Number }) public iterations = 1;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-fade-in": HaFadeIn;
  }
}
