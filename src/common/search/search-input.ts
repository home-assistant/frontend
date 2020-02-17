import { TemplateResult, html } from "lit-html";
import {
  css,
  CSSResult,
  customElement,
  LitElement,
  property,
} from "lit-element";
import { fireEvent } from "../dom/fire_event";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-icon-button/paper-icon-button";
import "../../components/ha-icon";
import { classMap } from "lit-html/directives/class-map";

@customElement("search-input")
class SearchInput extends LitElement {
  @property() public filter?: string;
  @property({ type: Boolean, attribute: "no-label-float" })
  public noLabelFloat? = false;
  @property({ type: Boolean, attribute: "no-underline" })
  public noUnderline = false;

  public focus() {
    this.shadowRoot!.querySelector("paper-input")!.focus();
  }

  protected render(): TemplateResult {
    return html`
      <style>
        .no-underline {
          --paper-input-container-underline: {
            display: none;
            height: 0;
          }
        }
      </style>
      <div class="search-container">
        <paper-input
          class=${classMap({ "no-underline": this.noUnderline })}
          autofocus
          label="Search"
          .value=${this.filter}
          @value-changed=${this._filterInputChanged}
          .noLabelFloat=${this.noLabelFloat}
        >
          <ha-icon icon="hass:magnify" slot="prefix" class="prefix"></ha-icon>
          ${this.filter &&
            html`
              <paper-icon-button
                slot="suffix"
                class="suffix"
                @click=${this._clearSearch}
                icon="hass:close"
                alt="Clear"
                title="Clear"
              ></paper-icon-button>
            `}
        </paper-input>
      </div>
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
      paper-input {
        flex: 1 1 auto;
        margin: 0 16px;
      }
      .search-container {
        display: inline-flex;
        width: 100%;
        align-items: center;
      }
      .prefix {
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
