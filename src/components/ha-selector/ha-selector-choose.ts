import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { isTemplate } from "../../common/string/has-template";
import type { ChooseSelector, Selector } from "../../data/selector";
import type { HomeAssistant } from "../../types";
import "../ha-button-toggle-group";
import "./ha-selector";

@customElement("ha-selector-choose")
export class HaChooseSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: ChooseSelector;

  @property() public value?: any;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ attribute: false })
  public localizeValue?: (key: string) => string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @state() public _activeChoice?: string;

  protected willUpdate(changedProperties: PropertyValues): void {
    if (
      changedProperties.has("selector") &&
      (!this._activeChoice ||
        !(this._activeChoice in this.selector.choose.choices))
    ) {
      this._setActiveChoice();
    }
    if (
      changedProperties.has("value") &&
      changedProperties.get("value")?.active_choice &&
      changedProperties.get("value")?.active_choice !== this._activeChoice
    ) {
      this._setActiveChoice();
    }
  }

  protected render() {
    if (!this._activeChoice) {
      return nothing;
    }

    const selector = this._selector(this._activeChoice);
    const value = this._value(this._activeChoice);

    return html`<div class="multi-header">
        <span>${this.label}${this.required ? "*" : ""}</span>
        <ha-button-toggle-group
          size="small"
          .buttons=${this._toggleButtons(
            this.selector.choose.choices,
            this.selector.choose.translation_key,
            this.hass.localize
          )}
          .active=${this._activeChoice}
          @value-changed=${this._choiceChanged}
        ></ha-button-toggle-group>
      </div>
      <ha-selector
        .hass=${this.hass}
        .selector=${selector}
        .value=${value}
        .disabled=${this.disabled}
        .required=${this.required}
        @value-changed=${this._handleValueChanged}
        .helper=${this.helper}
      ></ha-selector>`;
  }

  private _toggleButtons = memoizeOne(
    (
      choices: ChooseSelector["choose"]["choices"],
      translationKey?: string,
      _localize?: HomeAssistant["localize"]
    ) =>
      Object.keys(choices).map((choice) => ({
        label:
          this.localizeValue && translationKey
            ? this.localizeValue(`${translationKey}.choices.${choice}`)
            : choice,
        value: choice,
      }))
  );

  private _choiceChanged(ev) {
    ev.stopPropagation();
    const value =
      typeof this.value === "object"
        ? this.value
        : {
            [this._activeChoice!]: this.value,
          };
    this._activeChoice = ev.detail?.value || ev.target.value;
    fireEvent(this, "value-changed", {
      value: {
        ...value,
        active_choice: this._activeChoice,
      },
    });
  }

  private _handleValueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = typeof this.value === "object" ? this.value : {};
    fireEvent(this, "value-changed", {
      value: {
        ...value,
        [this._activeChoice!]: ev.detail.value,
        active_choice: this._activeChoice,
      },
    });
  }

  private _selector(choice?: string): Selector {
    const choices = this.selector.choose.choices;

    choice = choice || this.value?.active_choice;

    if (choice && choice in choices) {
      return choices[choice].selector;
    }

    return choices[Object.keys(choices)[0]].selector;
  }

  private _value(choice?: string): any {
    if (!this.value) {
      return undefined;
    }
    return typeof this.value === "object"
      ? this.value[choice || this.value.active_choice]
      : this.value;
  }

  private _setActiveChoice() {
    if (this.value) {
      if (typeof this.value === "object") {
        if (this.value.active_choice in this.selector.choose.choices) {
          this._activeChoice = this.value.active_choice;
          return;
        }
      } else {
        const typeofValue = typeof this.value;
        const selectorTypes = Object.values(this.selector.choose.choices).map(
          (choice) => Object.keys(choice.selector)[0]
        );
        if (typeofValue === "number" && selectorTypes.includes("number")) {
          this._activeChoice = Object.keys(this.selector.choose.choices)[
            selectorTypes.indexOf("number")
          ];
          return;
        }
        if (
          typeofValue === "string" &&
          isTemplate(this.value) &&
          selectorTypes.includes("template")
        ) {
          this._activeChoice = Object.keys(this.selector.choose.choices)[
            selectorTypes.indexOf("template")
          ];
          return;
        }
        if (
          typeofValue === "string" &&
          this.value.includes(".") &&
          selectorTypes.includes("entity")
        ) {
          this._activeChoice = Object.keys(this.selector.choose.choices)[
            selectorTypes.indexOf("entity")
          ];
          return;
        }
        if (typeofValue === "string" && selectorTypes.includes("text")) {
          this._activeChoice = Object.keys(this.selector.choose.choices)[
            selectorTypes.indexOf("text")
          ];
          return;
        }
      }
    }
    this._activeChoice = Object.keys(this.selector.choose.choices)[0];
  }

  static styles = css`
    .multi-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--ha-space-2);
    }
    ha-button-toggle-group {
      display: block;
      justify-self: end;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-choose": HaChooseSelector;
  }
}
