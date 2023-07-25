import { mdiClose, mdiMagnify } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query } from "lit/decorators";
import "./ha-icon-button";
import "./ha-svg-icon";
import "./ha-textfield";
import type { HaTextField } from "./ha-textfield";
import { HomeAssistant } from "../types";
import { fireEvent } from "../common/dom/fire_event";

@customElement("search-input")
class SearchInput extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public filter?: string;

  @property({ type: Boolean })
  public suffix = false;

  @property({ type: Boolean })
  public autofocus = false;

  @property({ type: String })
  public label?: string;

  public focus() {
    this._input?.focus();
  }

  @query("ha-textfield", true) private _input!: HaTextField;

  protected render(): TemplateResult {
    return html`
      <ha-textfield
        .autofocus=${this.autofocus}
        .label=${this.label || this.hass.localize("ui.common.search")}
        .value=${this.filter || ""}
        icon
        .iconTrailing=${this.filter || this.suffix}
        @input=${this._filterInputChanged}
      >
        <slot name="prefix" slot="leadingIcon">
          <ha-svg-icon
            tabindex="-1"
            class="prefix"
            .path=${mdiMagnify}
          ></ha-svg-icon>
        </slot>
        <div class="trailing" slot="trailingIcon">
          ${this.filter &&
          html`
            <ha-icon-button
              @click=${this._clearSearch}
              .label=${this.hass.localize("ui.common.clear")}
              .path=${mdiClose}
              class="clear-button"
            ></ha-icon-button>
          `}
          <slot name="suffix"></slot>
        </div>
      </ha-textfield>
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

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: inline-flex;
      }
      ha-svg-icon,
      ha-icon-button {
        color: var(--primary-text-color);
      }
      ha-svg-icon {
        outline: none;
      }
      .clear-button {
        --mdc-icon-size: 20px;
      }
      ha-textfield {
        display: inherit;
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
    "search-input": SearchInput;
  }
}
