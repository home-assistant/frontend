import WaAnimation from "@home-assistant/webawesome/dist/components/animation/animation";
import { customElement, property } from "lit/decorators";

@customElement("ha-fade-in")
export class HaFadeIn extends WaAnimation {
  @property({ type: Boolean }) public play = true;

  constructor() {
    super();
    this.iterations = 1;
    this.fill = "both";
    this.name = "fadeIn";
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-fade-in": HaFadeIn;
  }
}
