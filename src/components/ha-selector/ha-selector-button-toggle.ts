import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { caseInsensitiveStringCompare } from "../../common/string/compare";
import type { ButtonToggleSelector, SelectOption } from "../../data/selector";
import type { HomeAssistant, ToggleButton } from "../../types";
import "../ha-button-toggle-group";

@customElement("ha-selector-button_toggle")
export class HaButtonToggleSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: ButtonToggleSelector;

  @property() public value?: string;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ attribute: false })
  public localizeValue?: (key: string) => string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  protected render() {
    const options =
      this.selector.button_toggle?.options?.map((option) =>
        typeof option === "object"
          ? (option as SelectOption)
          : ({ value: option, label: option } as SelectOption)
      ) || [];

    const translationKey = this.selector.button_toggle?.translation_key;

    if (this.localizeValue && translationKey) {
      options.forEach((option) => {
        const localizedLabel = this.localizeValue!(
          `${translationKey}.options.${option.value}`
        );
        if (localizedLabel) {
          option.label = localizedLabel;
        }
      });
    }

    if (this.selector.button_toggle?.sort) {
      options.sort((a, b) =>
        caseInsensitiveStringCompare(
          a.label,
          b.label,
          this.hass.locale.language
        )
      );
    }

    const toggleButtons: ToggleButton[] = options.map((item: SelectOption) => ({
      label: item.label,
      value: item.value,
    }));

    return html`
      ${this.label}
      <ha-button-toggle-group
        .buttons=${toggleButtons}
        .active=${this.value}
        @value-changed=${this._valueChanged}
      ></ha-button-toggle-group>
    `;
  }

  private _valueChanged(ev) {
    ev.stopPropagation();

    const value = ev.detail?.value || ev.target.value;
    if (this.disabled || value === undefined || value === (this.value ?? "")) {
      return;
    }
    fireEvent(this, "value-changed", {
      value: value,
    });
  }

  static styles = css`
    :host {
      position: relative;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    @media all and (max-width: 600px) {
      ha-button-toggle-group {
        flex: 1;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-button_toggle": HaButtonToggleSelector;
  }
}
