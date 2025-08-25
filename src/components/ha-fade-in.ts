import WaAnimation from "@awesome.me/webawesome/dist/components/animation/animation";
import { customElement, property } from "lit/decorators";

@customElement("ha-fade-in")
export class HaFadeIn extends WaAnimation {
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
