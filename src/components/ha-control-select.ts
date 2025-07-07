import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { repeat } from "lit/directives/repeat";
import { fireEvent } from "../common/dom/fire_event";
import "./ha-icon";
import "./ha-svg-icon";

export interface ControlSelectOption {
  value: string;
  label?: string;
  icon?: TemplateResult;
  path?: string;
}

@customElement("ha-control-select")
export class HaControlSelect extends LitElement {
  @property({ type: Boolean }) disabled = false;

  @property({ attribute: false }) public options?: ControlSelectOption[];

  @property() public value?: string;

  @property({ type: Boolean, reflect: true })
  public vertical = false;

  @property({ type: Boolean, attribute: "hide-option-label" })
  public hideOptionLabel = false;

  @property({ type: String })
  public label?: string;

  @state() private _activeIndex?: number;

  private _handleFocus() {
    if (this.disabled) return;
    this._activeIndex =
      (this.value != null
        ? this.options?.findIndex((option) => option.value === this.value)
        : undefined) ?? 0;
  }

  private _handleBlur() {
    this._activeIndex = undefined;
  }

  private _handleKeydown(ev: KeyboardEvent) {
    if (!this.options || this._activeIndex == null || this.disabled) return;
    const value = this.options[this._activeIndex].value;
    switch (ev.key) {
      case " ":
      case "Enter":
        this.value = value;
        fireEvent(this, "value-changed", { value });
        break;
      case "ArrowUp":
      case "ArrowLeft":
        this._activeIndex =
          this._activeIndex <= 0
            ? this.options.length - 1
            : this._activeIndex - 1;
        break;
      case "ArrowDown":
      case "ArrowRight":
        this._activeIndex = (this._activeIndex + 1) % this.options.length;
        break;
      case "Home":
        this._activeIndex = 0;
        break;
      case "End":
        this._activeIndex = this.options.length - 1;
        break;
      default:
        return;
    }
    ev.preventDefault();
  }

  private _handleOptionClick(ev: MouseEvent) {
    if (this.disabled) return;
    const value = (ev.target as any).value;
    this.value = value;
    fireEvent(this, "value-changed", { value });
  }

  private _handleOptionMouseDown(ev: MouseEvent) {
    if (this.disabled) return;
    ev.preventDefault();
    const value = (ev.target as any).value;
    this._activeIndex = this.options?.findIndex(
      (option) => option.value === value
    );
  }

  private _handleOptionMouseUp(ev: MouseEvent) {
    ev.preventDefault();
    this._activeIndex = undefined;
  }

  protected render() {
    const activeValue =
      this._activeIndex != null
        ? this.options?.[this._activeIndex]?.value
        : undefined;
    const activedescendant =
      activeValue != null ? `option-${activeValue}` : undefined;

    return html`
      <div
        class="container"
        role="listbox"
        tabindex="0"
        aria-label=${ifDefined(this.label)}
        aria-orientation=${this.vertical ? "vertical" : "horizontal"}
        aria-activedescendant=${ifDefined(activedescendant)}
        @focus=${this._handleFocus}
        @blur=${this._handleBlur}
        @keydown=${this._handleKeydown}
        ?disabled=${this.disabled}
      >
        ${this.options
          ? repeat(
              this.options,
              (option) => option.value,
              (option, idx) => this._renderOption(option, idx)
            )
          : nothing}
      </div>
    `;
  }

  private _renderOption(option: ControlSelectOption, index: number) {
    return html`
      <div
        id=${`option-${option.value}`}
        class=${classMap({
          option: true,
          selected: this.value === option.value,
          focused: this._activeIndex === index,
        })}
        role="option"
        .value=${option.value}
        aria-selected=${this.value === option.value ? "true" : "false"}
        aria-label=${ifDefined(option.label)}
        title=${ifDefined(option.label)}
        @click=${this._handleOptionClick}
        @mousedown=${this._handleOptionMouseDown}
        @mouseup=${this._handleOptionMouseUp}
      >
        <div class="content">
          ${option.path
            ? html`<ha-svg-icon .path=${option.path}></ha-svg-icon>`
            : option.icon || nothing}
          ${option.label && !this.hideOptionLabel
            ? html`<span>${option.label}</span>`
            : nothing}
        </div>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      --control-select-color: var(--primary-color);
      --control-select-focused-opacity: 0.2;
      --control-select-selected-opacity: 1;
      --control-select-background: var(--disabled-color);
      --control-select-background-opacity: 0.2;
      --control-select-thickness: 40px;
      --control-select-border-radius: 10px;
      --control-select-padding: 4px;
      --control-select-button-border-radius: calc(
        var(--control-select-border-radius) - var(--control-select-padding)
      );
      --mdc-icon-size: 20px;
      height: var(--control-select-thickness);
      width: 100%;
      font-style: normal;
      font-weight: var(--ha-font-weight-medium);
      color: var(--primary-text-color);
      user-select: none;
      -webkit-tap-highlight-color: transparent;
    }
    :host([vertical]) {
      width: var(--control-select-thickness);
      height: 100%;
    }
    .container {
      position: relative;
      height: 100%;
      width: 100%;
      border-radius: var(--control-select-border-radius);
      transform: translateZ(0);
      overflow: hidden;
      display: flex;
      flex-direction: row;
      padding: var(--control-select-padding);
      box-sizing: border-box;
      outline: none;
      transition: box-shadow 180ms ease-in-out;
    }
    .container::before {
      position: absolute;
      content: "";
      top: 0;
      left: 0;
      height: 100%;
      width: 100%;
      background: var(--control-select-background);
      opacity: var(--control-select-background-opacity);
    }

    .container > *:not(:last-child) {
      margin-right: var(--control-select-padding);
      margin-inline-end: var(--control-select-padding);
      margin-inline-start: initial;
      direction: var(--direction);
    }
    .container[disabled] {
      --control-select-color: var(--disabled-color);
      --control-select-focused-opacity: 0;
      color: var(--disabled-color);
    }

    .container[disabled] .option {
      cursor: not-allowed;
    }

    .container:focus-visible {
      box-shadow: 0 0 0 2px var(--control-select-color);
    }

    .option {
      cursor: pointer;
      position: relative;
      flex: 1;
      height: 100%;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--control-select-button-border-radius);
      overflow: hidden;
      /* For safari border-radius overflow */
      z-index: 0;
    }
    .content > *:not(:last-child) {
      margin-bottom: 4px;
    }
    .option::before {
      position: absolute;
      content: "";
      top: 0;
      left: 0;
      height: 100%;
      width: 100%;
      background-color: var(--control-select-color);
      opacity: 0;
      transition:
        background-color ease-in-out 180ms,
        opacity ease-in-out 80ms;
    }
    .option.focused::before,
    .option:hover::before {
      opacity: var(--control-select-focused-opacity);
    }
    .option.selected {
      color: white;
    }
    .option.selected::before {
      opacity: var(--control-select-selected-opacity);
    }
    .option .content {
      position: relative;
      pointer-events: none;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      text-align: center;
      padding: 2px;
      width: 100%;
      box-sizing: border-box;
    }
    .option .content span {
      display: block;
      width: 100%;
      -webkit-hyphens: auto;
      -moz-hyphens: auto;
      hyphens: auto;
    }
    :host([vertical]) {
      width: var(--control-select-thickness);
      height: auto;
    }
    :host([vertical]) .container {
      flex-direction: column;
    }
    :host([vertical]) .container > *:not(:last-child) {
      margin-right: initial;
      margin-inline-end: initial;
      margin-bottom: var(--control-select-padding);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-control-select": HaControlSelect;
  }
}
