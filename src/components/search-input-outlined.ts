import { mdiClose, mdiMagnify } from "@mdi/js";
import type { TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import type { HomeAssistant } from "../types";
import "./ha-icon-button";
import "./ha-outlined-text-field";
import type { HaOutlinedTextField } from "./ha-outlined-text-field";
import "./ha-svg-icon";

@customElement("search-input-outlined")
class SearchInputOutlined extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public filter?: string;

  @property({ type: Boolean })
  public suffix = false;

  // eslint-disable-next-line lit/no-native-attributes
  @property({ type: Boolean }) public autofocus = false;

  @property({ type: String })
  public label?: string;

  @property({ type: String })
  public placeholder?: string;

  public focus() {
    this._input?.focus();
  }

  @query("ha-outlined-text-field", true) private _input!: HaOutlinedTextField;

  protected render(): TemplateResult {
    const placeholder =
      this.placeholder || this.hass.localize("ui.common.search");

    return html`
      <ha-outlined-text-field
        .autofocus=${this.autofocus}
        .aria-label=${this.label || this.hass.localize("ui.common.search")}
        .placeholder=${placeholder}
        .value=${this.filter || ""}
        icon
        .iconTrailing=${this.filter || this.suffix}
        @input=${this._filterInputChanged}
        dense
      >
        <slot name="prefix" slot="leading-icon">
          <ha-svg-icon
            tabindex="-1"
            class="prefix"
            .path=${mdiMagnify}
          ></ha-svg-icon>
        </slot>
        ${this.filter
          ? html`<ha-icon-button
              aria-label="Clear input"
              slot="trailing-icon"
              @click=${this._clearSearch}
              .path=${mdiClose}
            >
            </ha-icon-button>`
          : nothing}
      </ha-outlined-text-field>
    `;
  }

  private async _filterChanged(value: string) {
    fireEvent(this, "value-changed", { value: String(value) });
  }

  private async _filterInputChanged(e) {
    this._filterChanged(e.target.value);
  }

  private async _clearSearch() {
    this._filterChanged("");
  }

  static styles = css`
    :host {
      display: inline-flex;
      /* For iOS */
      z-index: 0;
    }
    ha-outlined-text-field {
      display: block;
      width: 100%;
      --ha-outlined-field-container-color: var(--card-background-color);
    }
    ha-svg-icon,
    ha-icon-button {
      --mdc-icon-button-size: 24px;
      height: var(--mdc-icon-button-size);
      display: flex;
      color: var(--primary-text-color);
    }
    ha-svg-icon {
      outline: none;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "search-input-outlined": SearchInputOutlined;
  }
}
