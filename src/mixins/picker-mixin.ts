import type { ReactiveElement } from "lit";
import { property } from "lit/decorators";
import type { Constructor } from "../types";
import type { PickerValueRenderer } from "../components/ha-picker-field";

export const PickerMixin = <T extends Constructor<ReactiveElement>>(
  superClass: T
) => {
  class PickerFieldClass extends superClass {
    @property({ type: Boolean }) public disabled = false;

    @property({ type: Boolean }) public required = false;

    @property() public icon?: string;

    @property() public image?: string;

    @property() public label?: string;

    @property() public placeholder?: string;

    @property() public helper?: string;

    @property() public value?: string;

    @property({ type: Boolean, reflect: true }) public unknown = false;

    @property({ attribute: "unknown-item-text" })
    public unknownItemText?: string;

    @property({ attribute: "hide-clear-icon", type: Boolean })
    public hideClearIcon = false;

    @property({ attribute: false })
    public valueRenderer?: PickerValueRenderer;
  }
  return PickerFieldClass;
};
