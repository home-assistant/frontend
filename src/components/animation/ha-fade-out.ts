import WaAnimation from "@home-assistant/webawesome/dist/components/animation/animation";
import { customElement, property } from "lit/decorators";

@customElement("ha-fade-out")
export class HaFadeOut extends WaAnimation {
  @property({ type: Boolean }) public play = true;

  constructor() {
    super();
    this.iterations = 1;
    this.fill = "both";
    this.name = "fadeOut";
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-fade-out": HaFadeOut;
  }
}
