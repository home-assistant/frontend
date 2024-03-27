import "@material/web/textfield/outlined-text-field";
import type { MdOutlinedTextField } from "@material/web/textfield/outlined-text-field";
import { mdiMagnify } from "@mdi/js";
import { CSSResultGroup, LitElement, TemplateResult, css, html } from "lit";
import { customElement, property, query } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { HomeAssistant } from "../types";
import "./ha-icon-button";
import "./ha-svg-icon";

@customElement("search-input-outlined")
class SearchInputOutlined extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public filter?: string;

  @property({ type: Boolean })
  public suffix = false;

  @property({ type: Boolean })
  public autofocus = false;

  @property({ type: String })
  public label?: string;

  @property({ type: String })
  public placeholder?: string;

  public focus() {
    this._input?.focus();
  }

  @query("md-outlined-text-field", true) private _input!: MdOutlinedTextField;

  protected render(): TemplateResult {
    return html`
      <md-outlined-text-field
        .autofocus=${this.autofocus}
        .aria-label=${this.label || this.hass.localize("ui.common.search")}
        .placeholder=${this.placeholder ||
        this.hass.localize("ui.common.search")}
        .value=${this.filter || ""}
        icon
        .iconTrailing=${this.filter || this.suffix}
        @input=${this._filterInputChanged}
      >
        <slot name="prefix" slot="leading-icon">
          <ha-svg-icon
            tabindex="-1"
            class="prefix"
            .path=${mdiMagnify}
          ></ha-svg-icon>
        </slot>
      </md-outlined-text-field>
    `;
  }

  private async _filterChanged(value: string) {
    fireEvent(this, "value-changed", { value: String(value) });
  }

  private async _filterInputChanged(e) {
    this._filterChanged(e.target.value);
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: inline-flex;
      }
      md-outlined-text-field {
        display: block;
        width: 100%;
        --md-outlined-field-top-space: 5.5px;
        --md-outlined-field-bottom-space: 5.5px;
        --md-outlined-field-outline-color: var(--outline-color);
        --md-outlined-field-container-shape-start-start: 10px;
        --md-outlined-field-container-shape-start-end: 10px;
        --md-outlined-field-container-shape-end-end: 10px;
        --md-outlined-field-container-shape-end-start: 10px;
        --md-outlined-field-focus-outline-width: 1px;
        --md-outlined-field-focus-outline-color: var(--primary-color);
      }
      ha-svg-icon,
      ha-icon-button {
        display: flex;
        --mdc-icon-size: var(--md-input-chip-icon-size, 18px);
        color: var(--primary-text-color);
      }
      ha-svg-icon {
        outline: none;
      }
      .clear-button {
        --mdc-icon-size: 20px;
      }
      .trailing {
        display: flex;
        align-items: center;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "search-input-outlined": SearchInputOutlined;
  }
}
