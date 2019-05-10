import { TemplateResult, html } from "lit-html";
import {
  css,
  CSSResult,
  customElement,
  LitElement,
  property,
} from "lit-element";
import { fireEvent } from "../../../src/common/dom/fire_event";
import "@polymer/iron-icon/iron-icon";
import "@polymer/paper-input/paper-input";
import "@material/mwc-button";

@customElement("hassio-search-input")
class HassioSearchInput extends LitElement {
  @property() private filter?: string;

  protected render(): TemplateResult | void {
    return html`
      <div class="search-container">
        <paper-input
          label="Search"
          .value=${this.filter}
          @value-changed=${this._filterInputChanged}
        >
          <iron-icon
            icon="hassio:magnify"
            slot="prefix"
            class="prefix"
          ></iron-icon>
          ${this.filter &&
            html`
              <paper-icon-button
                slot="suffix"
                @click=${this._clearSearch}
                icon="hassio:close"
                alt="Clear"
                title="Clear"
              ></paper-icon-button>
            `}
        </paper-input>
      </div>
    `;
  }

  private async _filterChanged(value) {
    fireEvent(this, "filter-changed", { value: String(value) });
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
        margin: 2px 8px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-search-input": HassioSearchInput;
  }
}
