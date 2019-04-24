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
        <iron-icon icon="hassio:magnify"></iron-icon>

        <paper-input
          no-label-float
          label="Search"
          .value=${this.filter}
          @value-changed=${this._filterInputChanged}
        ></paper-input>
        <iron-icon icon="magnify" slot="prefix"></iron-icon>
        <paper-icon-button slot="suffix" onclick=${
          this._clearSearch
        } icon="clear" alt="Clear" title="Clear">
        </paper-icon-button>
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
      iron-icon {
        display: inline-block;
        margin-right: 16px;
        color: var(--primary-text-color);
      }
      paper-input {
        display: inline-block;
        flex: 1 1 auto;
        margin-right: 16px;
      }
      .search-container {
        display: inline-flex;
        width: calc(100% - 48px);
        padding: 8px 16px;
        align-items: center;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-search-input": HassioSearchInput;
  }
}
