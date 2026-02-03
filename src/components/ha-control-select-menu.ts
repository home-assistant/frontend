import { mdiMenuDown } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import type { HomeAssistant } from "../types";
import "./ha-attribute-icon";
import "./ha-dropdown";
import "./ha-dropdown-item";
import "./ha-icon";
import "./ha-svg-icon";

export interface SelectOption {
  label: string;
  value: string;
  iconPath?: string;
  icon?: string;
  attributeIcon?: {
    stateObj: HassEntity;
    attribute: string;
    attributeValue?: string;
  };
}

@customElement("ha-control-select-menu")
export class HaControlSelectMenu extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, attribute: "show-arrow" })
  public showArrow = false;

  @property({ type: Boolean, attribute: "hide-label" })
  public hideLabel = false;

  @property({ type: Boolean })
  public disabled = false;

  @property({ type: Boolean })
  public required = false;

  @property()
  public label?: string;

  @property()
  public value?: string;

  @property({ attribute: false }) public options: SelectOption[] = [];

  @query("button") private _triggerButton!: HTMLButtonElement;

  public override render() {
    if (this.disabled) {
      return this._renderTrigger();
    }

    return html`
      <ha-dropdown placement="bottom" @wa-show=${this._showDropdown}>
        ${this._renderTrigger()} ${this.options.map(this._renderOption)}
      </ha-dropdown>
    `;
  }

  private _renderTrigger() {
    const selectedText = this.getValueObject(this.options, this.value)?.label;

    const classes = {
      "select-disabled": this.disabled,
      "select-required": this.required,
      "select-no-value": !selectedText,
    };

    return html`<button
      ?disabled=${this.disabled}
      slot="trigger"
      class="select-anchor ${classMap(classes)}"
    >
      ${this._renderIcon()}
      <div class="content">
        ${this.hideLabel
          ? nothing
          : html`<p id="label" class="label">${this.label}</p>`}
        ${selectedText ? html`<p class="value">${selectedText}</p>` : nothing}
      </div>
      ${this._renderArrow()}
    </button>`;
  }

  private _renderOption = (option: SelectOption) =>
    html`<ha-dropdown-item
      .value=${option.value}
      class=${this.value === option.value ? "selected" : ""}
      >${option.iconPath
        ? html`<ha-svg-icon slot="icon" .path=${option.iconPath}></ha-svg-icon>`
        : option.icon
          ? html`<ha-icon slot="icon" .icon=${option.icon}></ha-icon>`
          : option.attributeIcon
            ? html`<ha-attribute-icon
                slot="icon"
                .hass=${this.hass}
                .stateObj=${option.attributeIcon.stateObj}
                .attribute=${option.attributeIcon.attribute}
                .attributeValue=${option.attributeIcon.attributeValue}
              ></ha-attribute-icon>`
            : nothing}
      ${option.label}</ha-dropdown-item
    >`;

  private _renderArrow() {
    if (!this.showArrow) {
      return nothing;
    }

    return html`
      <div class="icon">
        <ha-svg-icon .path=${mdiMenuDown}></ha-svg-icon>
      </div>
    `;
  }

  private _renderIcon() {
    const { iconPath, icon, attributeIcon } =
      this.getValueObject(this.options, this.value) ?? {};
    const defaultIcon = this.querySelector("[slot='icon']");

    return html`
      <div class="icon">
        ${iconPath
          ? html`<ha-svg-icon slot="icon" .path=${iconPath}></ha-svg-icon>`
          : icon
            ? html`<ha-icon slot="icon" .icon=${icon}></ha-icon>`
            : attributeIcon
              ? html`<ha-attribute-icon
                  slot="icon"
                  .hass=${this.hass}
                  .stateObj=${attributeIcon.stateObj}
                  .attribute=${attributeIcon.attribute}
                  .attributeValue=${attributeIcon.attributeValue}
                ></ha-attribute-icon>`
              : defaultIcon
                ? html`<slot name="icon"></slot>`
                : nothing}
      </div>
    `;
  }

  private _showDropdown() {
    this.style.setProperty(
      "--control-select-menu-width",
      `${this._triggerButton.offsetWidth}px`
    );
  }

  private getValueObject = memoizeOne(
    (options: SelectOption[], value?: string) =>
      options.find((option) => option.value === value)
  );

  static override styles = [
    css`
      :host {
        display: inline-block;
        --control-select-menu-focus-color: var(--secondary-text-color);
        --control-select-menu-text-color: var(--primary-text-color);
        --control-select-menu-background-color: var(--disabled-color);
        --control-select-menu-background-opacity: 0.2;
        --control-select-menu-border-radius: var(--ha-border-radius-lg);
        --control-select-menu-height: 48px;
        --control-select-menu-padding: 6px 10px;
        --mdc-icon-size: 20px;
        --ha-ripple-color: var(--secondary-text-color);
        font-size: var(--ha-font-size-m);
        line-height: 1.4;
        width: auto;
        color: var(--primary-text-color);
        -webkit-tap-highlight-color: transparent;
      }
      .select-anchor {
        border: none;
        text-align: left;
        height: var(--control-select-menu-height);
        padding: var(--control-select-menu-padding);
        overflow: hidden;
        position: relative;
        cursor: pointer;
        display: flex;
        flex-direction: row;
        align-items: center;
        border-radius: var(--control-select-menu-border-radius);
        box-sizing: border-box;
        outline: none;
        overflow: hidden;
        background: none;
        /* For safari border-radius overflow */
        z-index: 0;
        transition:
          box-shadow 180ms ease-in-out,
          color 180ms ease-in-out;
        gap: 10px;
        width: 100%;
        user-select: none;
        font-style: normal;
        font-weight: var(--ha-font-weight-normal);
        letter-spacing: 0.25px;
      }
      .select-anchor:hover {
        --control-select-menu-background-color: var(
          --ha-color-on-neutral-quiet
        );
      }

      .content {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        justify-content: center;
        flex: 1;
        overflow: hidden;
      }

      .content p {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        min-width: 0;
        width: 100%;
        margin: auto;
      }

      .label {
        font-size: var(--ha-font-size-s);
        letter-spacing: 0.4px;
      }
      .select-no-value .label {
        font-size: inherit;
        line-height: inherit;
        letter-spacing: inherit;
      }

      .content .value {
        font-size: var(--ha-font-size-m);
      }

      .select-anchor:focus-visible {
        box-shadow: 0 0 0 2px var(--control-select-menu-focus-color);
      }

      .select-anchor::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: 100%;
        background-color: var(--control-select-menu-background-color);
        transition:
          background-color 180ms ease-in-out,
          opacity 180ms ease-in-out;
        opacity: var(--control-select-menu-background-opacity);
      }

      .select-disabled.select-anchor {
        cursor: not-allowed;
        color: var(--disabled-color);
      }
      ha-dropdown-item.selected {
        font-weight: var(--ha-font-weight-medium);
        color: var(--primary-color);
        background-color: var(--ha-color-fill-primary-quiet-resting);
        --icon-primary-color: var(--primary-color);
      }
      ha-dropdown-item.selected:hover {
        background-color: var(--ha-color-fill-primary-quiet-hover);
      }

      ha-dropdown::part(menu) {
        min-width: var(--control-select-menu-width);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-control-select-menu": HaControlSelectMenu;
  }
}
