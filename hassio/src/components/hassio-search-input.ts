import "@material/mwc-button";
import "../../../src/components/ha-icon-button";
import "../../../src/components/ha-icon";
import "@polymer/paper-input/paper-input";
import {
  css,
  CSSResult,
  customElement,
  LitElement,
  property,
} from "lit-element";
import { html, TemplateResult } from "lit-html";
import { fireEvent } from "../../../src/common/dom/fire_event";

@customElement("hassio-search-input")
class HassioSearchInput extends LitElement {
  @property() private filter?: string;

  protected render(): TemplateResult {
    return html`
      <div class="search-container">
        <paper-input
          label="Search"
          .value=${this.filter}
          @value-changed=${this._filterInputChanged}
        >
          <ha-icon icon="hassio:magnify" slot="prefix" class="prefix"></ha-icon>
          ${this.filter &&
          html`
            <ha-icon-button
              slot="suffix"
              class="suffix"
              @click=${this._clearSearch}
              icon="hassio:close"
              alt="Clear"
              title="Clear"
            ></ha-icon-button>
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
      ha-icon {
        color: var(--primary-text-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-search-input": HassioSearchInput;
  }
}
