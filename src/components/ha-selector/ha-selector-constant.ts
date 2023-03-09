import { LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { ConstantSelector } from "../../data/selector";

@customElement("ha-selector-constant")
export class HaSelectorConstant extends LitElement {
  @property() public selector!: ConstantSelector;

  @property({ type: Boolean }) public disabled = false;

  protected render() {
    if (this.disabled) {
      return nothing;
    }

    return (
      this.selector.constant?.label ?? this.selector.constant?.value ?? nothing
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-constant": HaSelectorConstant;
  }
}
