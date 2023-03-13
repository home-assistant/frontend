import { LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { ConstantSelector } from "../../data/selector";

@customElement("ha-selector-constant")
export class HaSelectorConstant extends LitElement {
  @property() public selector!: ConstantSelector;

  @property({ type: Boolean }) public disabled = false;

  @property() public localizeValue?: (key: string) => string;

  protected render() {
    if (this.disabled) {
      return nothing;
    }

    const translationKey = this.selector.constant?.translation_key;

    const translatedLabel =
      translationKey && this.localizeValue
        ? this.localizeValue(`${translationKey}.value`)
        : undefined;

    return (
      translatedLabel ??
      this.selector.constant?.label ??
      this.selector.constant?.value ??
      nothing
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-constant": HaSelectorConstant;
  }
}
