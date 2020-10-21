import "@polymer/paper-input/paper-input";
import {
  css,
  CSSResult,
  customElement,
  LitElement,
  property,
} from "lit-element";
import { html, TemplateResult } from "lit-html";
import { classMap } from "lit-html/directives/class-map";
import "../../components/ha-svg-icon";
import { fireEvent } from "../dom/fire_event";
import { mdiMagnify, mdiClose } from "@mdi/js";
import "@material/mwc-icon-button/mwc-icon-button";

@customElement("search-input")
class SearchInput extends LitElement {
  @property() public filter?: string;

  @property({ type: Boolean, attribute: "no-label-float" })
  public noLabelFloat? = false;

  @property({ type: Boolean, attribute: "no-underline" })
  public noUnderline = false;

  @property({ type: Boolean })
  public autofocus = false;

  @property({ type: String })
  public label?: string;

  public focus() {
    this.shadowRoot!.querySelector("paper-input")!.focus();
  }

  protected render(): TemplateResult {
    return html`
      <style>
        .no-underline:not(.focused) {
          --paper-input-container-underline: {
            display: none;
            height: 0;
          }
        }
      </style>
      <paper-input
        class=${classMap({ "no-underline": this.noUnderline })}
        .autofocus=${this.autofocus}
        .label=${this.label || "Search"}
        .value=${this.filter}
        @value-changed=${this._filterInputChanged}
        .noLabelFloat=${this.noLabelFloat}
      >
        <slot name="prefix" slot="prefix">
          <ha-svg-icon class="prefix" .path=${mdiMagnify}></ha-svg-icon>
        </slot>
        ${this.filter &&
        html`
          <mwc-icon-button
            slot="suffix"
            @click=${this._clearSearch}
            title="Clear"
          >
            <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
          </mwc-icon-button>
        `}
      </paper-input>
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

  static get styles(): CSSResult {
    return css`
      ha-svg-icon,
      mwc-icon-button {
        color: var(--primary-text-color);
      }
      mwc-icon-button {
        --mdc-icon-button-size: 24px;
      }
      ha-svg-icon.prefix {
        margin: 8px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "search-input": SearchInput;
  }
}
