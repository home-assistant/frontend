import { customElement } from "lit/decorators";
import { HaFormString } from "../components/ha-form/ha-form-string";
import "../components/ha-icon-button";
import "../components/input/ha-input";

@customElement("ha-auth-form-string")
export class HaAuthFormString extends HaFormString {
  protected createRenderRoot() {
    return this;
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this.style.position = "relative";
  }

  public reportValidity(): boolean {
    return this.querySelector("ha-input")?.reportValidity() ?? true;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-auth-form-string": HaAuthFormString;
  }
}
